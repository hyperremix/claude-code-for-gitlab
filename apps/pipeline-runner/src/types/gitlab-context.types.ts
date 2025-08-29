export type ParsedGitLabContext = {
  projectId: string;
  mrIid?: string;
  issueIid?: string;
  host: string;
  pipelineUrl?: string;
  commitSha: string;
  commitBranch: string;
  userName: string;
  userEmail: string;
  triggerSource?: string;
};

/**
 * Parse GitLab webhook payload for trigger detection
 */
export type GitLabWebhookPayload = {
  object_kind: "merge_request" | "note" | "issue";
  user?: {
    username: string;
    name: string;
  };
  object_attributes?: {
    title?: string;
    description?: string;
    note?: string;
    noteable_type?: string;
    action?: string;
    state?: string;
    iid?: number;
    source_branch?: string;
    target_branch?: string;
  };
  merge_request?: {
    iid: number;
    title: string;
    description: string;
    state: string;
    source_branch: string;
    target_branch: string;
  };
  project?: {
    id: number;
    path_with_namespace: string;
  };
  issue?: any;
};
