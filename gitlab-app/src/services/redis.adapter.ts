import type { createClient } from "redis";
import type { IRedisAdapter } from "../interfaces";

export class RedisAdapter implements IRedisAdapter {
  constructor(private client: ReturnType<typeof createClient>) {}

  async zAdd(key: string, score: number, value: string): Promise<number> {
    return await this.client.zAdd(key, { score, value });
  }

  async zCard(key: string): Promise<number> {
    return await this.client.zCard(key);
  }

  async zRemRangeByScore(
    key: string,
    min: number,
    max: number,
  ): Promise<number> {
    return await this.client.zRemRangeByScore(key, min, max);
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    return await this.client.expire(key, seconds);
  }
}
