import type {
  IEnvironmentService,
  ILoggerService,
  ITokenService,
} from "../interfaces";
import { EnvVar } from "../types";

let token: string | null = null;

export class TokenService implements ITokenService {
  constructor(
    private logger: ILoggerService,
    private environment: IEnvironmentService,
  ) {}

  resetCache(): void {
    token = null;
  }

  getToken(): string {
    if (token !== null) {
      return token;
    }

    // Check for GitLab access token first (highest priority)
    const glAccessToken = this.environment.get(
      EnvVar.CLAUDE_CODE_GL_ACCESS_TOKEN,
    );
    if (glAccessToken) {
      // Check if the token is a literal environment variable string (not expanded)
      if (glAccessToken.startsWith("$")) {
        this.logger.error(
          `ERROR: CLAUDE_CODE_GL_ACCESS_TOKEN appears to be unexpanded: "${glAccessToken}"`,
        );
        this.logger.error(
          `This usually means the variable is not defined in GitLab CI/CD settings.`,
        );
        this.logger.error(
          `Please add CLAUDE_CODE_GL_ACCESS_TOKEN to your GitLab project's CI/CD variables.`,
        );
        // Don't use this invalid token
      } else {
        token = glAccessToken;
        this.logger.info(
          `Using CLAUDE_CODE_GL_ACCESS_TOKEN for GitLab authentication (prefix: ${token.substring(0, 8)}...}, length: ${token.length})`,
        );
        return token;
      }
    }

    // Check for OAuth token (new method)
    const oauthToken =
      this.environment.get(EnvVar.CLAUDE_CODE_OAUTH_TOKEN) ||
      this.environment.get(EnvVar.INPUT_CLAUDE_CODE_OAUTH_TOKEN);
    if (oauthToken) {
      token = oauthToken;
      this.logger.info(
        `Using Claude Code OAuth token for GitLab authentication (prefix: ${token.substring(0, 8)}...}, length: ${token.length})`,
      );
      return token;
    }

    // Fall back to traditional GitLab token
    const gitLabToken = this.environment.get(EnvVar.GITLAB_TOKEN);
    if (gitLabToken) {
      token = gitLabToken;
      this.logger.info(
        `Using GITLAB_TOKEN for GitLab authentication (prefix: ${token.substring(0, 8)}...}, length: ${token.length})`,
      );
      return token;
    }

    // Check for GitLab token input as final fallback
    const gitlabTokenInput = this.environment.get(EnvVar.INPUT_GITLAB_TOKEN);
    if (gitlabTokenInput) {
      token = gitlabTokenInput;
      this.logger.info(
        `Using INPUT_GITLAB_TOKEN for GitLab authentication (prefix: ${token.substring(0, 8)}...}, length: ${token.length})`,
      );
      return token;
    }

    throw new Error(
      "GitLab authentication required (CLAUDE_CODE_GL_ACCESS_TOKEN, CLAUDE_CODE_OAUTH_TOKEN, GITLAB_TOKEN, or gitlab_token input)",
    );
  }
}
