#!/usr/bin/env bun

import { UpdateCommentGitLabOrchestrator } from "../core/update-comment-gitlab.orchestrator";
import { createServiceContainer } from "../services";

async function run() {
  const container = createServiceContainer();

  const orchestrator = new UpdateCommentGitLabOrchestrator(
    container.environment,
    container.fileSystem,
    container.gitLabAdapter,
  );

  try {
    orchestrator.run();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to update GitLab comment: ${errorMessage}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  run();
}
