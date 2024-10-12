import { Context } from 'probot';
import { setup, fromPromise, assign } from 'xstate';
import { Logger } from 'winston';

import { ACTIVATION_LABEL_ID } from './constants';

const machineSetup = setup({
  types: {
    context: {} as { logger: Logger },
    events: {} as { type: 'New Project'; probotContext: Context<'issues'> },
    input: {} as { logger: Logger },
  },
  actions: {
    someAction: () => {
      console.log('hi');
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
    someActor: fromPromise(async () => {}),
  },
});

const machineWithImpl = machineSetup.createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAOgCUx0IBPAYgDkwB3AAgAUAnAewCsxMALgG0ADAF1EoAA5dYuAbi75JIAB6IAjADYAzCQCcAdn3bDAVgAcAJgs6tNgDQhqmixYMAWYxsMWN2jy8NAF9Qp3wuCDgVNCw8QiIVGTkFJRV1BABaLScXLK0wkFicAmJyShok2XlFZSQ1RA8rXNd9Eg0RfR1DLQ0PDS6tLTNC4viygEl8GvQAG1wAL3RUuulqlfTEK30tEhFDER0+sx19Iy8dFoR9dxEmnf0zESedK0NDUYwShJIpmfmlisSABhbD8ADWE1gsAArmAADLoABGYFmVRStU2CB0gT2ByOHhOZ0MFyuGgsZhIdksFmGVg8RisVk+cVKpAAovgIOiaml6hkmlc-FSmSYDgMuvomqFQkA */
  context: ({ input }) => ({ logger: input.logger }),
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
      initial: 'CheckIssueLabel',
      states: {
        CheckIssueLabel: {
          always: [
            {
              guard: 'issueLabelGuard',
              target: 'ParseIssueInformation',
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
        ParseIssueInformation: { type: 'final' },
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
