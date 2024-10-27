import { Probot, run } from 'probot';
import winston from 'winston';

import { createActor } from 'xstate';
import machine from './machine';

/* Logger Configuration */
const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.json(),
  defaultMeta: { service: 'user-service' },
  transports: [
    //
    // - Write all logs with importance level of `error` or higher to `error.log`
    //   (i.e., error, fatal, but not other levels)
    //
    // new winston.transports.File({ filename: 'error.log', level: 'error' }),
    //
    // - Write all logs with importance level of `info` or higher to `combined.log`
    //   (i.e., fatal, error, warn, and info, but not trace)
    //
    // new winston.transports.File({ filename: 'combined.log' }),
  ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  );
}

/* Main App */
const app = (probotApp: Probot) => {
  probotApp.on('issues.opened', async context => {
    const actor = createActor(machine, { input: { probotContext: context, logger } });
    actor.start();
    actor.send({ type: 'New Project', probotContext: context });
  });

  probotApp.on('issues.closed', async context => {
    const actor = createActor(machine, { input: { probotContext: context, logger } });
    actor.start();
    actor.send({ type: 'Issue Closed', probotContext: context });
  });

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};

run(app);
