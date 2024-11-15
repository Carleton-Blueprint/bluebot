import { IssuesContext, Logger } from './types';
import { extractMetadata, generateMetadata, getContextProps } from './utils';

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
