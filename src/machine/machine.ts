import _ from 'lodash';
import { setup, assign } from 'xstate';
import { Logger } from 'winston';

import { ACTIVATION_LABEL_ID } from '../constants';
import { IssuesContext, MachineContext, MachineEvent } from './types';
import { createMilestoneActor, createNextIssueActor, parseGeneralInfoActor } from './actors';

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
    parseGeneralInfoActor,
    createMilestoneActor,
    createNextIssueActor,
  },
});

const machineWithImpl = machineSetup.createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAOgCUx0IBPAYgDkwB3AAgAUAnAewCsxMALgG0ADAF1EoAA5dYuAbi75JIAB6IATAGYAbCQDsATgCMOgKxnjIjQA59prQBoQ1RKb0aNOgCw791n30bLQBfEOc0LDxCUgBJfHlcdAAbXAAvdAUlEgBhbH4AaxZY2FgAVzAWABl0ACMwZNpRCSQQGTks5Vb1BA19DRJgrWHh2y1DCzNnVwQzPxINQ28NY36dLRERbxswiIwcAmISeMSU9MzFfFz8zCKS8sqa+sahYxbpWUSlFR7VpZItstrGZ9DoNGYnC5EP5DCQluMdCIJvpvCJQbsQJEDjFjgkFGcMp0SGx0BxYJV7hVivgAGZcDgYTq0CBKMAkAgANy4BTZWOiRxO+NShMuxNJ5OKpSp8TpDIuSgQnK4mHl+GazRU7S+XVAPRRA3MVm03i0NmMxhsUyhsxNgw25m82zsIlWGL5hzieKSwtVuQ4lAElQAsrhknABKzmaz2fguTySO6cYLveciTl-Zlg6Hw6zFbHlar1eJNZ9Oj83OCtCRVn8zCIEWDjNNEGZbcERDolr5vPotGZDG79vzPacfWmM4GWIxVAJJQ8o4QY3HeUOPbjR6nRemA5Vp7PKWA81yVZ0i+82qXLuWEH9vADHRpgaDK83Zjo9BZH74zeb9BCwuEID4FwEBwCoibECWHRXt0iAALSGK+cF6JsqFoeh+iDlEa4UFQMwfNB3ywQgyyvhasJWIYiwbDYhimpYGhYdiApegSqpQdq17jK+3itiQ2ymIYQl1hoyw7IBEEjkKm7ZHkhRzlSTwNBxZbEXYr4gsYJBgrxxieCidEmExw7rtJIrZCSZIUlKFK0vSjIwQRnHET2AyGOsrbaIYIiWBYOgad4Wk2FsOgWiIwQosY3jGWuyZseOO4sCGYawBGhAqY5aiIIYtHaZ2j5UZR5gaAFQUhaFxhaNsn4xUmrFjluE67mAM4KWAGVEbqbjeP8myWFVRjbH+iHWq2ZW+BVVWWmYjESauOIAKL4BAHU6llvT1nogWoqJtjbToNgaXMALgiCfg2BdrbRXN2GLRw3AcEtK2tFqqldSRJXWmaJBaJ43lmEMYW6ABIRAA */
  context: ({ input }) => ({
    probotContext: input.probotContext,
    logger: input.logger,
    owner: '',
    repo: '',
    client: '',
    author: '',
    clientTag: '',
    prevStage: 0,
  }),
  initial: 'Ready',
  states: {
    Ready: {
      on: {
        'New Project': {
          actions: assign({
            probotContext: ({ event }) => event.probotContext,
            prevStage: 0,
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
