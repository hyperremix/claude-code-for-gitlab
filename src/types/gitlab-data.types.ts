export type GitLabMRData = {
  iid: number;
  title: string;
  description: string;
  state: string;
  sourceBranch: string;
  targetBranch: string;
  author: {
    username: string;
    name: string;
  };
  changes: Array<{
    old_path: string;
    new_path: string;
    new_file: boolean;
    renamed_file: boolean;
    deleted_file: boolean;
    diff: string;
  }>;
  discussions: Array<{
    id: string;
    notes: Array<{
      id: number;
      body: string;
      author: {
        username: string;
        name: string;
      };
      created_at: string;
    }>;
  }>;
  diffRefs: {
    base_sha: string;
    head_sha: string;
    start_sha: string;
  };
  projectId: string;
  webUrl: string;
};

export type GitLabIssueData = {
  iid: number;
  title: string;
  description: string;
  state: string;
  author: {
    username: string;
    name: string;
  };
  labels: string[];
  discussions: Array<{
    id: string;
    notes: Array<{
      id: number;
      body: string;
      author: {
        username: string;
        name: string;
      };
      created_at: string;
    }>;
  }>;
  projectId: string;
  webUrl: string;
};
