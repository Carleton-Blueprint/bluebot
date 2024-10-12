import { Context } from 'probot';
import { setup, fromPromise, assign } from 'xstate';
import { Logger } from 'winston';

import { ACTIVATION_LABEL_ID } from './constants';

type IssuesContext = Context<'issues'>;

const machineSetup = setup({
  types: {
    context: {} as { logger: Logger; owner: string; repo: string; client: string; author: string; clientTag: string },
    events: {} as { type: 'New Project'; probotContext: IssuesContext },
    input: {} as { logger: Logger },
  },
  actions: {
    parseGeneralInfo: (_, params: { logger: Logger; probotContext: IssuesContext }) => {
      const { logger, probotContext } = params;

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

      assign({ owner, repo, client, author, clientTag });
    },
    concludeAction: () => console.log('Exited.'),
  },
  guards: {
    issueLabelGuard: ({ context, event }) => {
      context.logger.info('Checking issue label...');

      const receivedIssue = event.probotContext.payload.issue;
      const isLabelCorrect = receivedIssue.labels?.some(label => label.id === ACTIVATION_LABEL_ID) ?? false;

      return isLabelCorrect;
    },
  },
  actors: {
    createMilestoneActor: fromPromise(
      async ({
        input: { logger, client, probotContext },
      }: {
        input: { logger: Logger; client: string; probotContext: IssuesContext };
      }) => {
        // create milestone for the project
        const milestone = await probotContext.octokit.issues.createMilestone({
          owner: probotContext.payload.repository.owner.login,
          repo: probotContext.payload.repository.name,
          title: `📍 [project] ${client}`,
        });
        logger.info(`Created milestone: ${milestone.data.title}`);
      }
    ),
  },
});

const machineWithImpl = machineSetup.createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAOgCUx0IBPAYgDkwB3AAgAUAnAewCsxMALgG0ADAF1EoAA5dYuAbi75JIAB6IAjADYAzCQCcAdn0aArKaNaATFpFWANCGqadewzv2mtADhHfDuhoaACwAvqGOaFh4hKQAkvjyuOgANrgAXugKSiQAwtj8ANYscbCwAK5gLAAy6ABGYCm0ohJIIDJy2cpt6gimVvoGIjpa5u7+VsFajs4IGgEkGjqmwcPBpiIiwTphESBROATEJAlJqRlZivh5BZjFpRVVtQ1NQhqt0rJJSiq9SyskHxWGxA4L6EymGaIHQabwkQzeUwaKz+OyjSbhSIYQ6xE6JBTnTJdEhsdAcWBVB6VEr4ABmXA4GC6zXEKg6326oF6+i0GnhJl0hk2W0Mkyhc0MphIHh0VhEPJ2Iy0hl2WOiR3i+OSaSJVzyHEoAiqAFlcCk4AIlGBaBArSQCAA3LiFMAkA4xY6nAk6y45XIGrIms0Wq0IR1cTC+-AtFpsr5dX4uAFAkHeSbgszi2GDWxGbzBQywrxGTH7bEezVnH3E-2GoPm2CWwi0MAcbgcEhSFJZemMt3ljV4qsXGsBo0sU0NptgMP4J2Rrox1ltdkJnpJ4KAtOp9MQrPBKwkXwbcFWdwbEKGcJ7fBcCBwFTujVxzpXRMIAC00yciA-Vj04KAUBwE6KWT64hQVCzJ8r4-OuCAHlmrhDBowzylowTZlYYEDriXraiOb4rvGRFcogAxaCQIhCgMhaiqKDg-ggujSsCEKGEKJhGKBezgZ6WqElGNxFCUZTUs8jQvhy747Ju1F2EY8xnsCWa+CQUzFt4rj6Js-imDh6p4QJ1Z6qS5KUmJlJ0gyTKke0JFwWRCDuCIVGuL48wHloyqQkxZiuRhphpoWWwDLCBk4vxw66n6Y71iGhBSWuTmoV4izGKM3n6OsyKMbM-mAuswWoQeJjeBFFYkAAovgEBJXZvQceKuYGOsZ4BPKSLXqEQA */
  context: ({ input }) => ({ logger: input.logger, owner: '', repo: '', client: '', author: '', clientTag: '' }),
  initial: 'Ready',
  states: {
    Ready: {
      // entry: { type: 'someAction' },
      on: {
        'New Project': {
          target: 'Initialization',
          // actions: { type: 'someAction' },
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
          // invoke: {
          //   src: 'checkIssueLabelActor',
          //   input: ({ context, event }) => ({ logger: context.logger, probotContext: event.probotContext }),
          //   onDone: {
          //     target: 'IssueLabelDecision',
          //   },
          // },
        },
        'Parse Issue Information': {
          entry: [
            {
              type: 'parseGeneralInfo',
              params: ({ context, event }) => ({ logger: context.logger, probotContext: event.probotContext }),
            },
          ],
          always: { target: 'Create Milestone' },
        },
        'Create Milestone': {
          invoke: {
            src: 'createMilestoneActor',
            input: ({ context, event }) => ({
              logger: context.logger,
              client: context.client,
              probotContext: event.probotContext,
            }),
            onDone: { target: '#end' },
            onError: { target: '#end' },
          },
        },
      },
    },
    End: {
      id: 'end',
      type: 'final',
      entry: { type: 'concludeAction' },
    },
  },
});

const machine = machineWithImpl.provide({});

export default machine;
