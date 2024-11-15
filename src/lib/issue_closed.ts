import fs from 'fs/promises';
import fg from 'fast-glob';
import _ from 'lodash';

import { Comment, Issue, IssuesContext, Logger } from './types';
import { extractMetadata, generateMetadata, getContextProps, getProjectUrl } from './utils';
import { MAX_STAGE, MD_DIR } from '../constants';

// create the next issue. persist the milestone and metadata from the previous issue, but incrementing "stage"
export const createNextIssue = async (context: IssuesContext, logger: Logger): Promise<Issue | null> => {
  const { owner, repo, issue } = await getContextProps(context);
  const metadata = extractMetadata(issue);

  if (!metadata) {
    logger.error('createNextIssue: Metadata not found.');
    return null;
  }

  const stage = metadata.stage + 1;
  const filePaths = await fg(`${MD_DIR}/${stage}-*/body.md`);

  if (filePaths.length === 0) {
    logger.error(`createNextIssue: No markdown file found for stage ${stage}.`);
    return null;
  }

  if (filePaths.length > 1) {
    logger.warn(`createNextIssue: Multiple directories found for stage ${stage}! Arbitarily choosing one...`);
  }

  const rawTemplate = await fs.readFile(filePaths[0], 'utf8');
  const template = _.template(rawTemplate);

  if (!issue.milestone) {
    logger.error('createNextIssue: Milestone is not set.');
    return null;
  }

  const { client, author, clientTag } = metadata;
  const data = { client, author, clientTag, stage };

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

// add a comment to the original issue with a summary of the project and next steps
export const commentSummary = async (
  context: IssuesContext,
  logger: Logger,
  nextIssue: Issue,
): Promise<Comment | null> => {
  const { owner, repo, issue } = await getContextProps(context);
  const metadata = extractMetadata(issue);
  const milestone = issue.milestone;

  if (!metadata) {
    logger.error('commentSummary: Metadata not found.');
    return null;
  }

  if (!milestone) {
    logger.error('commentSummary: Milestone is not set.');
    return null;
  }

  if (!nextIssue) {
    logger.error('commentSummary: Next Issue is not set.');
    return null;
  }

  const filePaths = await fg(`${MD_DIR}/${metadata.stage}-*/summary.md`);

  if (filePaths.length === 0) {
    logger.error(`commentSummary: No summary markdown file found for milestone ${milestone.title}.`);
    return null;
  }

  if (filePaths.length > 1) {
    logger.warn(
      `commentSummary: Multiple summary markdown files found for milestone ${milestone.title}! Arbitarily choosing one...`,
    );
  }

  const rawTemplate = await fs.readFile(filePaths[0], 'utf8');
  const template = _.template(rawTemplate);
  const data = {
    client: metadata.client,
    clientTag: metadata.clientTag,
    stage: metadata.stage,
    milestoneUrl: milestone.html_url,
    nextIssueUrl: nextIssue.html_url,
    projectUrl: getProjectUrl(milestone.title),
  };

  const commentResponse = await context.octokit.issues.createComment({
    owner,
    repo,
    issue_number: issue.number,
    body: template(data),
  });
  const comment = commentResponse.data;
  logger.info(`Commented on issue: ${issue.title}`);

  return comment;
};
