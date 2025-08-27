export interface ITempDirectoryService {
  getTempDirectory(): string;
  getTempSubdirectory(subdir: string): string;
  getClaudePromptsDirectory(): string;
  getClaudeOutputFile(): string;
  getClaudeExecutionOutputPath(): string;
}
