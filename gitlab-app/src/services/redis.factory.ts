import { createClient } from "redis";
import type { IEnvironmentService } from "../../../src/interfaces";
import { EnvVar } from "../../../src/types";
import type { IRedisAdapter, IRedisAdapterFactory } from "../interfaces";
import { RedisAdapter } from "./redis.adapter";

let redisAdapter: IRedisAdapter | null = null;

export class RedisAdapterFactory implements IRedisAdapterFactory {
  constructor(private environment: IEnvironmentService) {}

  async create(): Promise<IRedisAdapter> {
    if (redisAdapter) {
      return redisAdapter;
    }

    const client = createClient({
      url: this.environment.get(EnvVar.REDIS_URL) || "redis://localhost:6379",
    });

    client.on("error", (err) => console.error("Redis error:", err));
    client.on("connect", () => console.log("Connected to Redis"));

    await client.connect();

    redisAdapter = new RedisAdapter(client);
    return redisAdapter;
  }
}
