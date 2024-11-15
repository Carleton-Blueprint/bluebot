import fs from 'fs/promises';
import fg from 'fast-glob';

import { ACTIVATION_LABEL_ID, MAX_STAGE, MD_DIR, METADATA_REGEX, PROJECT_URL } from '../constants';
import { Logger, IssuesContext, IssueMetadata, Issue } from './types';
import _ from 'lodash';

/* ------------------ */

export const generateMetadata = (metadata: IssueMetadata | Record<string, string>) => {
  const payload = `
## Metadata
\`\`\`json
${JSON.stringify(metadata, null, 2)}
\`\`\`
`;
  return payload;
};

export const getDirs = async (targetDir?: string) => {
  /* returns: {0 : '0-initialization', 1: '1-outreach'} */
  const dirToUse = targetDir ?? MD_DIR;
  const dirs = {} as { [key: number]: string };

  const files = await fs.readdir(dirToUse, { withFileTypes: true });
  files
    .filter(file => file.isDirectory()) // Filter out only directories
    .forEach(dir => {
      const nameNum = dir.name.split('-')[0]; // take only the number part of the directory name (e.g., 1-outreach -> 1)
      const castedNameNum = Number(nameNum);
      const validFormat = !isNaN(castedNameNum) && nameNum.trim() !== '';
      if (!validFormat) return;
      dirs[castedNameNum] = dir.name;
    });

  return dirs;
};

export const getProjectUrl = (milestoneTitle: string) => {
  return PROJECT_URL + `&sliceBy%5Bvalue%5D=${encodeURIComponent(milestoneTitle)}`;
};

export const isLabelCorrect = (context: IssuesContext, logger: Logger) => {
  const receivedIssue = context.payload.issue;
  const isLabelCorrect = receivedIssue.labels?.some(label => label.id === ACTIVATION_LABEL_ID) ?? false;

  logger.info(
    `Checking issue label of '${receivedIssue.title}'... ${
      isLabelCorrect ? '✅ LABEL MATCHES' : '❌ LABEL DOES NOT MATCH'
    }`,
  );

  return isLabelCorrect;
};

export const extractMetadata = (issue: Issue) => {
  const body = issue.body;

  if (!body) {
    // logger.error('extractMetadata: Issue body is null.');
    return null;
  }

  const metadataMatch = body.match(METADATA_REGEX);
  if (!metadataMatch) {
    // logger.error('extractMetadata: Metadata not found.');
    return null;
  }

  const metadata = JSON.parse(metadataMatch[1]) as IssueMetadata;
  return metadata;
};

export const refetchIssue = async (context: IssuesContext) => {
  const owner = context.payload.repository.owner.login;
  const repo = context.payload.repository.name;
  const issue_number = context.payload.issue.number;

  const issueResponse = await context.octokit.issues.get({
    owner,
    repo,
    issue_number,
  });
  return issueResponse.data;
};

export const getContextProps = async (context: IssuesContext) => {
  const owner = context.payload.repository.owner.login;
  const repo = context.payload.repository.name;
  const issue = await refetchIssue(context);

  return { owner, repo, issue };
};

/* ------------------ */

export const appendInitialMetadata = async (context: IssuesContext, logger: Logger) => {
  // add metadata to the original issue

  const owner = context.payload.repository.owner.login;
  const repo = context.payload.repository.name;
  const body = context.payload.issue.body;

  const fields = body?.split('\n\n');
  let client = '',
    author = '',
    clientTag = '';

  // parse payload from newly created issue (GitHub issue yaml form)
  if (fields) {
    client = fields[1];
    author = fields[3];
    clientTag = fields[5];
  }

  const metadata = { client, clientTag, author, stage: 0 };

  const issueResponse = await context.octokit.issues.update({
    owner,
    repo,
    issue_number: context.payload.issue.number,
    body:
      context.payload.issue.body + generateMetadata(metadata) + `\n---\n**🚨 Close this issue to begin the project!**`,
  });
  const issue = issueResponse.data;
  logger.info('Appended initial metadata to issue.');

  return issue;
};

