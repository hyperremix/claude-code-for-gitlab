#!/usr/bin/env bun

/**
 * Unified GitLab entrypoint using orchestrator pattern
 */

import { GitLabEntrypointOrchestrator } from "../core/gitlab-entrypoint.orchestrator";
import { createServiceContainer } from "../services";

async function main() {
  // Create service container with real implementations
  const container = createServiceContainer();

  // Create orchestrator with injected services
  const orchestrator = new GitLabEntrypointOrchestrator(
    container.logger,
    container.environment,
    container.fileSystem,
    container.commandExecution,
    container.tempDirectory,
    container.gitLabService,
  );

  // Run the complete pipeline and get exit code
  const exitCode = await orchestrator.run();

  // Exit with appropriate code
  process.exit(exitCode);
}

// Run the main function
if (import.meta.main) {
  main();
}
