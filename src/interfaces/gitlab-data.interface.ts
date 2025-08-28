import type { GitLabIssueData, GitLabMRData } from "../types";

export interface IGitLabDataService {
  fetchGitLabMRData(): Promise<GitLabMRData | null>;
  fetchGitLabIssueData(): Promise<GitLabIssueData | null>;
}
