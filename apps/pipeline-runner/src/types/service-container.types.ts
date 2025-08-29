import type {
  ICommandExecutionService,
  IEnvironmentService,
  IFileSystemService,
  IGitLabAdapter,
  IGitLabContextService,
  IGitLabDataService,
  IGitLabService,
  IHttpClient,
  ILoggerService,
  ITempDirectoryService,
  ITokenService,
} from "../interfaces";

/**
 * Main service container interface
 * Provides access to all injectable services for dependency injection
 */
export type ServiceContainer = {
  gitLabAdapter: IGitLabAdapter;
  commandExecution: ICommandExecutionService;
  fileSystem: IFileSystemService;
  environment: IEnvironmentService;
  httpClient: IHttpClient;
  logger: ILoggerService;
  gitLabData: IGitLabDataService;
  tempDirectory: ITempDirectoryService;
  gitLabContext: IGitLabContextService;
  gitLabService: IGitLabService;
  tokenService: ITokenService;
};
