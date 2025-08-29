export interface IRedisAdapter {
  zRemRangeByScore(key: string, min: number, max: number): Promise<number>;
  zCard(key: string): Promise<number>;
  zAdd(key: string, score: number, value: string): Promise<number>;
  expire(key: string, seconds: number): Promise<boolean>;
}

export interface IRedisAdapterFactory {
  create(): Promise<IRedisAdapter>;
}
