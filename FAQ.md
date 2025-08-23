# Frequently Asked Questions (FAQ)

This FAQ addresses common questions and gotchas when using Claude Code integration with GitLab.

## Triggering and Authentication

### Why doesn't tagging @claude from my automated workflow work?

GitLab CI/CD workflows can trigger Claude, but ensure you're using the correct authentication method. Use a GitLab Personal Access Token or Project Access Token with appropriate permissions rather than the default CI/CD token for more reliable triggering.

### Why does Claude say I don't have permission to trigger it?

Only users with **Developer permissions** or higher to the repository can trigger Claude. This is a security feature to prevent unauthorized use. Make sure the user commenting has at least Developer access to the GitLab project.

### Why can't I assign @claude to an issue on my repository?

In GitLab, you can only assign issues to project members. Claude needs to be added as a project member (with at least Reporter permissions) to be assignable to issues. Alternatively, you can use mentions in comments instead of assignments.

### Why am I getting authentication errors?

Ensure your GitLab token has the necessary scopes:

- `api` scope for full API access
- `read_user` for user information
- `read_repository` for repository access
- `write_repository` for creating commits and branches

For GitLab CI/CD integration, add the token as a CI/CD variable:

```yaml
variables:
  GITLAB_TOKEN: $CLAUDE_CODE_GL_ACCESS_TOKEN
```

## Claude's Capabilities and Limitations

### Why won't Claude update GitLab CI/CD files when I ask it to?

For security reasons, Claude may be configured to avoid modifying CI/CD configurations that could potentially create unintended consequences. This is a configurable safety feature that can be adjusted based on your security requirements.

### Why won't Claude rebase my branch?

By default, Claude only uses commit tools for non-destructive changes to the branch. Claude is configured to:

- Never push to branches other than where it was invoked (either its own branch or the MR branch)
- Never force push or perform destructive operations

You can grant additional tools via configuration if needed, but use with caution.

### Why won't Claude create a merge request?

Claude doesn't create MRs by default. Instead, it pushes commits to a branch and provides a link to a pre-filled MR creation page. This approach ensures your repository's branch protection rules are still adhered to and gives you final control over MR creation.

### Can Claude see my GitLab CI/CD results?

Yes! Claude can access GitLab CI/CD pipeline runs, job logs, and test results on the MR where it's tagged. This requires appropriate API permissions and token scopes.

Claude can analyze CI failures and help debug pipeline issues. For running tests locally before commits, you can still instruct Claude to do so in your request.

### Why does Claude only update one comment instead of creating new ones?

Claude is configured to update a single comment to avoid cluttering MR/issue discussions. All of Claude's responses, including progress updates and final results, will appear in the same comment with checkboxes showing task progress.

## Branch and Commit Behavior

### Why did Claude create a new branch when commenting on a closed MR?

Claude's branch behavior depends on the context:

- **Open MRs**: Pushes directly to the existing MR branch
- **Closed/Merged MRs**: Creates a new branch (cannot push to closed MR branches)
- **Issues**: Always creates a new branch with a timestamp

### Why are my commits shallow/missing history?

For performance, Claude uses shallow clones:

- MRs: Limited depth for recent commits
- New branches: Minimal history

If you need full history, this can be configured in your GitLab CI/CD setup.

## Configuration and Tools

### What's the difference between `direct_prompt` and `custom_instructions`?

These inputs serve different purposes in how Claude responds:

- **`direct_prompt`**: Bypasses trigger detection entirely. When provided, Claude executes this exact instruction regardless of comments or mentions. Perfect for automated workflows where you want Claude to perform a specific task on every run (e.g., "Update the API documentation based on changes in this MR").

- **`custom_instructions`**: Additional context added to Claude's system prompt while still respecting normal triggers. These instructions modify Claude's behavior but don't replace the triggering comment. Use this to give Claude standing instructions like "Focus on performance implications and suggest optimizations".

### Why doesn't Claude execute my bash commands?

The Bash tool may be **disabled by default** for security. To enable specific bash commands, configure the allowed tools appropriately. Only enable what's necessary for your use case.

### Can Claude work across multiple repositories?

Claude's access is typically sandboxed to the current repository for security. It can read public repositories, but cross-repository operations require explicit configuration and appropriate permissions.

## GitLab Integration Features

### What GitLab features does Claude support?

Claude integrates with various GitLab features:

1. **Merge Requests**: Comments, file changes, diff analysis
2. **Issues**: Comments, descriptions, assignments
3. **Wiki pages**: Content updates and improvements
4. **CI/CD pipelines**: Log analysis and troubleshooting
5. **Repository files**: Reading, editing, and creating files

### How does Claude handle GitLab webhooks?

Claude processes GitLab webhooks in real-time for:

- Issue comments and updates
- Merge request comments and changes
- Pipeline completion events
- Push events (when configured)

## Troubleshooting

### How can I debug what Claude is doing?

Check the GitLab CI/CD pipeline logs or webhook delivery logs in your GitLab project settings for Claude's execution trace.

### Why can't I trigger Claude with `@claude-mention` or `claude!`?

The trigger uses word boundaries, so `@claude` must be a complete word. Variations like `@claude-bot`, `@claude!`, or `claude@mention` won't work unless you customize the trigger phrase in your configuration.

### Why isn't Claude responding to my comments?

Check the following:

1. Ensure Claude is mentioned correctly (`@claude`)
2. Verify your GitLab token has appropriate permissions
3. Check that Claude has access to the repository
4. Ensure webhooks are properly configured
5. Verify the trigger phrase matches your configuration

### How do I configure Claude for self-hosted GitLab?

For self-hosted GitLab instances:

1. Update the GitLab URL in your configuration
2. Ensure your GitLab instance can reach Claude's webhook endpoints
3. Configure appropriate SSL certificates if using HTTPS
4. Set up OAuth applications in your GitLab admin panel

## Best Practices

1. **Use specific GitLab tokens** with minimal required permissions
2. **Store tokens securely** in GitLab CI/CD variables or secrets
3. **Be specific with tool permissions** - only enable what's necessary
4. **Test in a separate branch** before using on important MRs
5. **Monitor Claude's API usage** to avoid hitting rate limits
6. **Review Claude's changes** carefully before merging
7. **Configure branch protection rules** to ensure code review

## Getting Help

If you encounter issues not covered here:

1. Check the GitLab project's issue tracker
2. Review the [GitLab integration documentation](docs/)
3. Check GitLab webhook delivery logs in your project settings
4. Verify your GitLab token permissions and scopes
