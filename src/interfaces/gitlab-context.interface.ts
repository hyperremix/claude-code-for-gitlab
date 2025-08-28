import type { GitLabWebhookPayload, ParsedGitLabContext } from "../types";

export interface IGitLabContextService {
  getContext(): ParsedGitLabContext;
  parseWebhookPayload(): GitLabWebhookPayload | null;
  resetCache(): void;
}
