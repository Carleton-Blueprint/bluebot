import { setup, fromPromise } from 'xstate';

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
