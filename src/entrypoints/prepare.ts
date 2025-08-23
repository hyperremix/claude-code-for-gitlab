#!/usr/bin/env bun

/**
 * Prepare the Claude action by checking trigger conditions, verifying human actor,
 * and creating the initial tracking comment
 */

import { parseGitLabWebhookPayload } from "../gitlab/webhook";
import { createProvider, getToken } from "../providers/provider-factory";
import type { SCMProvider } from "../providers/scm-provider";
import { getClaudePromptsDirectory } from "../utils/temp-directory";

async function run() {
  // Debug environment variables related to authentication
  console.log("=== GitLab Environment Variables Debug ===");
  const authVars = [
    "CLAUDE_CODE_GL_ACCESS_TOKEN",
    "CLAUDE_CODE_OAUTH_TOKEN",
    "GITLAB_TOKEN",
    "CI_JOB_TOKEN",
  ];

  authVars.forEach((varName) => {
    const value = process.env[varName];
    if (value) {
      if (value.startsWith("$")) {
        console.log(
          `${varName}: UNEXPANDED ("${value}") - Variable not set in CI/CD settings!`,
        );
      } else {
        console.log(
          `${varName}: Set (length: ${value.length}, prefix: "${value.substring(0, 8)}...")`,
        );
      }
    } else {
      console.log(`${varName}: Not set`);
    }
  });
  console.log("=========================================");

  // Run GitLab logic
  console.log(`platform=gitlab`);
  await runGitLab();
}

async function runGitLab() {
  let provider: SCMProvider | null = null;

  try {
    console.log("Running in GitLab mode");

    // Step 1: Get appropriate token
    const token = getToken();

    // Step 2: Get trigger configuration
    // In GitLab CI, we only use environment variables
    const triggerPhrase = process.env.TRIGGER_PHRASE || "@claude";
    const directPrompt = process.env.DIRECT_PROMPT || "";

    // Step 3: Create provider instance
    provider = createProvider({
      platform: "gitlab",
      token,
      triggerPhrase,
      directPrompt,
    });

    // Step 4: Check write permissions
    console.log("Step 4: Checking write permissions...");
    const context = provider.getContext();
    console.log(`Checking permissions for actor: ${context.actor}`);

    let hasWritePermissions: boolean;
    try {
      hasWritePermissions = await provider.hasWritePermission(context.actor);
      console.log(`Write permissions check result: ${hasWritePermissions}`);
    } catch (error) {
      console.error("Error checking write permissions:", error);
      throw new Error(
        `Failed to check write permissions: ${error instanceof Error ? error.message : error}`,
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
      containsTrigger = await provider.checkTrigger(
        triggerPhrase,
        directPrompt,
      );
      console.log(`Trigger check result: ${containsTrigger}`);
    } catch (error) {
      console.error("Error checking trigger:", error);
      throw new Error(
        `Failed to check trigger: ${error instanceof Error ? error.message : error}`,
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
        isHuman = await provider.isHumanActor(context.actor);
        console.log(`Human actor check result: ${isHuman}`);
      } catch (error) {
        console.error("Error checking human actor:", error);
        throw new Error(
          `Failed to check human actor: ${error instanceof Error ? error.message : error}`,
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
    const jobUrl = provider.getJobUrl();
    const commentBody = `🤖 Claude is working on this...

[View job details](${jobUrl})

---
- [ ] Setting up workspace
- [ ] Analyzing request  
- [ ] Implementing changes
- [ ] Running tests`;

    let commentId: number;
    try {
      commentId = await provider.createComment(commentBody);
      console.log(`Created comment with ID: ${commentId}`);
    } catch (error) {
      console.error("Error creating comment:", error);
      throw new Error(
        `Failed to create comment: ${error instanceof Error ? error.message : error}`,
      );
    }

    // Output comment ID for later use
    if (process.env.GITHUB_OUTPUT) {
      const fs = await import("fs");
      fs.appendFileSync(
        process.env.GITHUB_OUTPUT,
        `claude_comment_id=${commentId}\n`,
      );
    }

    // Also set as environment variable for GitLab
    process.env.CLAUDE_COMMENT_ID = commentId.toString();

    // For GitLab, write to a file that can be read by the parent process
    const fileSystem = await import("fs");
    fileSystem.writeFileSync(
      "/tmp/claude-comment-id.txt",
      commentId.toString(),
    );

    // Step 8: GitLab-specific setup
    console.log("Step 8: GitLab-specific setup - creating prompt for Claude");

    // Configure git for GitLab
    console.log("Step 8a: Configuring git authentication...");
    try {
      await provider.setupGitAuth(token);
      console.log("Git authentication configured successfully");
    } catch (error) {
      console.error("Error configuring git auth:", error);
      throw new Error(
        `Failed to configure git auth: ${error instanceof Error ? error.message : error}`,
      );
    }

    // Fetch context data
    console.log("Step 8b: Fetching context data...");
    let contextData: any;
    try {
      contextData = await provider.fetchContextData();
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
        `Failed to fetch context data: ${error instanceof Error ? error.message : error}`,
      );
    }

    // Create prompt directory
    const promptDir = getClaudePromptsDirectory();

    // Extract trigger comment from webhook payload
    let triggerComment = "";
    const webhookPayload = parseGitLabWebhookPayload();
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
**Source Branch:** ${contextData.sourceBranch} → **Target Branch:** ${contextData.targetBranch}
**State:** ${contextData.state}
**Author:** ${contextData.author.name} (@${contextData.author.username})
**Web URL:** ${contextData.webUrl}

## Code Changes

${
  contextData.changes
    ?.map(
      (change: any) => `
### ${change.new_file ? "📄 New File" : change.deleted_file ? "🗑️ Deleted File" : change.renamed_file ? "📝 Renamed File" : "✏️ Modified File"}: \`${change.new_path}\`

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

${directPrompt || "Please analyze this merge request and provide feedback on code quality, potential issues, and suggestions for improvement."}

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

    // Write prompt file
    const fs = await import("fs");
    await fs.promises.writeFile(`${promptDir}/claude-prompt.txt`, prompt);
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Prepare step failed with error: ${errorMessage}`);

    // Output error for GitLab CI
    console.log(`prepare_error=${errorMessage}`);

    // Try to update comment with error if we have a provider and comment ID
    if (provider && process.env.CLAUDE_COMMENT_ID) {
      try {
        await provider.updateComment(
          parseInt(process.env.CLAUDE_COMMENT_ID),
          `❌ Failed to prepare: ${errorMessage}`,
        );
      } catch (updateError) {
        console.error("Failed to update comment with error:", updateError);
      }
    }

    process.exit(1);
  }
}

if (import.meta.main) {
  run();
}
