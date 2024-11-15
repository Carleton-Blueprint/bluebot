import fs from 'fs/promises';
import _ from 'lodash';

// export const commentSummaryActor = fromPromise(
//   async ({ input: { context } }: { input: { context: MachineContext } }) => {
//     const { probotContext, prevStage, logger, owner, repo, milestone, nextIssue } = context;

//     if (!milestone) {
//       logger.error('createNextIssueActor: Milestone is not set.');
//       return;
//     }

//     if (!nextIssue) {
//       logger.error('createNextIssueActor: Next Issue is not set.');
//       return;
//     }

//     // construct body for the next issue
//     const dirs = await getDirs();
//     const dirName = dirs[prevStage];
//     if (!dirName) {
//       logger.error(`createNextIssueActor: No directory found for current stage.`);
//       return;
//     }
// const rawTemplate = await fs.readFile(`./src/stages/${dirName}/summary.md`, 'utf8');
// if (!rawTemplate) {
//   logger.error(`createNextIssueActor: No summary markdown file found for current stage.`);
//   return;
// }
// const template = _.template(rawTemplate);
// const data = {
//   milestoneUrl: milestone.html_url,
//   issueUrl: nextIssue.html_url,
//   projectUrl: getProjectUrl(milestone.title),
// };

// // add comment to original issue to highlight next steps
// await probotContext.octokit.issues.createComment({
//   owner,
//   repo,
//   issue_number: probotContext.payload.issue.number,
//   body: template(data),
// });
//   },
// );
