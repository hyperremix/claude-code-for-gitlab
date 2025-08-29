import type { EnvVar } from "../types";

export interface IEnvironmentService {
  get(key: EnvVar): string | undefined;
  set(key: EnvVar, value: string): void;
  require(key: EnvVar): string;
}
