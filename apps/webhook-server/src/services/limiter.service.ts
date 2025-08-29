import type { IEnvironmentService } from "../../../../src/interfaces";
import { EnvVar } from "../../../../src/types";
import type { ILimiterService, IRedisAdapterFactory } from "../interfaces";

export class LimiterService implements ILimiterService {
  MAX_REQUESTS: number;
  WINDOW_SECONDS: number;

  constructor(
    private redisFactory: IRedisAdapterFactory,
    environment: IEnvironmentService,
  ) {
    this.MAX_REQUESTS = Number(environment.get(EnvVar.RATE_LIMIT_MAX)) || 3;
    this.WINDOW_SECONDS =
      Number(environment.get(EnvVar.RATE_LIMIT_WINDOW)) || 60 * 15;
  }

  async limitByUser(key: string): Promise<boolean> {
    try {
      const redis = await this.redisFactory.create();
      const now = Math.floor(Date.now() / 1000);

      // Remove old entries
      await redis.zRemRangeByScore(key, 0, now - this.WINDOW_SECONDS);

      // Count current entries
      const count = await redis.zCard(key);

      if (count >= this.MAX_REQUESTS) {
        return false;
      }

      // Add new entry
      await redis.zAdd(key, now, `${now}-${Math.random()}`);
      await redis.expire(key, this.WINDOW_SECONDS);

      return true;
    } catch (error) {
      console.error("Rate limiting error:", error);
      // If Redis fails, allow the request (fail open)
      return true;
    }
  }
}
