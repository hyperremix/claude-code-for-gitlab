/**
 * Provider Factory
 *
 * Creates GitLab provider based on the environment
 */

import { GitLabProvider } from "./gitlab-provider";
import type { GitLabProviderOptions, SCMProvider } from "./scm-provider";

export type ProviderType = "gitlab";

export interface ProviderFactoryOptions {
  platform?: ProviderType;
  token: string;
  triggerPhrase?: string;
  directPrompt?: string;
}

/**
 * Creates a GitLab provider instance
 */
export function createProvider(options: ProviderFactoryOptions): SCMProvider {
  console.log("Creating GitLab provider");

  // Get GitLab-specific configuration
  const projectId = process.env.CI_PROJECT_ID;
  const mrIid = process.env.CI_MERGE_REQUEST_IID;
  const issueIid = process.env.CLAUDE_RESOURCE_ID;
  const host = process.env.CI_SERVER_URL || "https://gitlab.com";
  const pipelineUrl = process.env.CI_PIPELINE_URL;

  if (!projectId) {
    throw new Error("GitLab project ID is required (CI_PROJECT_ID)");
  }

  const gitlabOptions: GitLabProviderOptions = {
    token: options.token,
    projectId,
    mrIid,
    issueIid,
    host,
    pipelineUrl,
    triggerPhrase: options.triggerPhrase,
    directPrompt: options.directPrompt,
  };

  return new GitLabProvider(gitlabOptions);
}

/**
 * Gets the GitLab token
 */
export function getToken(): string {
  // Check for GitLab access token first (highest priority)
  const glAccessToken = process.env.CLAUDE_CODE_GL_ACCESS_TOKEN;
  if (glAccessToken) {
    // Check if the token is a literal environment variable string (not expanded)
    if (glAccessToken.startsWith("$")) {
      console.error(
        `ERROR: CLAUDE_CODE_GL_ACCESS_TOKEN appears to be unexpanded: "${glAccessToken}"`,
      );
      console.error(
        `This usually means the variable is not defined in GitLab CI/CD settings.`,
      );
      console.error(
        `Please add CLAUDE_CODE_GL_ACCESS_TOKEN to your GitLab project's CI/CD variables.`,
      );
      // Don't use this invalid token
    } else {
      console.log(
        `Using CLAUDE_CODE_GL_ACCESS_TOKEN for GitLab authentication (length: ${glAccessToken.length})`,
      );
      return glAccessToken;
    }
  }

  // Check for OAuth token (new method)
  const oauthToken =
    process.env.CLAUDE_CODE_OAUTH_TOKEN ||
    process.env.INPUT_CLAUDE_CODE_OAUTH_TOKEN;
  if (oauthToken) {
    console.log("Using Claude Code OAuth token for GitLab authentication");
    return oauthToken;
  }

  // Fall back to traditional GitLab token
  const token = process.env.GITLAB_TOKEN;
  if (token) {
    return token;
  }

  // Check for GitLab token input as final fallback
  const gitlabTokenInput = process.env.INPUT_GITLAB_TOKEN;
  if (gitlabTokenInput) {
    return gitlabTokenInput;
  }

  throw new Error(
    "GitLab authentication required (CLAUDE_CODE_GL_ACCESS_TOKEN, CLAUDE_CODE_OAUTH_TOKEN, GITLAB_TOKEN, or gitlab_token input)",
  );
}

/**
 * Export GitLab provider for direct access if needed
 */
export type { SCMProvider } from "./scm-provider";
export { GitLabProvider };
