import { fromPromise } from 'xstate';
import fs from 'fs/promises';
import _ from 'lodash';
import { MachineContext } from './types';
import { MAX_STAGE } from '../constants';
import { generateMetadata, getDirs, getProjectUrl } from './utils';

export const parseGeneralInfoActor = fromPromise(
  async ({ input: { context } }: { input: { context: MachineContext } }) => {
    const { logger, probotContext } = context;

    // parse general information
    const owner = probotContext.payload.repository.owner.login;
    const repo = probotContext.payload.repository.name;

    // parse payload from newly created issue (GitHub issue yaml form)
    const fields = probotContext.payload.issue.body?.split('\n\n');
    if (!fields) return;
    const client = fields[1];
    const author = fields[3];
    const clientTag = fields[5];
    logger.debug('fields', fields);

    return { owner, repo, client, author, clientTag };
  },
);

export const createMilestoneActor = fromPromise(
  async ({ input: { context } }: { input: { context: MachineContext } }) => {
    const { probotContext, logger, client, owner, repo } = context;

    // create milestone for the project
    const milestoneResponse = await probotContext.octokit.issues.createMilestone({
      owner,
      repo,
      title: `📍 [project] ${client}`,
    });
    const milestone = milestoneResponse.data;
    logger.info(`Created milestone: ${milestone.title}`);

    return { milestone };
  },
);

export const createNextIssueActor = fromPromise(
  async ({ input: { context } }: { input: { context: MachineContext } }) => {
    const { probotContext, prevStage, logger, owner, repo, author, client, clientTag, milestone } = context;

    if (!milestone) {
      logger.error('createNextIssueActor: Milestone is not set.');
      return;
    }

    // construct body for the next issue
    const dirs = await getDirs();
    const dirName = dirs[prevStage + 1];
    if (!dirName) {
      logger.error(`createNextIssueActor: No markdown file found for next stage.`);
      return;
    }
    const rawTemplate = await fs.readFile(`./src/stages/${dirName}/body.md`, 'utf8');
    if (!rawTemplate) {
      logger.error(`createNextIssueActor: No markdown file found for next stage.`);
      return;
    }
    const template = _.template(rawTemplate);
    const data = { client, author, clientTag };

    // parse config (if exists)
    const configFile = await fs.readFile(`./src/stages/${dirName}/config.json`, 'utf8');
    let label = '';
    if (configFile) {
      const config = JSON.parse(configFile);
      if (config && config.label) {
        label = config.label;
      }
    }

    // create next issue with milestone (using Workflows, this issue is automatically added to the project - https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/adding-items-automatically)
    const nextIssueResponse = await probotContext.octokit.issues.create({
      owner,
      repo,
      title: `[project] ${clientTag}: Stage ${prevStage + 1}/${MAX_STAGE} - ${label}`,
      body: template(data) + generateMetadata({ client, author, clientTag }),
      milestone: milestone.number,
    });
    const nextIssue = nextIssueResponse.data;
    logger.info(`Created issue: ${nextIssue.title}`);

    return { nextIssue };
  },
);

export const commentSummaryActor = fromPromise(
  async ({ input: { context } }: { input: { context: MachineContext } }) => {
    const { probotContext, prevStage, logger, owner, repo, milestone, nextIssue } = context;

    if (!milestone) {
      logger.error('createNextIssueActor: Milestone is not set.');
      return;
    }

    if (!nextIssue) {
      logger.error('createNextIssueActor: Next Issue is not set.');
      return;
    }

    // construct body for the next issue
    const dirs = await getDirs();
    const dirName = dirs[prevStage];
    if (!dirName) {
      logger.error(`createNextIssueActor: No directory found for current stage.`);
      return;
    }
    const rawTemplate = await fs.readFile(`./src/stages/${dirName}/summary.md`, 'utf8');
    if (!rawTemplate) {
      logger.error(`createNextIssueActor: No summary markdown file found for current stage.`);
      return;
    }
    const template = _.template(rawTemplate);
    const data = {
      milestoneUrl: milestone.html_url,
      issueUrl: nextIssue.html_url,
      projectUrl: getProjectUrl(milestone.title),
    };

    // add comment to original issue to highlight next steps
    await probotContext.octokit.issues.createComment({
      owner,
      repo,
      issue_number: probotContext.payload.issue.number,
      body: template(data),
    });
  },
);
