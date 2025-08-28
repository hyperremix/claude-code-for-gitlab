/**
 * GitLab Data Fetcher
 *
 * Fetches merge request data from GitLab API using injected services
 */

import type {
  IGitLabAdapter,
  IGitLabContextService,
  IGitLabDataService,
} from "../interfaces";
import type { GitLabIssueData, GitLabMRData } from "../types";

export class GitLabDataService implements IGitLabDataService {
  constructor(
    private gitLabAdapter: IGitLabAdapter,
    private gitLabContext: IGitLabContextService,
  ) {}

  async fetchGitLabMRData(): Promise<GitLabMRData | null> {
    const context = this.gitLabContext.getContext();

    if (!context.mrIid) {
      return null;
    }

    // Fetch MR details, changes, and discussions in parallel
    const [mrDetails, mrChanges, discussions] = await Promise.all([
      this.gitLabAdapter.showMergeRequest({
        projectId: context.projectId,
        mergeRequestIid: context.mrIid,
      }),
      this.gitLabAdapter.showMergeRequestChanges({
        projectId: context.projectId,
        mergeRequestIid: context.mrIid,
      }),
      this.gitLabAdapter.allMergeRequestDiscussions({
        projectId: context.projectId,
        mergeRequestIid: context.mrIid,
      }),
    ]);

    return {
      iid: mrDetails.iid,
      title: mrDetails.title,
      description: mrDetails.description || "",
      state: mrDetails.state,
      sourceBranch: mrDetails.source_branch,
      targetBranch: mrDetails.target_branch,
      author: {
        username: mrDetails.author.username,
        name: mrDetails.author.name,
      },
      changes: mrChanges.changes || [],
      discussions: discussions.map((d) => ({
        id: d.id,
        notes:
          d.notes?.map((n) => ({
            id: n.id,
            body: n.body,
            author: {
              username: n.author.username,
              name: n.author.name,
            },
            created_at: n.created_at,
          })) ?? [],
      })),
      diffRefs: mrDetails.diff_refs ||
        mrChanges.diff_refs || {
          base_sha: "",
          head_sha: "",
          start_sha: "",
        },
      projectId: context.projectId,
      webUrl: mrDetails.web_url,
    };
  }

  async fetchGitLabIssueData(): Promise<GitLabIssueData | null> {
    const context = this.gitLabContext.getContext();

    if (!context.issueIid) {
      return null;
    }

    // Fetch issue details and discussions
    const [issueDetails, discussions] = await Promise.all([
      this.gitLabAdapter.showIssue({
        projectId: context.projectId,
        issueIid: context.issueIid,
      }),
      this.gitLabAdapter.allIssueDiscussions({
        projectId: context.projectId,
        issueIid: context.issueIid,
      }),
    ]);

    return {
      iid: issueDetails.iid,
      title: issueDetails.title,
      description: issueDetails.description || "",
      state: issueDetails.state,
      author: {
        username: issueDetails.author.username,
        name: issueDetails.author.name,
      },
      labels: issueDetails.labels.map((l) =>
        typeof l === "string" ? l : l.name,
      ),
      discussions: discussions.map((d) => ({
        id: d.id,
        notes:
          d.notes?.map((n) => ({
            id: n.id,
            body: n.body,
            author: {
              username: n.author.username,
              name: n.author.name,
            },
            created_at: n.created_at,
          })) ?? [],
      })),
      projectId: context.projectId,
      webUrl: issueDetails.web_url,
    };
  }
}
