import type { SDKMessage } from "@anthropic-ai/claude-code";
import type { IssueNoteSchema, MergeRequestNoteSchema } from "@gitbeaker/rest";
import type {
  IEnvironmentService,
  IFileSystemService,
  IGitLabAdapter,
} from "../interfaces";
import { EnvVar } from "../types";

export class UpdateCommentGitLabOrchestrator {
  constructor(
    private environment: IEnvironmentService,
    private fileSystem: IFileSystemService,
    private gitLabAdapter: IGitLabAdapter,
  ) {}

  async run(): Promise<void> {
    const commentId = parseInt(
      this.environment.get(EnvVar.CLAUDE_COMMENT_ID) || "",
      10,
    );
    if (Number.isNaN(commentId)) {
      throw new Error("CLAUDE_COMMENT_ID env var is not a valid number.");
    }

    // Get GitLab context from environment
    const projectId = this.environment.get(EnvVar.CI_PROJECT_ID);
    const mrIid = this.environment.get(EnvVar.CI_MERGE_REQUEST_IID);
    const issueIid =
      this.environment.get(EnvVar.CI_ISSUE_IID) ||
      this.environment.get(EnvVar.CLAUDE_RESOURCE_ID);
    const gitlabHost =
      this.environment.get(EnvVar.CI_SERVER_URL) || "https://gitlab.com";
    const gitlabToken =
      this.environment.get(EnvVar.CLAUDE_CODE_GL_ACCESS_TOKEN) ||
      this.environment.get(EnvVar.CLAUDE_CODE_OAUTH_TOKEN) ||
      this.environment.get(EnvVar.GITLAB_TOKEN);

    if (!projectId || (!mrIid && !issueIid) || !gitlabToken) {
      throw new Error("Missing required GitLab environment variables");
    }

    // Determine overall success/failure state
    const prepareSuccess =
      this.environment.get(EnvVar.PREPARE_SUCCESS) !== "false";
    const claudeSuccess =
      this.environment.get(EnvVar.CLAUDE_SUCCESS) !== "false";
    const actionSucceeded = prepareSuccess && claudeSuccess;
    const errorDetails = this.environment.get(EnvVar.PREPARE_ERROR);

    // Get execution details from the Claude Code SDK output file
    const executionDetails = await this.getExecutionDetails();

    try {
      let notes: (MergeRequestNoteSchema | IssueNoteSchema)[];
      let resourceType: string;
      let resourceIid: number;

      if (mrIid) {
        // Merge request context
        notes = await this.gitLabAdapter.allMergeRequestNotes({
          projectId,
          mergeRequestIid: mrIid,
        });
        resourceType = "merge request";
        resourceIid = parseInt(mrIid, 10);
      } else if (issueIid) {
        // Issue context
        notes = await this.gitLabAdapter.allIssueNotes({ projectId, issueIid });
        resourceType = "issue";
        resourceIid = parseInt(issueIid, 10);
      } else {
        throw new Error("No merge request or issue context found");
      }

      const originalComment = notes.find((note) => note.id === commentId);
      if (!originalComment) {
        throw new Error(`Could not find GitLab note ID ${commentId}`);
      }

      // Get job URL
      const pipelineId = this.environment.get(EnvVar.CI_PIPELINE_ID);
      const jobUrl = pipelineId
        ? `${gitlabHost}/${projectId}/-/pipelines/${pipelineId}`
        : `${gitlabHost}/${projectId}/-/pipelines`;

      const updatedBody = this.formatGitLabCommentBody(
        originalComment.body,
        actionSucceeded,
        jobUrl,
        errorDetails,
        executionDetails,
      );

      // Update the comment
      if (mrIid) {
        await this.gitLabAdapter.editMergeRequestNote({
          projectId,
          mergeRequestIid: resourceIid,
          noteId: commentId,
          body: updatedBody,
        });
      } else {
        await this.gitLabAdapter.editIssueNote({
          projectId,
          issueIid: resourceIid,
          noteId: commentId,
          body: updatedBody,
        });
      }

      console.log(`✅ Updated GitLab ${resourceType} note ${commentId}.`);
    } catch (error) {
      throw new Error(`Failed to fetch or update comment: ${error}`);
    }
  }

  /**
   * Parses the execution output file from the Claude Code SDK.
   * Note: This could be refactored into a shared utility with the GitHub version.
   */
  async getExecutionDetails(): Promise<{
    cost_usd?: number;
    duration_ms?: number;
  } | null> {
    const outputFile = this.environment.get(EnvVar.OUTPUT_FILE);
    if (!outputFile) return null;
    try {
      const fileContent = await this.fileSystem.readFile(outputFile, "utf8");
      const outputData = JSON.parse(fileContent) as SDKMessage[];

      const result = outputData.find(
        (msg): msg is Extract<SDKMessage, { type: "result" }> =>
          msg.type === "result",
      );

      if (result && "cost_usd" in result && "duration_ms" in result) {
        return {
          cost_usd: result.cost_usd as number,
          duration_ms: result.duration_ms as number,
        };
      }
    } catch (error) {
      console.warn(`Error reading or parsing output file: ${error}`);
    }
    return null;
  }

  /**
   * Formats the final comment body for a GitLab merge request note.
   */
  formatGitLabCommentBody(
    initialBody: string,
    success: boolean,
    jobUrl: string,
    errorDetails?: string,
    executionDetails?: { cost_usd?: number; duration_ms?: number } | null,
  ): string {
    const statusMessage = success
      ? "✅ Claude's work is complete"
      : "❌ Claude's work failed";

    let finalBody = initialBody.replace(
      /🤖 Claude is working on this\.\.\./,
      statusMessage,
    );

    // Check off all items in the markdown task list
    finalBody = finalBody.replace(/- \[ \] /g, "- [x] ");

    // Ensure the job link is present
    if (!finalBody.includes(jobUrl)) {
      finalBody += `\n\n[View job details](${jobUrl})`;
    }

    if (errorDetails) {
      finalBody += `\n\n**Error:** \`${errorDetails}\``;
    }

    if (executionDetails) {
      const durationSec = (executionDetails.duration_ms ?? 0) / 1000;
      const cost = executionDetails.cost_usd?.toFixed(4) ?? "0.0000";
      finalBody += `\n\n---\n*Execution time: ${durationSec.toFixed(
        2,
      )}s | Estimated cost: $${cost}*`;
    }

    return finalBody;
  }
}
