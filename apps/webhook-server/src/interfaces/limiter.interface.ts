export interface ILimiterService {
  limitByUser(key: string): Promise<boolean>;
}
