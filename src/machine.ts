import { Context } from 'probot';
import fs from 'fs';
import _ from 'lodash';
import { setup, fromPromise, assign } from 'xstate';
import { Logger } from 'winston';
import { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods';

import { ACTIVATION_LABEL_ID } from './constants';

type IssuesContext = Context<'issues'>;
type Milestone = RestEndpointMethodTypes['issues']['createMilestone']['response']['data'];
type MachineContext = {
  logger: Logger;
  probotContext: IssuesContext;
  owner: string;
  repo: string;
  client: string;
  author: string;
  clientTag: string;
  milestone?: Milestone;
};
type MachineEvent =
  | { type: 'New Project'; probotContext: IssuesContext }
  | { type: 'Milestone Created'; milestone: Milestone }; // not used: deleteme (left here for reference example )

const machineSetup = setup({
  types: {
    context: {} as MachineContext,
    events: {} as MachineEvent,
    input: {} as { probotContext: IssuesContext; logger: Logger },
  },
  actions: {
    concludeAction: (_, params: { context: MachineContext }) => params.context.logger.info('Project setup completed.'),
    errorAction: (_, params: { logger: Logger }) => params.logger.error('An error occurred.'),
  },
  guards: {
    issueLabelGuard: ({ context }) => {
      const { logger, probotContext } = context;

      const receivedIssue = probotContext.payload.issue;
      const isLabelCorrect = receivedIssue.labels?.some(label => label.id === ACTIVATION_LABEL_ID) ?? false;
      logger.info(
        `Checking issue label of '${probotContext.payload.issue.title}'... ${
          isLabelCorrect ? '✅ LABEL MATCHES' : '❌ LABEL DOES NOT MATCH'
        }`
      );
      return isLabelCorrect;
    },
  },
  actors: {
    parseGeneralInfoActor: fromPromise(async ({ input: { context } }: { input: { context: MachineContext } }) => {
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
    }),
    createMilestoneActor: fromPromise(async ({ input: { context } }: { input: { context: MachineContext } }) => {
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
    }),
    createNextIssueActor: fromPromise(async ({ input: { context } }: { input: { context: MachineContext } }) => {
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
    }),
  },
});

const machineWithImpl = machineSetup.createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAOgCUx0IBPAYgDkwB3AAgAUAnAewCsxMALgG0ADAF1EoAA5dYuAbi75JIAB6IAjADYAzCQCcAdn0aALAA4tG8xp3WdAGhDVEFgKwk3I92YBMhrTctUx0AX1CnNCw8QlIASXx5XHQAG1wAL3QFJRIAYWx+AGsWONhYAFcwFgAZdAAjMBTaUQkkEBk5bOU29QQNbV8SEQ1ffR03fTdDS0NHZ00vEmC3c18bCd8QsfDIjBwCYhIEpNSMrMV8PILMYtKKqtqGpqENVulZJKUVXrMRQbM7GMViI3Dp9E4XH1+npzKZ9OYdOZYd5LPodiAovtYkdEgpTpkuiQ2OgOLAqndKiV8AAzLgcDBdZriFQdT7dUC9LQiEQkVbmETmNwArSrNwQxBaYIkDQrUzGYLWEXmdGYmKHY54tIEi55DiUARVACyuBScAESjAtAgFpIBAAblxCmASKqDvFcckteccrk9VkjSazRaEPauJhvfgWi0WR8ut9NKY-tKQhogfzQeD5n1uXpvFzTCNDH9xr4VXs1e6Tl7Cb79QHTbBzYRaGAONwOCQpCksrT6S7y26cVWzjW-QaWMaG02wCH8A7w10o8y2qy4z0E0mAanxumweKEJMtCRNrY4SYBb5gmXooONZ6RzrclxUKgwPgBCwAPJ21t23DMFh0HwCAWFrf0WEYVQPwpZ0wPHSDoLKSpdX1AgoBKJDLWtQhbTnR1nVdbE73xCM8mfV93y-H8OD-ACgJAuCqgQjD7hQ8DmJgtiFHwdCYNnecIyXN52ljC54wQSV9GlEQxg0aYTD5DR9x0AJeRWfQtEMAI3F8C9wgiEB8C4CA4BUQjiBjToxPXBAAFotH3WzNmvLFDgoKhIXeKyvhs0xfH3dwlklOxRkFbkpjCAzzMrTUHx8ry2XEy8eREIs1hLSwdF8IJ910EgstGX55V8VNDBcish1i7UfWuW5MJqepGksxKbJ0UxTCGNKER0zLsocrMZQ6owrBK7ltPMaZytvD0SMJYlSXJeqEl7BlrIStcOUQHQtCk1K-m6tZdD63KwRIAt+hEOwuVTQUpqImbq0fMd6yDQhmo2tQtp2zr9oyo6cqzfRTA8QwNBBOULFGCw7vVB64suJ8XzfD9v1-f9WHo0DnogsAoJYyp3rWz6EB0AUfvSnr-v6yE5MMM7AiLWxgXatwYZi+9qoR8jkaotG6OArG6xxvHOMY4XEPuQn4uJ8Yjz2inDqygHIUvDrpksYGi0lYJlSigd7uHTmyKRyjUZo9HAIFsWOMwrimNxiXkLgtD8bAKX2WJxMOvlg7euVradOlfoJnCnqvEi3YbwNqrSMRiiUeo2iMat7GbdY62Hddo56sYiB3fEkwNDO4wZLcFZtO8ZTDA6-w7BBGSJpGCOMX1w4AFFgPzmytP3X4Oq8fRB+sEEdsMUt9KAA */
  context: ({ input }) => ({
    probotContext: input.probotContext,
    logger: input.logger,
    owner: '',
    repo: '',
    client: '',
    author: '',
    clientTag: '',
  }),
  initial: 'Ready',
  states: {
    Ready: {
      on: {
        'New Project': {
          actions: assign({
            probotContext: ({ event }) => event.probotContext,
          }),
          target: 'Initialization',
        },
      },
    },
    Initialization: {
      initial: 'Check Issue Label',
      states: {
        'Check Issue Label': {
          always: [
            {
              guard: 'issueLabelGuard',
              target: 'Parse Issue Information',
            },
            { target: '#end' },
          ],
        },
        'Parse Issue Information': {
          invoke: {
            src: 'parseGeneralInfoActor',
            input: ({ context }) => ({ context }),
            onDone: {
              actions: assign(({ event }) => ({ ...event.output })), // update context based on output returned by parseGeneralInfoActor
              target: 'Create Milestone',
            },
          },
        },
        'Create Milestone': {
          invoke: {
            src: 'createMilestoneActor',
            input: ({ context }) => ({ context }),
            onDone: { actions: assign(({ event }) => ({ ...event.output })), target: 'Create Next Issue' },
            // onError: { target: '#errorEnd' },
          },
        },
        'Create Next Issue': {
          invoke: {
            src: 'createNextIssueActor',
            input: ({ context }) => ({ context }),
            onDone: { target: '#end' },
            // onError: { target: '#errorEnd' },
          },
        },
      },
    },
    End: {
      id: 'end',
      type: 'final',
      entry: { type: 'concludeAction', params: ({ context }) => ({ context }) },
    },
    ErrorEnd: {
      id: 'errorEnd',
      type: 'final',
      entry: { type: 'errorAction', params: ({ context }) => ({ logger: context.logger }) },
    },
  },
});

const machine = machineWithImpl.provide({});

export default machine;
