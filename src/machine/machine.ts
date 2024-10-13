import { setup, assign } from 'xstate';
import { Logger } from 'winston';

import { ACTIVATION_LABEL_ID } from '../constants';
import { IssuesContext, MachineContext, MachineEvent } from './types';
import { commentSummaryActor, createMilestoneActor, createNextIssueActor, parseGeneralInfoActor } from './actors';

const machineSetup = setup({
  types: {
    context: {} as MachineContext,
    events: {} as MachineEvent,
    input: {} as { probotContext: IssuesContext; logger: Logger },
  },
  actions: {
    concludeAction: (_, params: { logger: Logger }) => params.logger.info('Project setup completed.'),
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
        }`,
      );
      return isLabelCorrect;
    },
  },
  actors: {
    parseGeneralInfoActor,
    createMilestoneActor,
    createNextIssueActor,
    commentSummaryActor,
  },
});

const machineWithImpl = machineSetup.createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAOgCUx0IBPAYgDkwB3AAgAUAnAewCsxMALgG0ADAF1EoAA5dYuAbi75JIAB6IATAGYAbCQDsATgCMO-ca36ArPp0iAHPoA0IaolN6NGnTat2tGgAsgcYAvqEuaFh4hKQAkvjyuOgANrgAXugKSiQAwtj8ANYscbCwAK5gLAAy6ABGYCm0ohJIIDJy2cpt6gga+hok9lojgSJWhvb2wVZaLm4IfvokGoaBq4GGJvY6OvbhkRg4BMQkCUmpGVmK+HkFmMWlFVW1DU1Cxq3SsklKKr3aYxWEhrWaGbyBHSQ3bzRD6ESGEHBERaYbmHTGQw6A4gKLHWJnRIKS6ZLokNjoDiwKpPSolfAAMy4HAwXVoECUYBIBAAblxCly8TFTudiWlSTdyZTqSUynSEkyWdclAheVxMMr8C0WioOr9uqBevp1iQfMYRBYRIFLJD7LDFtahloRNYLZt1pMcUKTvEiclxZq8hxKAIqgBZXApOACTnsznc-B8gUkb0E0X+q5k3LBrLhyPRzmqxPqzXa8S6n5df7uDSzEjGcz2ERu+HWuauRBWR3DF1WN1rVb7CK4o7C30XANZnOhliMVQCWXPOOEBNJwWjn2EieZyXZkNVOcL2lgIt8jVdMtfdqVm7VhANiYkK3WjTjaxdqH2rtaJ29-seodDmiTd0xJQNci4VBUDAfAFwAZXKKDKToDkVzVZNUxFP0wKzSDoNglgEKQjhqFPEsL3EHU2j1Ksek0LQgSRMEIShXYdC-XYSCsKwNGMbQzARBiwhxfAuAgOAVEwogK06W86IQABaQx7QUvRm2bXj+NsexzWxYcpPISgaBk-U73We1jHsRFzUMVF7CseyRH6YSgPxLDtwlP5qJvLzDUQLRlI7BBAi7EhAh0+xayBG0GK9Dc02wydd3uR45ReepGhM2i-IQRwv3MU0gjsHQsXNHYtDi4CEo8wMKSpGk0vpRVWTk75ZN8tREECAYQR0LQrGMSzXUMcwvxCIYrXMbiBgCa1Krc8cxR3HI91zFgIyjWAY0ILLWs6hBJkRXZtnMAJDG49igq7YwJu6oEbG0IIKv0+L3KWzzblWmdD0XSpdo63pjHdJ9xkxPxtAGqYxpups7umx65peqq3ozD68jwmD4MQjASP+g19tfC0wqBwbpnCix+mh26poe2aNHmscSAAUXwCA8bvWseqbfR+uukJwUCL8-CfWsdC8PYfH6QIGc3JmOG4DgWbZ7z2vx3pzKCnSSACVYtBCiZViCIdwiAA */
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
            onDone: {
              actions: assign(({ event }) => ({ ...event.output })),
              target: 'Create Next Issue',
            },
            // onError: { target: '#errorEnd' },
          },
        },
        'Create Next Issue': {
          invoke: {
            src: 'createNextIssueActor',
            input: ({ context }) => ({ context }),
            onDone: {
              actions: assign(({ event }) => ({ ...event.output })),
              target: 'Comment Summary',
            },
            // onError: { target: '#errorEnd' },
          },
        },
        'Comment Summary': {
          invoke: {
            src: 'commentSummaryActor',
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
      entry: { type: 'concludeAction', params: ({ context }) => ({ logger: context.logger }) },
    },
    ErrorEnd: {
      id: 'errorEnd',
      type: 'final',
      entry: {
        type: 'errorAction',
        params: ({ context }) => ({ logger: context.logger }),
      },
    },
  },
});

const machine = machineWithImpl.provide({});

export default machine;