export const createMilestone = async (context: IssuesContext, logger: Logger) => {
  const { issue, owner, repo } = await getContextProps(context);
  const metadata = extractMetadata(issue);

  if (!metadata) {
    logger.error('createMilestone: Metadata not found.');
    return;
  }

  const milestoneResponse = await context.octokit.issues.createMilestone({
    owner,
    repo,
    title: `📍 [project] ${metadata.client}`,
  });
  const milestone = milestoneResponse.data;
  logger.info(`Created milestone: ${milestone.title}`);

  // add milestone to the original issue
  await context.octokit.issues.update({
    owner,
    repo,
    issue_number: context.payload.issue.number,
    milestone: milestone.number,
  });

  return { milestone };
};

export const createNextIssue = async (context: IssuesContext, logger: Logger) => {
  const { owner, repo, issue } = await getContextProps(context);
  const metadata = extractMetadata(issue);

  if (!metadata) {
    logger.error('createNextIssue: Metadata not found.');
    return;
  }

  const stage = metadata.stage + 1;
  const filePaths = await fg(`${MD_DIR}/${stage}-*/body.md`);

  if (filePaths.length === 0) {
    logger.error(`createNextIssue: No markdown file found for stage ${stage}.`);
    return;
  }

  if (filePaths.length > 1) {
    logger.warn(`createNextIssue: Multiple directories found for stage ${stage}! Arbitarily choosing one...`);
  }

  const rawTemplate = await fs.readFile(filePaths[0], 'utf8');
  const template = _.template(rawTemplate);

  if (!issue.milestone) {
    logger.error('createNextIssue: Milestone is not set.');
    return;
  }

  const { client, author, clientTag } = metadata;
  const data = { client, author, clientTag };

  // add comment to original issue to highlight next steps
  const nextIssueResponse = await context.octokit.issues.create({
    owner,
    repo,
    title: `[project] ${clientTag}: Stage ${stage}/${MAX_STAGE} - REPLACE WITH LABEL`,
    body: template(data) + generateMetadata({ client, author, clientTag, stage }),
    milestone: issue.milestone.number,
  });

  const nextIssue = nextIssueResponse.data;
  logger.info(`Created issue: ${nextIssue.title}`);

  return nextIssue;
};

// NEXT: Standardized data availability in template (including milestone, everything in metadata, and rest that might be useful)

// export const createNextIssue = async ({
//   context,
//   prevStage,
//   logger,
//   owner,
//   repo,
//   author,
//   client,
//   clientTag,
//   milestone,
// }: {
//   context: IssuesContext;
//   prevStage: number;
//   logger: Logger;
//   owner: string;
//   repo: string;
//   author: string;
//   client: string;
//   clientTag: string;
//   milestone: Milestone;
// }) => {
//   if (!milestone) {
//     logger.error('createNextIssueActor: Milestone is not set.');
//     return;
//   }

//   // construct body for the next issue
//   const dirs = await getDirs();
//   const dirName = dirs[prevStage + 1];
//   if (!dirName) {
//     logger.error(`createNextIssueActor: No markdown file found for next stage.`);
//     return;
//   }
//   const rawTemplate = await fs.readFile(`./src/stages/${dirName}/body.md`, 'utf8');
//   if (!rawTemplate) {
//     logger.error(`createNextIssueActor: No markdown file found for next stage.`);
//     return;
//   }
//   const template = _.template(rawTemplate);
//   const data = { client, author, clientTag };

//   // parse config (if exists)
//   const configFile = await fs.readFile(`./src/stages/${dirName}/config.json`, 'utf8');
//   let label = '';
//   if (configFile) {
//     const config = JSON.parse(configFile);
//     if (config && config.label) {
//       label = config.label;
//     }
//   }

//   // create next issue with milestone (using Workflows, this issue is automatically added to the project - https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/adding-items-automatically)
//   const nextIssueResponse = await context.octokit.issues.create({
//     owner,
//     repo,
//     title: `[project] ${clientTag}: Stage ${prevStage + 1}/${MAX_STAGE} - ${label}`,
//     body: template(data) + generateMetadata({ client, author, clientTag }),
//     milestone: milestone.number,
//   });
//   const nextIssue = nextIssueResponse.data;
//   logger.info(`Created issue: ${nextIssue.title}`);

//   return { nextIssue };
// };
