import { setup, fromPromise, createActor } from 'xstate';
import { WebhookEvent } from '@octokit/webhooks-types';

const machineSetup = setup({
  types: {
    context: {} as { someField: string },
    events: {} as { type: 'New Project'; context: string },
  },
  actions: {
    someAction: () => {
      console.log('hi');
    },
    concludeAction: () => console.log('Exited.'),
  },
  guards: {
    someGuard: () => true,
  },
  actors: {
    someActor: fromPromise(async ({ input }) => {
      console.log(input);
    }),
  },
});

const machineWithImpl = machineSetup.createMachine({
  context: { someField: 'hi' },
  initial: 'Ready',
  states: {
    Ready: {
      // entry: { type: 'someAction' },
      on: {
        'New Project': {
          target: 'Stage 0',
          // actions: { type: 'someAction' },
        },
      },
    },
    'Stage 0': {
      invoke: {
        src: 'someActor',
        input: ({ context, event }) => ({ pe: event }),
      },
    },
    End: {
      type: 'final',
      entry: { type: 'concludeAction' },
    },
  },
});

const machine = machineWithImpl.provide({});

export default machine;

const actor = createActor(machine);
actor.subscribe(snapshot => {
  console.log(snapshot.status);
});
actor.start();
actor.send({ type: 'New Project', context: 'hey' });
