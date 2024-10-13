import { Context } from 'probot';
import { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods';
import { Logger } from 'winston';

export type IssuesContext = Context<'issues'>;
export type Milestone = RestEndpointMethodTypes['issues']['createMilestone']['response']['data'];
export type MachineContext = {
  logger: Logger;
  probotContext: IssuesContext;
  owner: string;
  repo: string;
  client: string;
  author: string;
  clientTag: string;
  prevStage: number;
  milestone?: Milestone;
};
export type MachineEvent =
  | { type: 'New Project'; probotContext: IssuesContext }
  | { type: 'Milestone Created'; milestone: Milestone }; // not used: deleteme (left here for reference example )
