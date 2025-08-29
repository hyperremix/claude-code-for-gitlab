import type { BranchSchema, DiscussionNoteSchema } from "@gitbeaker/rest";
import type {
  FileChange,
  GitLabIssueData,
  GitLabMRData,
  PullRequestInfo,
  RepoInfo,
  SCMContext,
} from "../types";

export interface IGitLabService {
  /**
   * Get repository information
   */
  getRepoInfo(): Promise<RepoInfo>;

  /**
   * Get the current context (PR/MR, issue, etc.)
   */
  getContext(): SCMContext;

  /**
   * Check if a user has write permissions
   */
  hasWritePermission(username: string): Promise<boolean>;

  /**
   * Check if the actor is a human (not a bot)
   */
  isHumanActor(username: string): Promise<boolean>;

  /**
   * Get pull/merge request information
   */
  getPullRequestInfo(): Promise<PullRequestInfo>;

  /**
   * Get all comments on a pull/merge request or issue
   */
  getComments(): Promise<DiscussionNoteSchema[]>;

  /**
   * Create a comment on the pull/merge request or issue
   */
  createComment(body: string): Promise<number>;

  /**
   * Update an existing comment
   */
  updateComment({
    commentId,
    body,
  }: {
    commentId: string;
    body: string;
  }): Promise<void>;

  /**
   * Get the diff for the pull/merge request
   */
  getDiff(): Promise<string>;

  /**
   * Get file content at a specific ref
   */
  getFileContent(path: string, ref: string): Promise<string>;

  /**
   * Get multiple files content (optimized for batch fetching)
   */
  getFilesContent(
    paths: string[],
    ref: string,
  ): Promise<Record<string, string>>;

  /**
   * Get list of changed files in the pull/merge request
   */
  getChangedFiles(): Promise<FileChange[]>;

  /**
   * Create a new branch
   */
  createBranch(name: string, baseSha: string): Promise<void>;

  /**
   * Push changes to a branch
   */
  pushChanges(
    branch: string,
    message: string,
    files: Record<string, string>,
  ): Promise<string>;

  /**
   * Get branch information
   */
  getBranch(name: string): Promise<BranchSchema | null>;

  /**
   * Setup git authentication for operations
   */
  setupGitAuth(): Promise<void>;

  /**
   * Apply suggestions/patches to the code
   * This applies GitLab suggestions to merge requests
   */
  applySuggestions(
    suggestions: Array<{
      file: string;
      line: number;
      suggestion: string;
      description?: string;
    }>,
  ): Promise<void>;

  /**
   * Get GitLab pipeline URL
   */
  getJobUrl(): string;

  /**
   * Check if the current event contains the trigger phrase
   */
  checkTrigger(triggerPhrase: string, directPrompt?: string): Promise<boolean>;

  /**
   * Fetch comprehensive data about the current context
   * (MR details, files, discussions, etc.)
   */
  fetchContextData(): Promise<
    | GitLabMRData
    | GitLabIssueData
    | { projectId: string; host: string; userName: string }
    | null
  >;
}
