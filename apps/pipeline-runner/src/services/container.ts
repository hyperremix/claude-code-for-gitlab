/**
 * Dependency injection container for service management
 * Provides both production and test implementations of services
 */

import type { ServiceContainer } from "../types";
import { CommandExecutionService } from "./command-execution.service";
import { EnvironmentService } from "./environment.service";
import { FileSystemService } from "./file-system.service";
import { GitLabContextService } from "./gitlab-context.service";
import { GitLabDataService } from "./gitlab-data.service";
import { GitLabAdapter } from "./gitlab.adapter";
import { GitLabService } from "./gitlab.service";
import { HttpClient } from "./http.client";
import { LoggerService } from "./logger.service";
import { TempDirectoryService } from "./temp-directory.service";
import { TokenService } from "./token.service";

/**
 * Creates a service container with real service implementations
 * for production use
 */
export function createServiceContainer(): ServiceContainer {
  const logger = new LoggerService();
  const environment = new EnvironmentService();
  const gitLabContext = new GitLabContextService(environment);
  const tokenService = new TokenService(logger, environment);
  const gitLabAdapter = new GitLabAdapter(tokenService, gitLabContext);
  const commandExecution = new CommandExecutionService();
  const fileSystem = new FileSystemService();
  const httpClient = new HttpClient();
  const gitLabData = new GitLabDataService(gitLabAdapter, gitLabContext);
  const tempDirectory = new TempDirectoryService(environment, fileSystem);
  const gitLabService = new GitLabService(
    logger,
    environment,
    gitLabAdapter,
    commandExecution,
    gitLabData,
    gitLabContext,
    tokenService,
  );

  return {
    gitLabAdapter,
    commandExecution,
    fileSystem,
    environment,
    httpClient,
    logger,
    gitLabData,
    tempDirectory,
    gitLabContext,
    gitLabService,
    tokenService,
  };
}
