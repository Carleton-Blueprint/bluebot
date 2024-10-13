import { fromPromise } from 'xstate';
import fs from 'fs';
import _ from 'lodash';
import { MachineContext } from './types';

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
  }
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
  }
);

export const createNextIssueActor = fromPromise(
  async ({ input: { context } }: { input: { context: MachineContext } }) => {
    const { probotContext, logger, owner, repo, author, client, clientTag, milestone } = context;

    if (!milestone) {
      logger.error('createNextIssueActor: Milestone is not set.');
      return;
    }

    // construct body for the Stage 1 issue
    const rawTemplate = fs.readFileSync('./src/stages/1-outreach/0-task.md', 'utf8');
    const template = _.template(rawTemplate);
    const data = { client, author, clientTag };

    // create Stage 1 issue with milestone (using Workflows, this issue is automatically added to the project - https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/adding-items-automatically)
    const issue_stage0 = await probotContext.octokit.issues.create({
      owner,
      repo,
      title: `[project] ${clientTag}: Stage 1 - Outreach`,
      body: template(data),
      milestone: milestone.number,
    });
    logger.info(`Created issue: ${issue_stage0.data.title}`);
  }
);
