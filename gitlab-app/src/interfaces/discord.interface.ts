import type { DiscordNotificationOptions } from "../types/discord.types";

export interface IDiscordService {
  /**
   * Send a Discord notification when a pipeline is triggered
   * This is fire-and-forget - errors are logged but don't affect the main flow
   */
  sendPipelineNotification(options: DiscordNotificationOptions): void;

  /**
   * Send a rate limit notification to Discord
   */
  sendRateLimitNotification(
    projectPath: string,
    authorUsername: string,
    resourceType: string,
    resourceId: string,
  ): void;
}
