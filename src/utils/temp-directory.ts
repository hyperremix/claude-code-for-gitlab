/**
 * Centralized utility for handling temporary directories in GitLab CI
 *
 * GitLab CI provides CI_BUILDS_DIR as the main workspace for job execution
 *
 * Reference:
 * - GitLab: CI_BUILDS_DIR is the main workspace for job execution
 */

import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Get the appropriate temporary directory for GitLab CI
 * @returns The temporary directory path
 */
export function getTempDirectory(): string {
  // GitLab CI - use CI_BUILDS_DIR if available
  if (process.env.CI_BUILDS_DIR) {
    // Create a temp subdirectory within CI_BUILDS_DIR to isolate temporary files
    const gitlabTemp = join(process.env.CI_BUILDS_DIR, ".claude-temp");
    if (!existsSync(gitlabTemp)) {
      mkdirSync(gitlabTemp, { recursive: true });
    }
    return gitlabTemp;
  }

  // Fallback to system temp directory
  // This works for both local development and CI environments
  return "/tmp";
}

/**
 * Get a subdirectory within the temporary directory
 * Creates the directory if it doesn't exist
 * @param subdir The subdirectory name
 * @returns The full path to the subdirectory
 */
export function getTempSubdirectory(subdir: string): string {
  const tempDir = getTempDirectory();
  const fullPath = join(tempDir, subdir);

  if (!existsSync(fullPath)) {
    mkdirSync(fullPath, { recursive: true });
  }

  return fullPath;
}

/**
 * Get the path for Claude prompts directory
 * @returns The path to the claude-prompts directory
 */
export function getClaudePromptsDirectory(): string {
  return getTempSubdirectory("claude-prompts");
}

/**
 * Get the path for Claude execution output
 * @returns The path to the execution output file
 */
export function getClaudeExecutionOutputPath(): string {
  return join(getTempDirectory(), "claude-execution-output.json");
}
