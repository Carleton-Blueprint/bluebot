import { assign, createMachine, fromPromise, createActor } from 'xstate';
import { retry, handleWhen, ConstantBackoff } from 'cockatiel';

const retryPolicy = retry(
  handleWhen(err => (err as any).type === 'ServiceNotAvailable'),
  {
    maxAttempts: 10,
    backoff: new ConstantBackoff(3000),
  }
);

retryPolicy.onRetry(data => {
  console.log('Retrying...', data);
});

async function delay(ms: number, errorProbability: number): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < errorProbability) {
        reject({ type: 'ServiceNotAvailable' });
      } else {
        resolve();
      }
    }, ms);
  });
}

// https://github.com/serverlessworkflow/specification/blob/main/examples/README.md#New-Patient-Onboarding
export const workflow = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QAcCGAXAlmAdug9jgEb6oBOEmOUAdAJIQA2YAxAHJgDuAChtngFEAbrnQBtAAwBdRCnyxMWQrJAAPRAE4ATADYaAZgAc+nQHYJAFgu6dARlMAaEAE9E+-RZobb2nRdsShhruJgC+oU5oWKKEJOSU1DQA8sSkFCwQhGA0sOgY2VH8BKnxVLQpcRSSMkggyPKKmMq16gi6WrY0plodAKxapoMWvRq9Tq4IIV5a+vYSWhqm-hK2FuGRfDElFGXJ2xA0AMoEZGC80XgZWTRUQvgA1gWbeLFpCeX7Rydnz+gIt-gAMZ8QjVaoqeoKJQ4FStVYSfQ0WxmXqBewDOxacZuWbTUwaKxaXqoqwSXrrOq-V6lRIVN5ffCnc5FFhgMhkRk0ZCMDAAM0ZAFsuVT9rs6fEGUzfv8cHdgdCwdIIQ1obDEO1Ot0+gMhiMxi5EBYNDR-MYNIYLIYloteqYKYUtpV3nsnTQAIKwBRQHAAESBJyuOGyAMewouxSdYs+Hq9vv9jJlcpBOEVNTkUKaMJaiFshl6iMGBPMSx0RJ02LaCJNRbzOlGGmC7ntIsjtOjnsw3r9gIDbI5ZC5PPQ-LIQodL1FbddMc7cZ7CYB8szqeVGeaoFaGq6PVs-UGSz1Fa0VqRuct1g6Mws+mb4epOyn9MOgIAFpAAK7MN3IZDoQPB2UHieO9Jw+V1nzfCBPzAb9f0TIFkxXWpIUadc1HVXREX0UxekMCQG0WHRcKPewulsWwTCNHDelzO0IkpEDWzAp9Xw-L8fz-PtOW5PlBTDIp72dcUKCOVioPYuDF0Q6RwWQlVMzVNpS01Hc911UYKw0PQen0QJhh0ExTHcLRwnonB8AgOAIRbN4ylXVCsw3RB8U8IzTDNUwKJWKwKwAWmwrxLAsHQ7AtcjjEMW8BNA+gmDAezVWzBALS0LpsI8rzVgsCt9FtGg8K0CQcLrfQBnzHQosdWzH3iBKFKSgItJoIqglMUtDDrUtywNBBvBNLRhnaGZDCCAZKonJiXSfb5mVEOq0LhLLmvcwjj063Qj20LwDMWFYcIRSxyXo8cI2q5iJRnLt4zIebHPQhBkX0Y1egsQYWtwkscqKpE8JegkXuJXCb2OmyaXOkSILYmCONuxTCuGAx5g0bz3FGHoK3sQwulep7AlGVF+hMkHGLOqaJT9INYaSgbcOxhEOpMXd9QmPokSJaw2r2zFgY2EmwZoAQcAgKmnLaWsukxCQQotQij3xLwPCCIqiICQYjvCIA */
    id: 'patientonboarding',
    types: {} as {
      events: { type: 'NewPatientEvent'; name: string; condition: string };
      context: {
        patient: {
          name: string;
          condition: string;
        } | null;
      };
    },
    initial: 'Idle',
    context: {
      patient: null,
    },
    states: {
      Idle: {
        on: {
          NewPatientEvent: {
            target: 'Onboard',
            actions: assign({
              patient: ({ event }) => ({
                name: event.name,
                condition: event.condition,
              }),
            }),
          },
        },
      },
      Onboard: {
        initial: 'StorePatient',
        states: {
          StorePatient: {
            invoke: {
              src: 'StoreNewPatientInfo',
              input: ({ context }) => context.patient,
              onDone: {
                target: 'AssignDoctor',
              },
              onError: {
                target: '#End',
              },
            },
          },
          AssignDoctor: {
            invoke: {
              src: 'AssignDoctor',
              onDone: {
                target: 'ScheduleAppt',
              },
              onError: {
                target: '#End',
              },
            },
          },
          ScheduleAppt: {
            invoke: {
              src: 'ScheduleAppt',
              onDone: {
                target: 'Done',
              },
              onError: {
                target: '#End',
              },
            },
          },
          Done: {
            type: 'final',
          },
        },
        onDone: {
          target: 'End',
          actions: assign({
            patient: null,
          }),
        },
      },
      End: {
        id: 'End',
        type: 'final',
      },
    },
  },
  {
    actors: {
      StoreNewPatientInfo: fromPromise(async ({ input }) => {
        console.log('Starting StoreNewPatientInfo', input);
        await retryPolicy.execute(() => delay(1000, 0.5));
        console.log('Completed StoreNewPatientInfo');
      }),
      AssignDoctor: fromPromise(async () => {
        console.log('Starting AssignDoctor');
        await retryPolicy.execute(() => delay(1000, 0.5));
        console.log('Completed AssignDoctor');
      }),
      ScheduleAppt: fromPromise(async () => {
        console.log('Starting ScheduleAppt');
        await retryPolicy.execute(() => delay(1000, 0.5));
        console.log('Completed ScheduleAppt');
      }),
    },
  }
);

const actor = createActor(workflow);

actor.subscribe({
  complete() {
    console.log('workflow completed', actor.getSnapshot().output);
  },
});

actor.start();

actor.send({
  type: 'NewPatientEvent',
  name: 'John Doe',
  condition: 'Broken Arm',
});
