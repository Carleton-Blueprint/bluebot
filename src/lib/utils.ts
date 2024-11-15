import fs from 'fs/promises';
// import fg from 'fast-glob';

import { ACTIVATION_LABEL_ID, MD_DIR, METADATA_REGEX, PROJECT_URL } from '../constants';
import { Logger, IssuesContext, IssueMetadata, Issue } from './types';

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
