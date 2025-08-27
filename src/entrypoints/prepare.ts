#!/usr/bin/env bun

/**
 * Prepare the Claude action by checking trigger conditions, verifying human actor,
 * and creating the initial tracking comment
 */

import { PrepareEntrypointOrchestrator } from "../core/prepare.orchestrator";
import { createServiceContainer } from "../services";
import { EnvVar } from "../types";

async function main() {
  // Create service container with real implementations
  const container = createServiceContainer();

  const orchestrator = new PrepareEntrypointOrchestrator(
    container.environment,
    container.fileSystem,
    container.tempDirectory,
    container.gitLabContext,
    container.gitLabService,
  );

  // Debug environment variables related to authentication
  console.log("=== GitLab Environment Variables Debug ===");
  const authVars = [
    EnvVar.CLAUDE_CODE_GL_ACCESS_TOKEN,
    EnvVar.CLAUDE_CODE_OAUTH_TOKEN,
    EnvVar.GITLAB_TOKEN,
    EnvVar.CI_JOB_TOKEN,
  ];

  authVars.forEach((varName) => {
    const value = container.environment.get(varName);
    if (value) {
      if (value.startsWith("$")) {
        console.log(
          `${varName}: UNEXPANDED ("${value}") - Variable not set in CI/CD settings!`,
        );
      } else {
        console.log(
          `${varName}: Set (length: ${value.length}, prefix: "${value.substring(
            0,
            8,
          )}...")`,
        );
      }
    } else {
      console.log(`${varName}: Not set`);
    }
  });
  console.log("=========================================");

  await orchestrator.run();
}

if (import.meta.main) {
  main();
}
