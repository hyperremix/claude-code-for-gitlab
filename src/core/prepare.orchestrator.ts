import type {
  IEnvironmentService,
  IFileSystemService,
  IGitLabContextService,
  IGitLabService,
  ITempDirectoryService,
} from "../interfaces";
import { EnvVar } from "../types";

export class PrepareEntrypointOrchestrator {
  constructor(
    private environment: IEnvironmentService,
    private fileSystem: IFileSystemService,
    private tempDirectory: ITempDirectoryService,
    private gitLabContext: IGitLabContextService,
    private gitLabService: IGitLabService,
  ) {}

  async run(): Promise<void> {
    try {
      console.log("Running in GitLab mode");

      // Step 2: Get trigger configuration
      // In GitLab CI, we only use environment variables
      const triggerPhrase =
        this.environment.get(EnvVar.TRIGGER_PHRASE) || "@claude";
      const directPrompt = this.environment.get(EnvVar.DIRECT_PROMPT) || "";

      // Step 4: Check write permissions
      console.log("Step 4: Checking write permissions...");
      const context = this.gitLabService.getContext();
      console.log(`Checking permissions for actor: ${context.actor}`);

      let hasWritePermissions: boolean;
      try {
        hasWritePermissions = await this.gitLabService.hasWritePermission(
          context.actor,
        );
        console.log(`Write permissions check result: ${hasWritePermissions}`);
      } catch (error) {
        console.error("Error checking write permissions:", error);
        throw new Error(
          `Failed to check write permissions: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }

      if (!hasWritePermissions) {
        throw new Error(
          "Actor does not have write permissions to the repository",
        );
      }

      // Step 5: Check trigger conditions
      console.log("Step 5: Checking trigger conditions...");
      let containsTrigger: boolean;
      try {
        containsTrigger = await this.gitLabService.checkTrigger(
          triggerPhrase,
          directPrompt,
        );
        console.log(`Trigger check result: ${containsTrigger}`);
      } catch (error) {
        console.error("Error checking trigger:", error);
        throw new Error(
          `Failed to check trigger: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }

      if (!containsTrigger) {
        console.log("No trigger found, skipping remaining steps");
        return;
      }

      // Step 6: Check if actor is human (skip for direct prompts)
      if (!directPrompt) {
        console.log("Step 6: Checking if actor is human...");
        let isHuman: boolean;
        try {
          isHuman = await this.gitLabService.isHumanActor(context.actor);
          console.log(`Human actor check result: ${isHuman}`);
        } catch (error) {
          console.error("Error checking human actor:", error);
          throw new Error(
            `Failed to check human actor: ${
              error instanceof Error ? error.message : error
            }`,
          );
        }
        if (!isHuman) {
          throw new Error("Actor is not a human user");
        }
      } else {
        console.log(
          "Step 6: Skipping human actor check (direct prompt provided)",
        );
      }

      // Step 7: Create initial tracking comment
      console.log("Step 7: Creating initial tracking comment...");
      const jobUrl = this.gitLabService.getJobUrl();
      const commentBody = `🤖 Claude is working on this...

[View job details](${jobUrl})

---
- [ ] Setting up workspace
- [ ] Analyzing request  
- [ ] Implementing changes
- [ ] Running tests`;

      let commentId: number;
      try {
        commentId = await this.gitLabService.createComment(commentBody);
        console.log(`Created comment with ID: ${commentId}`);
      } catch (error) {
        console.error("Error creating comment:", error);
        throw new Error(
          `Failed to create comment: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }

      // Output comment ID for later use
      const githubOutput = this.environment.get(EnvVar.GITHUB_OUTPUT);
      if (githubOutput) {
        this.fileSystem.appendFileSync(
          githubOutput,
          `claude_comment_id=${commentId}\n`,
        );
      }

      // Also set as environment variable for GitLab
      this.environment.set(EnvVar.CLAUDE_COMMENT_ID, commentId.toString());

      // For GitLab, write to a file that can be read by the parent process
      this.fileSystem.writeFileSync(
        "/tmp/claude-comment-id.txt",
        commentId.toString(),
      );

      // Step 8: GitLab-specific setup
      console.log("Step 8: GitLab-specific setup - creating prompt for Claude");

      // Configure git for GitLab
      console.log("Step 8a: Configuring git authentication...");
      try {
        await this.gitLabService.setupGitAuth();
        console.log("Git authentication configured successfully");
      } catch (error) {
        console.error("Error configuring git auth:", error);
        throw new Error(
          `Failed to configure git auth: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }

      // Fetch context data
      console.log("Step 8b: Fetching context data...");
      let contextData: any;
      try {
        contextData = await this.gitLabService.fetchContextData();
        console.log("Context data fetched successfully");
        console.log("Context data type:", {
          hasIid: !!contextData.iid,
          hasTitle: !!contextData.title,
          hasProjectId: !!contextData.projectId,
          contextKeys: Object.keys(contextData),
        });
      } catch (error) {
        console.error("Error fetching context data:", error);
        throw new Error(
          `Failed to fetch context data: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }

      // Create prompt directory
      const promptDir = this.tempDirectory.getClaudePromptsDirectory();

      // Extract trigger comment from webhook payload
      let triggerComment = "";
      const webhookPayload = this.gitLabContext.parseWebhookPayload();
      if (webhookPayload?.object_kind === "note") {
        triggerComment = webhookPayload.object_attributes?.note || "";
        console.log("Found trigger comment from webhook:", triggerComment);
      } else if (webhookPayload?.object_kind === "issue") {
        // For issue events, the trigger might be in the description
        const issue = webhookPayload.issue || webhookPayload.object_attributes;
        if (issue?.description) {
          triggerComment = issue.description;
          console.log("Found trigger in issue description:", triggerComment);
        }
      } else if (webhookPayload?.object_kind === "merge_request") {
        // For MR events, check description
        const mr =
          webhookPayload.merge_request || webhookPayload.object_attributes;
        if (mr?.description) {
          triggerComment = mr.description;
          console.log("Found trigger in MR description:", triggerComment);
        }
      }

      // Generate prompt based on context
      let prompt = "";

      if (context.isPR && contextData.iid) {
        // Merge request context
        prompt = `You are Claude, an AI assistant helping with GitLab merge requests.

## Merge Request Context

**Title:** ${contextData.title}
**Description:** ${contextData.description || "No description provided"}
**Source Branch:** ${contextData.sourceBranch} → **Target Branch:** ${
          contextData.targetBranch
        }
**State:** ${contextData.state}
**Author:** ${contextData.author.name} (@${contextData.author.username})
**Web URL:** ${contextData.webUrl}

## Code Changes

${
  contextData.changes
    ?.map(
      (change: any) => `
### ${
        change.new_file
          ? "📄 New File"
          : change.deleted_file
            ? "🗑️ Deleted File"
            : change.renamed_file
              ? "📝 Renamed File"
              : "✏️ Modified File"
      }: \`${change.new_path}\`

\`\`\`diff
${change.diff}
\`\`\`
`,
    )
    .join("\n") || "No changes available"
}

## Existing Comments/Discussions

${
  contextData.discussions?.length > 0
    ? contextData.discussions
        .map((discussion: any) =>
          discussion.notes
            .map(
              (note: any) => `
**${note.author.name}** (${note.created_at}):
${note.body}
`,
            )
            .join("\n"),
        )
        .join("\n---\n")
    : "No existing comments"
}

## Your Task

${triggerComment ? `The user mentioned you with: "${triggerComment}"` : ""}

${
  directPrompt ||
  "Please analyze this merge request and provide feedback on code quality, potential issues, and suggestions for improvement."
}

When providing feedback, be specific and reference exact line numbers and file paths.`;
      } else if (contextData.iid && contextData.state) {
        // Issue context
        prompt = `You are Claude, an AI assistant helping with GitLab issues.

## Issue Context

**Title:** ${contextData.title}
**Description:** ${contextData.description || "No description provided"}
**State:** ${contextData.state}
**Author:** ${contextData.author.name} (@${contextData.author.username})
**Web URL:** ${contextData.webUrl}
**Labels:** ${contextData.labels?.join(", ") || "None"}

## Existing Comments/Discussions

${
  contextData.discussions?.length > 0
    ? contextData.discussions
        .map((discussion: any) =>
          discussion.notes
            .map(
              (note: any) => `
**${note.author.name}** (${note.created_at}):
${note.body}
`,
            )
            .join("\n"),
        )
        .join("\n---\n")
    : "No existing comments"
}

## Your Task

${triggerComment ? `The user mentioned you with: "${triggerComment}"` : ""}

${directPrompt || "Please analyze this issue and help with the requested task."}

When providing assistance, be specific and reference the issue context.`;
      } else {
        // Manual trigger or webhook without specific context
        prompt = `You are Claude, an AI assistant helping with GitLab projects.

## Project Context

**Project ID:** ${contextData.projectId || "Unknown"}
**Host:** ${contextData.host || "Unknown"}
**User:** ${contextData.userName || "Unknown"}

## Your Task

${triggerComment ? `The user mentioned you with: "${triggerComment}"` : ""}

${directPrompt || "Please help with the requested task."}`;
      }

      // Write prompt file=
      await this.fileSystem.writeFile(`${promptDir}/claude-prompt.txt`, prompt);
      console.log("✅ Created prompt file for Claude");
      console.log(`Prompt file size: ${prompt.length} bytes`);
      console.log("Prompt preview (first 500 chars):");
      console.log(prompt.substring(0, 500));
      if (prompt.length > 500) {
        console.log("... (truncated)");
      }

      // GitLab doesn't need MCP config for now
      console.log("mcp_config=");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Prepare step failed with error: ${errorMessage}`);

      // Output error for GitLab CI
      console.log(`prepare_error=${errorMessage}`);

      // Try to update comment with error if we have a provider and comment ID
      const commentId = this.environment.get(EnvVar.CLAUDE_COMMENT_ID);
      if (commentId) {
        try {
          await this.gitLabService.updateComment({
            commentId,
            body: `❌ Failed to prepare: ${errorMessage}`,
          });
        } catch (updateError) {
          console.error("Failed to update comment with error:", updateError);
        }
      }

      process.exit(1);
    }
  }
}
