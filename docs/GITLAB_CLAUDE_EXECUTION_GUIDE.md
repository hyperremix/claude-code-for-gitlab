# Claude Code Webhook Execution Guide

This guide explains how Claude Code executes when triggered via the webhook server in GitLab pipelines.

## Overview

The webhook-only architecture provides a streamlined execution flow:

1. **Webhook Trigger** - User mentions @claude in GitLab issue/MR comment
2. **Server Processing** - Webhook server validates, creates branches, and triggers pipeline
3. **Pipeline Execution** - GitLab CI/CD runs Claude Code with provided context
4. **Result Handling** - Claude's output is posted back to GitLab

## Execution Flow

### Step 1: Webhook Event Processing

When a user mentions @claude in a comment:

1. GitLab sends webhook event to your webhook server
2. Server validates the webhook secret and checks for @claude mention
3. Server applies rate limiting (3 triggers per user per resource per 15 minutes)
4. For issues: Server creates a new branch automatically
5. Server triggers GitLab pipeline with environment variables

### Step 2: Pipeline Execution

The triggered pipeline receives these environment variables:

```yaml
# Environment variables set by webhook server
CLAUDE_TRIGGER=true                    # Indicates webhook trigger
CLAUDE_AUTHOR=username                 # User who mentioned @claude
CLAUDE_RESOURCE_TYPE=issue             # "issue" or "merge_request"
CLAUDE_RESOURCE_ID=123                 # Issue/MR IID
CLAUDE_NOTE=@claude please help        # Full comment text
DIRECT_PROMPT=please help              # Text after @claude
TRIGGER_PHRASE=@claude                 # Trigger phrase used
CLAUDE_PROJECT_PATH=group/project      # Project namespace/path
GITLAB_WEBHOOK_PAYLOAD={"object_kind":"note",...}  # Full JSON payload
```

### Step 3: Claude Code Execution

Your pipeline configuration should use the unified entrypoint:

```yaml
workflow:
  rules:
    - if: $CLAUDE_TRIGGER == "true"

claude:
  stage: claude
  image: oven/bun:1.1.29-alpine
  before_script:
    - apk add --no-cache git curl
    - git config --global user.name "Claude[bot]"
    - git config --global user.email "claude-bot@noreply.gitlab.com"
    - git clone https://github.com/hyperremix/claude-code-for-gitlab.git /tmp/claude-code
    - cd /tmp/claude-code && bun install --frozen-lockfile
  script:
    - cd /tmp/claude-code && bun run src/entrypoints/gitlab_entrypoint.ts
  variables:
    GITLAB_TOKEN: $CLAUDE_CODE_GL_ACCESS_TOKEN
    CLAUDE_CODE_OAUTH_TOKEN: $CLAUDE_CODE_OAUTH_TOKEN
  timeout: 30m
  interruptible: true
```

### Step 4: Result Processing

After Claude Code execution:

1. **With Code Changes**: Creates merge request with Claude's changes
2. **Without Code Changes**: Posts Claude's response as comment on original issue/MR
3. **Error Handling**: Posts error messages and troubleshooting information

## Required CI/CD Variables

Set these variables in your GitLab project's CI/CD settings:

### Required Variables

1. **CLAUDE_CODE_GL_ACCESS_TOKEN** - Your GitLab Personal Access Token
   - Go to GitLab → User Settings → Access Tokens
   - Create token with `api`, `read_repository`, `write_repository` scopes
   - Add to CI/CD variables (Settings → CI/CD → Variables)

2. **CLAUDE_CODE_OAUTH_TOKEN** - Your Claude Code OAuth token
   - Generate with `claude auth login` locally (for Pro/Max users)
   - Or use `ANTHROPIC_API_KEY` instead for direct API access

### Optional Variables

- **CLAUDE_MODEL** - Specify Claude model (default: "sonnet")
- **CLAUDE_MAX_TOKENS** - Limit response length
- **CUSTOM_INSTRUCTIONS** - Additional instructions for Claude

## Branch Behavior

### Issue Comments

When @claude is mentioned in an issue:

1. **Automatic Branch Creation**: Format `claude/issue-{IID}-{sanitized-title}-{timestamp}`
2. **Unique Names**: Timestamps prevent conflicts
3. **Safe Execution**: Never executes on main/protected branches
4. **MR Creation**: Creates merge request if Claude makes changes

### Merge Request Comments

When @claude is mentioned in an MR:

1. **Existing Branch**: Uses the MR's source branch
2. **Direct Commits**: Pushes changes directly to the MR branch
3. **Comment Updates**: Updates the MR with results

## Authentication Flow

The execution uses GitLab CI/CD authentication:

