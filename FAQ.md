# Frequently Asked Questions (FAQ)

This FAQ addresses common questions and gotchas when using the Claude Code webhook server with GitLab.

## Webhook Server Setup

### How do I deploy the webhook server?

The easiest way is using Docker:

```bash
docker run -d \
  --name gitlab-claude-webhook \
  -p 3000:3000 \
  -e GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx \
  -e WEBHOOK_SECRET=your-webhook-secret-here \
  ghcr.io/hyperremix/claude-code-gitlab-app:latest
```

See the [webhook server README](gitlab-app/README.md) for detailed setup instructions.

### Why doesn't @claude respond when I mention it?

Check the following:

1. **Webhook Configuration**: Ensure the webhook is configured in GitLab pointing to your server at `/webhook`
2. **Secret Token**: Verify the webhook secret matches your `WEBHOOK_SECRET` environment variable
3. **Server Running**: Check that your webhook server is running and accessible
4. **Permissions**: Ensure the user has Developer permissions or higher
5. **Rate Limiting**: Check if you've hit the rate limit (3 triggers per 15 minutes per user/resource)

### Why am I getting authentication errors from the webhook server?

Ensure your GitLab token has the necessary scopes:

- `api` scope for full API access
- `read_user` for user information  
- `read_repository` for repository access
- `write_repository` for creating commits and branches

The webhook server uses this token to trigger pipelines and create branches.

## Claude's Capabilities and Limitations

### Why won't Claude update GitLab CI/CD files when I ask it to?

For security reasons, Claude may be configured to avoid modifying CI/CD configurations that could potentially create unintended consequences. This is a configurable safety feature that can be adjusted based on your security requirements.

### Can Claude see my GitLab CI/CD results?

Yes! When triggered via webhook, Claude executes in a pipeline that can access GitLab CI/CD pipeline runs, job logs, and test results. The webhook server provides context about the triggering event through environment variables.

Claude can analyze CI failures and help debug pipeline issues when executed in this context.

### Why does Claude only update one comment instead of creating new ones?

Claude is configured to update a single comment to avoid cluttering MR/issue discussions. All of Claude's responses, including progress updates and final results, will appear in the same comment with checkboxes showing task progress.

### What happens when Claude is triggered from an issue vs merge request?

- **Issues**: The webhook server automatically creates a new branch for Claude's work
- **Merge Requests**: Claude works on the existing MR branch
- **Branch Protection**: Claude never executes on protected branches like main/master

## Branch and Commit Behavior

### Why did Claude create a new branch when commenting on an issue?

The webhook server automatically creates a new branch for all issue triggers using the format `claude/issue-{IID}-{sanitized-title}-{timestamp}`. This ensures:

- Each Claude execution has its own isolated branch
- Protected branches remain safe from automated changes
- Unique branch names prevent conflicts

### Why are my commits shallow/missing history?

For performance, Claude uses shallow clones in the CI/CD pipeline. This provides only recent commit history. If you need full history, this can be configured in your pipeline's git clone settings.

## Configuration and Tools

### How does the webhook server pass information to Claude?

The webhook server sets environment variables that are available in the triggered pipeline:

- `CLAUDE_TRIGGER`: Always "true" when triggered by webhook
- `CLAUDE_AUTHOR`: Username who mentioned @claude
- `CLAUDE_RESOURCE_TYPE`: "merge_request" or "issue"
- `CLAUDE_RESOURCE_ID`: MR/Issue IID
- `CLAUDE_NOTE`: The full comment text
- `DIRECT_PROMPT`: Text after the @claude mention

### Can I customize the trigger phrase?

Yes! Set the `TRIGGER_PHRASE` environment variable in your webhook server deployment to use something other than "@claude".

### Can Claude work across multiple repositories?

The webhook server can be configured with webhooks across multiple projects. Each project needs its own pipeline configuration to handle Claude execution.

## GitLab Integration Features

### What GitLab features does Claude support?

The webhook server integrates with GitLab webhooks to trigger Claude execution for:

1. **Issue Comments**: @claude mentions in issue discussions
2. **Merge Request Comments**: @claude mentions in MR discussions
3. **Automatic Branch Creation**: For issue-triggered workflows
4. **Pipeline Triggering**: Starts CI/CD pipelines with context variables
5. **Rate Limiting**: Prevents abuse with configurable limits

### How does the webhook server handle GitLab events?

The webhook server listens for "Note Hook" events (comments) and:

1. **Validates** the webhook secret for security
2. **Checks** for @claude mentions in the comment
3. **Applies** rate limiting (3 triggers per user per resource per 15 minutes)
4. **Creates** branches automatically for issue triggers
5. **Triggers** CI/CD pipelines with environment variables
6. **Cancels** older pending pipelines to prevent conflicts

## Troubleshooting

### How can I debug webhook server issues?

1. **Check server logs**: Use `docker logs gitlab-claude-webhook` to see server output
2. **Verify webhook delivery**: Go to GitLab project settings > Webhooks > Recent events
3. **Check pipeline logs**: Look at the triggered CI/CD pipeline logs for Claude execution details
4. **Test webhook endpoint**: Ensure your server is accessible at `/webhook`

### Why can't I trigger Claude with `@claude-mention` or `claude!`?

The trigger uses word boundaries, so `@claude` must be a complete word. Variations like `@claude-bot`, `@claude!`, or `claude@mention` won't work unless you customize the `TRIGGER_PHRASE` environment variable.

### Why isn't Claude responding to my comments?

Check the following:

1. **Webhook server running**: Ensure the Docker container is running
2. **Webhook configured**: Verify the webhook URL points to your server
3. **Secret token matches**: Check `WEBHOOK_SECRET` matches GitLab webhook settings
4. **Correct mention**: Use `@claude` exactly (or your custom trigger phrase)
5. **Rate limiting**: Check if you've exceeded 3 triggers per 15 minutes
6. **Token permissions**: Verify your GitLab token has `api` scope

### How do I configure the webhook server for self-hosted GitLab?

For self-hosted GitLab instances:

1. Set `GITLAB_URL` environment variable to your GitLab instance URL
2. Use a personal access token from your GitLab instance
3. Ensure your GitLab instance can reach the webhook server endpoint
4. Configure appropriate SSL certificates if using HTTPS

## Best Practices

1. **Deploy webhook server reliably** - Use proper hosting with health checks
2. **Use specific GitLab tokens** with minimal required permissions (`api` scope)
3. **Store secrets securely** - Never expose webhook secrets or tokens
4. **Configure rate limiting** appropriately for your team size
5. **Monitor webhook server logs** for errors and performance
6. **Test in development** before deploying to production
7. **Configure branch protection rules** to ensure code review
8. **Use Discord notifications** to monitor webhook server activity

## Getting Help

If you encounter issues not covered here:

1. Check the [main project repository](https://github.com/hyperremix/claude-code-for-gitlab) issue tracker
2. Review the [webhook server documentation](gitlab-app/README.md)
3. Check GitLab webhook delivery logs in your project settings
4. Verify your webhook server logs with `docker logs`
5. Ensure your GitLab token has proper permissions and scopes
