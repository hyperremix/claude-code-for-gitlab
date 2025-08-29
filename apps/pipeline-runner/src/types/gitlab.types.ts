export type RepoInfo = {
  owner: string;
  repo: string;
  defaultBranch: string;
};

export type SCMContext = {
  isPR: boolean;
  entityNumber: number; // MR IID or Issue IID
  actor: string;
  runId?: string;
  triggerEvent: string;
};

export type PullRequestInfo = {
  number: number;
  headSha: string;
  baseSha: string;
  headBranch: string;
  baseBranch: string;
  author: string;
  title: string;
  body: string;
  isDraft: boolean;
  state: "open" | "closed" | "merged";
};

export type FileChange = {
  path: string;
  additions: number;
  deletions: number;
  patch?: string;
};

export type GitLabServiceOptions = {
  disableTokenValidation?: boolean;
};