1. **Git Configuration**: Sets up Claude[bot] as the committer
2. **Remote Authentication**: Uses `CI_JOB_TOKEN` for git operations
3. **API Authentication**: Uses `CLAUDE_CODE_GL_ACCESS_TOKEN` for GitLab API calls
4. **Claude Authentication**: Uses OAuth token or API key for Claude API

## Error Handling

Common execution errors and solutions:

### Authentication Errors

```
ERROR: CLAUDE_CODE_GL_ACCESS_TOKEN appears to be unexpanded
```

**Solution**: Ensure the token is set in GitLab CI/CD variables, not just in the webhook server.

### Branch Creation Failures

```
ERROR: Failed to create branch
```

**Solution**:

- Verify GitLab token has `write_repository` scope
- Check project permissions for the token user
- Ensure branch protection rules allow the webhook user

### Claude API Errors

```
ERROR: Claude API authentication failed
```

**Solution**:

- Verify `CLAUDE_CODE_OAUTH_TOKEN` or `ANTHROPIC_API_KEY` is set
- Check token hasn't expired
- Ensure sufficient API credits/quota

## Debugging

### Check Webhook Server Logs

```bash
# View webhook server logs
docker logs -f gitlab-claude-webhook

# Check for trigger events
docker logs gitlab-claude-webhook | grep "Pipeline triggered"
```

### Check Pipeline Logs

1. Go to GitLab project → CI/CD → Pipelines
2. Find the triggered pipeline (should have `CLAUDE_TRIGGER=true`)
3. View job logs for execution details
4. Look for environment variable debug output

### Verify Environment Variables

The execution includes debugging output:

```
=== Webhook Environment Variables ===
CLAUDE_TRIGGER: true
CLAUDE_AUTHOR: username
CLAUDE_RESOURCE_TYPE: issue
CLAUDE_RESOURCE_ID: 123
=== GitLab Token Debug ===
CLAUDE_CODE_GL_ACCESS_TOKEN: Set (length: 42, prefix: "glpat-XX...")
```

## Performance Considerations

### Pipeline Optimization

- **Shallow Clones**: Use shallow git clones for faster checkout
- **Cache Dependencies**: Cache bun/npm installations between runs
- **Parallel Jobs**: Consider splitting large tasks across multiple jobs
- **Timeout Settings**: Set appropriate timeouts (default 30m)

### Resource Limits

```yaml
claude:
  # Optimize for performance
  variables:
    GIT_DEPTH: 1                    # Shallow clone
    GIT_STRATEGY: clone             # Fresh clone each time
  cache:
    key: claude-deps-${CI_COMMIT_REF_SLUG}
    paths:
      - /tmp/claude-code/node_modules/
  # Set resource limits if needed
  # resource_group: claude-execution  # Limit concurrent executions
```

## Best Practices

1. **Token Security**: Store tokens in GitLab CI/CD variables, mark as protected/masked
2. **Branch Protection**: Use branch protection rules to require reviews for main branches
3. **Monitoring**: Monitor pipeline execution times and failure rates
4. **Rate Limiting**: Respect webhook server rate limits (3 per 15 minutes)
5. **Error Recovery**: Implement retry logic for transient failures
6. **Testing**: Test webhook integration in staging environment first

## Troubleshooting Common Issues

### Pipeline Doesn't Start

1. **Check webhook server**: Ensure it's running and accessible
2. **Verify trigger**: Confirm `CLAUDE_TRIGGER=true` environment variable
3. **Check permissions**: Ensure user has Developer+ access to project
4. **Rate limiting**: Wait if rate limit exceeded

### Claude Doesn't Execute

1. **Check entrypoint**: Ensure using `gitlab_entrypoint.ts`
2. **Verify tokens**: Check both GitLab and Claude tokens are valid
3. **Review logs**: Look for authentication or permission errors
4. **Test locally**: Try running Claude Code locally with same environment

### Results Not Posted

1. **Check GitLab token**: Ensure it has `api` scope for comment posting
2. **Verify permissions**: Token user needs access to post comments
3. **Review API limits**: Check if hitting GitLab API rate limits
4. **Check logs**: Look for specific error messages in pipeline output

## Migration from Direct CI/CD

If migrating from direct CI/CD execution:

1. **Remove old workflows**: Delete direct execution pipeline configurations
2. **Deploy webhook server**: Follow the [webhook setup guide](GITLAB_APP_SETUP.md)
3. **Update pipelines**: Use webhook-triggered configuration shown above
4. **Test thoroughly**: Verify @claude mentions trigger correctly
5. **Monitor**: Watch for any integration issues during migration

## Support

For execution-specific issues:

- Review pipeline logs in GitLab CI/CD
- Check webhook server logs for trigger events
- Verify token permissions and scopes
- Test webhook delivery in GitLab settings
- Monitor rate limiting and authentication status
