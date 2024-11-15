import { Probot, run } from 'probot';
import winston from 'winston';

import { appendInitialMetadata, createMilestone, createNextIssue, isLabelCorrect } from './machine/utils';

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
    // Activation Label Guard
    if (!isLabelCorrect(context, logger)) return;

    // Add Initial Metadata to Issue Body
    await appendInitialMetadata(context, logger);

    // Create Milestone
    await createMilestone(context, logger);
  });

  probotApp.on('issues.closed', async context => {
    // Activation Label Guard
    if (!isLabelCorrect(context, logger)) return;

    // Create next issue
    await createNextIssue(context, logger);
  });
};

run(app);
