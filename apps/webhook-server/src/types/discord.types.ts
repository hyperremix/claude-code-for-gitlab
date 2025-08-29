export type DiscordNotificationOptions = {
  projectPath: string;
  authorUsername: string;
  resourceType: string;
  resourceId: string;
  branch: string;
  pipelineId: number;
  gitlabUrl: string;
  triggerPhrase: string;
  directPrompt: string;
  issueTitle?: string;
};
