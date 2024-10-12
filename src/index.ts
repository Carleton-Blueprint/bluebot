console.log('hello world');

// import { Probot } from 'probot';
// import fs from 'fs';
// import _ from 'lodash';
// import winston from 'winston';

// import { createActor } from 'xstate';
// import machine from './machine';
// import { WebhookEvent } from '@octokit/webhooks-types';

// const actor = createActor(machine);
// actor.subscribe(snapshot => {
//   console.log(snapshot.status);
// });
// actor.start();
// actor.send({ type: 'New Project', context: 'hey' });

// const ACTIVATION_LABEL_ID = 7587773718;

// /* Logger Configuration */
// const logger = winston.createLogger({
//   level: 'info',
//   format: winston.format.json(),
//   defaultMeta: { service: 'user-service' },
//   transports: [
//     //
//     // - Write all logs with importance level of `error` or higher to `error.log`
//     //   (i.e., error, fatal, but not other levels)
//     //
//     new winston.transports.File({ filename: 'error.log', level: 'error' }),
//     //
//     // - Write all logs with importance level of `info` or higher to `combined.log`
//     //   (i.e., fatal, error, warn, and info, but not trace)
//     //
//     new winston.transports.File({ filename: 'combined.log' }),
//   ],
// });

// //
// // If we're not in production then log to the `console` with the format:
// // `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
// //
// if (process.env.NODE_ENV !== 'production') {
//   logger.add(
//     new winston.transports.Console({
//       format: winston.format.simple(),
//     })
//   );
// }

// /* Main App */
// export default (app: Probot) => {
//   app.on('issues.opened', async context => {
//     // only trigger on issues with the correct label
//     const receivedIssue = context.payload.issue;
//     const isLabelCorrect = receivedIssue.labels?.some(label => label.id === ACTIVATION_LABEL_ID);
//     if (!isLabelCorrect) return;

//     // parse general information
//     const owner = context.payload.repository.owner.login;
//     const repo = context.payload.repository.name;

//     // parse payload from newly created issue (GitHub issue yaml form)
//     const fields = context.payload.issue.body?.split('\n\n');
//     if (!fields) return;
//     const organization = fields[1];
//     const author = fields[3];
//     const organizationTag = fields[5];
//     logger.debug('fields', fields);

//     // create milestone for the project
//     const milestone = await context.octokit.issues.createMilestone({
//       owner: context.payload.repository.owner.login,
//       repo: context.payload.repository.name,
//       title: `📍 [project] ${organization}`,
//     });
//     logger.info(`Created milestone: ${milestone.data.title}`);

//     // construct body for the Stage 1 issue
//     const rawTemplate = fs.readFileSync('./src/stages/1-outreach/0-task.md', 'utf8');
//     const template = _.template(rawTemplate);
//     const data = { organization, author, organizationTag };

//     // create Stage 1 issue with milestone (using Workflows, this issue is automatically added to the project - https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/adding-items-automatically)
//     const issue_stage0 = await context.octokit.issues.create({
//       owner,
//       repo,
//       title: `[project] ${organizationTag}: Stage 1 - Outreach`,
//       body: template(data),
//       milestone: milestone.data.number,
//     });
//     logger.info(`Created issue: ${issue_stage0.data.title}`);

//     // add comment to original issue to highlight next steps
//     await context.octokit.issues.createComment({
//       owner,
//       repo,
//       issue_number: receivedIssue.number,
//       body: 'hi',
//     });
//   });
//   // For more information on building apps:
//   // https://probot.github.io/docs/

//   // To get your app running against GitHub, see:
//   // https://probot.github.io/docs/development/
// };
