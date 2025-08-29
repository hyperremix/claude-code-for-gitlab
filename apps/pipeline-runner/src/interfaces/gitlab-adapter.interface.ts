import type {
  AllPipelinesOptions,
  BasePaginationRequestOptions,
  BranchSchema,
  CommitAction,
  CommitSchema,
  DiscussionNotePositionOptions,
  DiscussionSchema,
  ExpandedMergeRequestSchema,
  ExpandedPipelineSchema,
  IssueNoteSchema,
  IssueSchema,
  MemberSchema,
  MergeRequestChangesSchema,
  MergeRequestNoteSchema,
  OffsetPaginationRequestOptions,
  PipelineSchema,
  ProjectSchema,
  RepositoryFileExpandedSchema,
  ShowExpanded,
  SimpleUserSchema,
  Sudo,
  UserSchema,
} from "@gitbeaker/rest";

export interface IGitLabAdapter {
  validateToken(): Promise<void>;

  createIssueNote({
    projectId,
    issueIid,
    body,
  }: {
    projectId: string;
    issueIid: string;
    body: string;
  }): Promise<IssueNoteSchema>;

  editIssueNote({
    projectId,
    issueIid,
    noteId,
    body,
  }: {
    projectId: string;
    issueIid: string | number;
    noteId: string | number;
    body: string;
  }): Promise<IssueNoteSchema>;

  allIssueNotes({
    projectId,
    issueIid,
  }: {
    projectId: string;
    issueIid: string;
  }): Promise<IssueNoteSchema[]>;

  createMergeRequestNote({
    projectId,
    mergeRequestIid,
    body,
  }: {
    projectId: string;
    mergeRequestIid: string;
    body: string;
  }): Promise<MergeRequestNoteSchema>;

  editMergeRequestNote({
    projectId,
    mergeRequestIid,
    noteId,
    body,
  }: {
    projectId: string;
    mergeRequestIid: string | number;
    noteId: string | number;
    body: string;
  }): Promise<MergeRequestNoteSchema>;

  allMergeRequestNotes({
    projectId,
    mergeRequestIid,
  }: {
    projectId: string;
    mergeRequestIid: string;
  }): Promise<MergeRequestNoteSchema[]>;

  showMergeRequest({
    projectId,
    mergeRequestIid,
  }: {
    projectId: string;
    mergeRequestIid: string;
  }): Promise<ExpandedMergeRequestSchema>;

  showMergeRequestChanges({
    projectId,
    mergeRequestIid,
  }: {
    projectId: string;
    mergeRequestIid: string;
  }): Promise<MergeRequestChangesSchema>;

  allMergeRequestDiscussions({
    projectId,
    mergeRequestIid,
  }: {
    projectId: string;
    mergeRequestIid: string;
  }): Promise<DiscussionSchema[]>;

  createMergeRequestDiscussion({
    projectId,
    mergeRequestIid,
    body,
  }: {
    projectId: string;
    mergeRequestIid: string;
    body: string;
    options?: {
      position?: DiscussionNotePositionOptions;
      commitId?: string;
      createdAt?: string;
    };
  }): Promise<DiscussionSchema>;

  showIssue({
    projectId,
    issueIid,
  }: {
    projectId: string;
    issueIid?: string | number;
  }): Promise<IssueSchema>;

  allIssueDiscussions({
    projectId,
    issueIid,
  }: {
    projectId: string;
    issueIid?: string | number;
  }): Promise<DiscussionSchema[]>;

  showCurrentUser(): Promise<UserSchema>;

  allUsers(username: string): Promise<SimpleUserSchema[]>;

  showProject(projectId: string | number): Promise<ProjectSchema>;

  getMember({
    projectId,
    userId,
  }: {
    projectId: string;
    userId: number;
  }): Promise<MemberSchema>;

  showRepositoryFile({
    projectId,
    filePath,
    ref,
  }: {
    projectId: string;
    filePath: string;
    ref: string;
  }): Promise<RepositoryFileExpandedSchema>;

  createBranch({
    projectId,
    branchName,
    ref,
  }: {
    projectId: string;
    branchName: string;
    ref: string;
  }): Promise<BranchSchema>;

  createCommit({
    projectId,
    branch,
    commitMessage,
    actions,
  }: {
    projectId: string;
    branch: string;
    commitMessage: string;
    actions: CommitAction[];
  }): Promise<CommitSchema>;

  showBranch({
    projectId,
    branchName,
  }: {
    projectId: string;
    branchName: string;
  }): Promise<BranchSchema>;

  allPipelines({
    projectId,
    options,
  }: {
    projectId: string | number;
    options?: AllPipelinesOptions &
      BasePaginationRequestOptions<"offset"> &
      OffsetPaginationRequestOptions &
      Sudo &
      ShowExpanded<false>;
  }): Promise<PipelineSchema[]>;

  cancelPipeline({
    projectId,
    pipelineId,
  }: {
    projectId: string | number;
    pipelineId: number;
  }): Promise<ExpandedPipelineSchema>;
}
