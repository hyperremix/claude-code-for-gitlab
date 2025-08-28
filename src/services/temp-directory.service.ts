import { join } from "node:path";
import type {
  IEnvironmentService,
  IFileSystemService,
  ITempDirectoryService,
} from "../interfaces";
import { EnvVar } from "../types";

export class TempDirectoryService implements ITempDirectoryService {
  constructor(
    private environmentService: IEnvironmentService,
    private fileSystemService: IFileSystemService,
  ) {}

  /**
   * Get the appropriate temporary directory for GitLab CI
   * @returns The temporary directory path
   */
  getTempDirectory(): string {
    // GitLab CI - use CI_BUILDS_DIR if available
    const ciBuildDir = this.environmentService.get(EnvVar.CI_BUILDS_DIR);
    if (ciBuildDir) {
      // Create a temp subdirectory within CI_BUILDS_DIR to isolate temporary files
      const gitlabTemp = this.fileSystemService.join(
        ciBuildDir,
        ".claude-temp",
      );
      if (!this.fileSystemService.existsSync(gitlabTemp)) {
        this.fileSystemService.mkdir(gitlabTemp, { recursive: true });
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
  getTempSubdirectory(subdir: string): string {
    const tempDir = this.getTempDirectory();
    const fullPath = this.fileSystemService.join(tempDir, subdir);

    if (!this.fileSystemService.existsSync(fullPath)) {
      this.fileSystemService.mkdir(fullPath, { recursive: true });
    }

    return fullPath;
  }

  /**
   * Get the path for Claude prompts directory
   * @returns The path to the claude-prompts directory
   */
  getClaudePromptsDirectory(): string {
    return this.getTempSubdirectory("claude-prompts");
  }

  /**
   * Get the path for Claude execution output
   * @returns The path to the execution output file
   */
  getClaudeExecutionOutputPath(): string {
    return join(this.getTempDirectory(), "claude-execution-output.json");
  }

  /**
   * Get the path for Claude execution output
   * @returns The path to the execution output file
   */
  getClaudeOutputFile(): string {
    return this.fileSystemService.join(
      this.getTempDirectory(),
      "claude-execution-output.json",
    );
  }
}
