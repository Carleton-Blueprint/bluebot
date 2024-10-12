"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const xstate_1 = require("xstate");
const machineSetup = (0, xstate_1.setup)({
    types: {
        context: {},
        events: {},
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
        someActor: (0, xstate_1.fromPromise)((_a) => __awaiter(void 0, [_a], void 0, function* ({ input }) {
            console.log(input);
        })),
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
exports.default = machine;
