import { Context } from 'probot';
import { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods';
import { Logger as WinstonLogger } from 'winston';

export type Logger = WinstonLogger;
export type IssuesContext = Context<'issues'>;
export type IssueMetadata = {
  client: string;
  clientTag: string;
  author: string;
  stage: number;
};
export type Milestone = RestEndpointMethodTypes['issues']['createMilestone']['response']['data'];
export type Issue = RestEndpointMethodTypes['issues']['create']['response']['data'];
export type Comment = RestEndpointMethodTypes['issues']['createComment']['response']['data'];
