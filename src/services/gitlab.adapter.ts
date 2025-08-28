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
} from "@gitbeaker/core";
import { Gitlab } from "@gitbeaker/rest";
import type {
  IGitLabAdapter,
  IGitLabContextService,
  ITokenService,
} from "../interfaces";

export class GitLabAdapter implements IGitLabAdapter {
  private gitlab: InstanceType<typeof Gitlab> | null = null;
  private tokenService: ITokenService;
  private gitLabContext: IGitLabContextService;

  constructor(
    tokenService: ITokenService,
    gitLabContext: IGitLabContextService,
  ) {
    this.tokenService = tokenService;
    this.gitLabContext = gitLabContext;
  }

  private getGitLabClient(): InstanceType<typeof Gitlab> {
    if (!this.gitlab) {
      const context = this.gitLabContext.getContext();
      const host = context?.host || "https://gitlab.com";

      this.gitlab = new Gitlab({
        host,
        token: this.tokenService.getToken(),
      });
    }
    return this.gitlab;
  }

  async validateToken(): Promise<void> {
    try {
      await this.getGitLabClient().Users.showCurrentUser();
    } catch (error) {
      throw new Error(`GitLab token validation failed: ${error}`);
    }
  }

  createIssueNote({
    projectId,
    issueIid,
    body,
  }: {
    projectId: string;
    issueIid: string;
    body: string;
  }): Promise<IssueNoteSchema> {
    return this.getGitLabClient().IssueNotes.create(
      projectId,
      parseInt(issueIid, 10),
      body,
    ) as Promise<IssueNoteSchema>;
  }

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
  }): Promise<IssueNoteSchema> {
    return this.getGitLabClient().IssueNotes.edit(
      projectId,
      typeof issueIid === "string" ? parseInt(issueIid, 10) : issueIid,
      typeof noteId === "string" ? parseInt(noteId, 10) : noteId,
      { body },
    ) as Promise<IssueNoteSchema>;
  }

  allIssueNotes({
    projectId,
    issueIid,
  }: {
    projectId: string;
    issueIid: string;
  }): Promise<IssueNoteSchema[]> {
    return this.getGitLabClient().IssueNotes.all(
      projectId,
      parseInt(issueIid, 10),
    ) as Promise<IssueNoteSchema[]>;
  }

  createMergeRequestNote({
    projectId,
    mergeRequestIid,
    body,
  }: {
    projectId: string;
    mergeRequestIid: string;
    body: string;
  }): Promise<MergeRequestNoteSchema> {
    return this.getGitLabClient().MergeRequestNotes.create(
      projectId,
      parseInt(mergeRequestIid, 10),
      body,
    ) as Promise<MergeRequestNoteSchema>;
  }

  allMergeRequestNotes({
    projectId,
    mergeRequestIid,
  }: {
    projectId: string;
    mergeRequestIid: string;
  }): Promise<MergeRequestNoteSchema[]> {
    return this.getGitLabClient().MergeRequestNotes.all(
      projectId,
      parseInt(mergeRequestIid, 10),
    ) as Promise<MergeRequestNoteSchema[]>;
  }

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
  }): Promise<MergeRequestNoteSchema> {
    return this.getGitLabClient().MergeRequestNotes.edit(
      projectId,
      typeof mergeRequestIid === "string"
        ? parseInt(mergeRequestIid, 10)
        : mergeRequestIid,
      typeof noteId === "string" ? parseInt(noteId, 10) : noteId,
      { body },
    ) as Promise<MergeRequestNoteSchema>;
  }

  showMergeRequest({
    projectId,
    mergeRequestIid,
  }: {
    projectId: string;
    mergeRequestIid: string;
  }): Promise<ExpandedMergeRequestSchema> {
    return this.getGitLabClient().MergeRequests.show(
      projectId,
      parseInt(mergeRequestIid, 10),
    ) as Promise<ExpandedMergeRequestSchema>;
  }

  showMergeRequestChanges({
    projectId,
    mergeRequestIid,
  }: {
    projectId: string;
    mergeRequestIid: string;
  }): Promise<MergeRequestChangesSchema> {
    return this.getGitLabClient().MergeRequests.showChanges(
      projectId,
      parseInt(mergeRequestIid, 10),
    ) as Promise<MergeRequestChangesSchema>;
  }

  allMergeRequestDiscussions({
    projectId,
    mergeRequestIid,
  }: {
    projectId: string;
    mergeRequestIid: string;
  }): Promise<DiscussionSchema[]> {
    return this.getGitLabClient().MergeRequestDiscussions.all(
      projectId,
      parseInt(mergeRequestIid, 10),
    ) as Promise<DiscussionSchema[]>;
  }

  createMergeRequestDiscussion({
    projectId,
    mergeRequestIid,
    body,
    options,
  }: {
    projectId: string;
    mergeRequestIid: string;
    body: string;
    options?: {
      position?: DiscussionNotePositionOptions;
      commitId?: string;
      createdAt?: string;
    };
  }): Promise<DiscussionSchema> {
    return this.getGitLabClient().MergeRequestDiscussions.create(
      projectId,
      parseInt(mergeRequestIid, 10),
      body,
      options,
    ) as Promise<DiscussionSchema>;
  }

  showIssue({
    projectId,
    issueIid,
  }: {
    projectId: string;
    issueIid?: string | number;
  }): Promise<IssueSchema> {
    if (!issueIid) {
      throw new Error("Cannot use undefined IssueIid to show Issue details");
    }

    return this.getGitLabClient().Issues.show(
      typeof issueIid === "string" ? parseInt(issueIid, 10) : issueIid,
      { projectId },
    ) as Promise<IssueSchema>;
  }

  async allIssueDiscussions({
    projectId,
    issueIid,
  }: {
    projectId: string;
    issueIid?: string | number;
  }): Promise<DiscussionSchema[]> {
    if (!issueIid) {
      return [];
    }

    return this.getGitLabClient().IssueDiscussions.all(
      projectId,
      typeof issueIid === "string" ? parseInt(issueIid, 10) : issueIid,
    ) as Promise<DiscussionSchema[]>;
  }

  showCurrentUser(): Promise<UserSchema> {
    return this.getGitLabClient().Users.showCurrentUser() as Promise<UserSchema>;
  }

  allUsers(username: string): Promise<SimpleUserSchema[]> {
    return this.getGitLabClient().Users.all({ username }) as Promise<
      SimpleUserSchema[]
    >;
  }

  showProject(projectId: string | number): Promise<ProjectSchema> {
    return this.getGitLabClient().Projects.show(
      projectId,
    ) as Promise<ProjectSchema>;
  }

  getMember({
    projectId,
    userId,
  }: {
    projectId: string;
    userId: number;
  }): Promise<MemberSchema> {
    return this.getGitLabClient().ProjectMembers.show(
      projectId,
      userId,
    ) as Promise<MemberSchema>;
  }

  showRepositoryFile({
    projectId,
    filePath,
    ref,
  }: {
    projectId: string;
    filePath: string;
    ref: string;
  }): Promise<RepositoryFileExpandedSchema> {
    return this.getGitLabClient().RepositoryFiles.show(
      projectId,
      filePath,
      ref,
    ) as Promise<RepositoryFileExpandedSchema>;
  }

  createBranch({
    projectId,
    branchName,
    ref,
  }: {
    projectId: string;
    branchName: string;
    ref: string;
  }): Promise<BranchSchema> {
    return this.getGitLabClient().Branches.create(
      projectId,
      branchName,
      ref,
    ) as Promise<BranchSchema>;
  }

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
  }): Promise<CommitSchema> {
    return this.getGitLabClient().Commits.create(
      projectId,
      branch,
      commitMessage,
      actions,
    ) as Promise<CommitSchema>;
  }

  async showBranch({
    projectId,
    branchName,
  }: {
    projectId: string;
    branchName: string;
  }): Promise<BranchSchema> {
    return this.getGitLabClient().Branches.show(
      projectId,
      branchName,
    ) as Promise<BranchSchema>;
  }

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
  }): Promise<PipelineSchema[]> {
    return this.getGitLabClient().Pipelines.all(projectId, options) as Promise<
      PipelineSchema[]
    >;
  }

  cancelPipeline({
    projectId,
    pipelineId,
  }: {
    projectId: string | number;
    pipelineId: number;
  }): Promise<ExpandedPipelineSchema> {
    return this.getGitLabClient().Pipelines.cancel(
      projectId,
      pipelineId,
    ) as Promise<ExpandedPipelineSchema>;
  }
}
