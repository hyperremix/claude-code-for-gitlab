# GitLab Webhook-Triggered Execution

This document explains how the unified entrypoint (`gitlab_entrypoint.ts`) handles webhook-triggered Claude Code execution in GitLab CI/CD pipelines.

## Overview

The unified entrypoint provides a streamlined execution flow for webhook-triggered Claude Code execution. When the webhook server triggers a GitLab pipeline, the entrypoint handles all phases of execution:

1. **Prepare Phase** - Validates webhook context and sets up environment
2. **Execute Phase** - Runs Claude Code with provided context
3. **Update Phase** - Posts results back to GitLab (MR creation or comment posting)

## Webhook Integration

### Trigger Flow

1. User mentions @claude in GitLab issue/MR comment
2. Webhook server receives GitLab webhook event
3. Server validates, creates branches (for issues), and triggers pipeline
4. Pipeline runs with webhook-provided environment variables
5. Unified entrypoint processes the webhook context and executes Claude

### Environment Variables

The webhook server provides comprehensive context:

```bash
# Core webhook variables
CLAUDE_TRIGGER=true                    # Indicates webhook trigger
CLAUDE_AUTHOR=username                 # User who mentioned @claude
CLAUDE_RESOURCE_TYPE=issue             # "issue" or "merge_request"
CLAUDE_RESOURCE_ID=123                 # Issue/MR IID
CLAUDE_NOTE=@claude please help        # Full comment text
DIRECT_PROMPT=please help              # Text after @claude mention
TRIGGER_PHRASE=@claude                 # Trigger phrase used
CLAUDE_PROJECT_PATH=group/project      # Project namespace/path
GITLAB_WEBHOOK_PAYLOAD={"object_kind":"note",...}  # Full JSON payload
```

## Entrypoint Implementation

### Pipeline Configuration

The webhook-triggered pipeline uses the unified entrypoint:

```yaml
workflow:
  rules:
    - if: $CLAUDE_TRIGGER == "true"

stages:
  - claude

claude:
  stage: claude
  image: oven/bun:1.1.29-alpine
  before_script:
    - apk add --no-cache git curl
    - git config --global user.name "Claude[bot]"
    - git config --global user.email "claude-bot@noreply.gitlab.com"
    # Clone the Claude Code integration
    - git clone https://github.com/hyperremix/claude-code-for-gitlab.git /tmp/claude-code
    - cd /tmp/claude-code && bun install --frozen-lockfile
  script:
    # Run the unified entrypoint
    - cd /tmp/claude-code && bun run src/entrypoints/gitlab_entrypoint.ts
  variables:
    GITLAB_TOKEN: $CLAUDE_CODE_GL_ACCESS_TOKEN
    CLAUDE_CODE_OAUTH_TOKEN: $CLAUDE_CODE_OAUTH_TOKEN
  timeout: 30m
  interruptible: true
  rules:
    - if: $CLAUDE_TRIGGER == "true"
```

### Execution Phases

#### Phase 1: Prepare

**Purpose**: Validate webhook context and set up execution environment

**Key Functions**:

- Validates webhook trigger (`CLAUDE_TRIGGER=true`)
- Parses webhook payload and extracts context
- Sets up Git authentication and configuration
- Creates initial tracking comment on GitLab

**Implementation**:

```typescript
async function runPreparePhase() {
  // Validate webhook trigger
  if (process.env.CLAUDE_TRIGGER !== 'true') {
    throw new Error('Not triggered by webhook');
  }

  // Extract webhook context
  const resourceType = process.env.CLAUDE_RESOURCE_TYPE;
  const resourceId = process.env.CLAUDE_RESOURCE_ID;
  const author = process.env.CLAUDE_AUTHOR;
  const note = process.env.CLAUDE_NOTE;

  // Setup Git configuration
  await setupGitAuth();
  
  // Create tracking comment
  await createTrackingComment();
}
```

#### Phase 2: Execute

**Purpose**: Run Claude Code with webhook-provided context

**Key Functions**:

- Installs Claude Code dependencies
- Executes Claude Code CLI with webhook context
- Captures execution results and logs

**Implementation**:

```typescript
async function runExecutePhase() {
  // Install Claude Code if not already available
  await installClaudeCode();

  // Extract direct prompt from webhook context
  const directPrompt = process.env.DIRECT_PROMPT;
  
  // Execute Claude Code with context
  const result = await executeClaudeCode({
    prompt: directPrompt,
    context: getWebhookContext(),
    resourceType: process.env.CLAUDE_RESOURCE_TYPE,
    resourceId: process.env.CLAUDE_RESOURCE_ID
  });

  return result;
}
```

#### Phase 3: Update

**Purpose**: Process execution results and update GitLab

**Key Functions**:

- Checks if code changes were made
- Creates merge request for code changes
- Posts Claude's response as comment for analysis
- Updates tracking comment with final status

**Implementation**:

```typescript
async function runUpdatePhase() {
  // Check if changes were made
  const hasChanges = await checkGitStatus();

  if (hasChanges) {
    // Create merge request with changes
    const mrUrl = await createMergeRequest();
    await updateTrackingComment(`✅ Merge request created: ${mrUrl}`);
  } else {
    // Post Claude's response as comment
    await postClaudeResponse();
    await updateTrackingComment('✅ Claude\'s analysis posted');
  }
}
```

## Benefits of Unified Approach

### Simplified Configuration

**Before (multiple shell commands in CI/CD)**:

```yaml
claude:
  script:
    - echo "=== Phase 1: Prepare ==="
    - cd /tmp/claude && bun run src/entrypoints/prepare.ts
    - echo "=== Phase 2: Execute ==="
    - claude-code --prompt "$DIRECT_PROMPT"
    - echo "=== Phase 3: Update ==="
    - cd /tmp/claude && bun run src/entrypoints/update-comment-gitlab.ts
```

**After (single unified entrypoint)**:

```yaml
claude:
  script:
    - cd /tmp/claude-code && bun run src/entrypoints/gitlab_entrypoint.ts
```

### Better Error Handling

- **Centralized Error Management**: All phases handled in one place
- **Graceful Degradation**: Failures in one phase don't break subsequent phases
- **Clear Error Messages**: Structured error reporting with context
- **Recovery Logic**: Automatic retry and fallback mechanisms

### Consistent Logging

```typescript
// Structured logging throughout execution
console.log('=== Phase 1: Prepare ===');
console.log('Webhook context:', getWebhookContext());

console.log('=== Phase 2: Execute ===');
console.log('Executing Claude Code...');

console.log('=== Phase 3: Update ===');
console.log('Processing results...');
```

### Enhanced Context Handling

- **Webhook Validation**: Ensures execution only happens for valid webhook triggers
- **Context Preservation**: Maintains webhook context throughout execution
- **Environment Debugging**: Provides detailed environment variable debugging
- **Resource Type Handling**: Different behavior for issues vs merge requests

## Error Handling

### Phase-Level Error Handling

```typescript
export async function main() {
  try {
    console.log('=== Phase 1: Prepare ===');
    await runPreparePhase();

    console.log('=== Phase 2: Execute ===');
    const result = await runExecutePhase();

    console.log('=== Phase 3: Update ===');
    await runUpdatePhase();
    
    process.exit(0);
  } catch (error) {
    console.error('Execution failed:', error);
    
    // Attempt to update tracking comment with error
    try {
      await updateTrackingComment(`❌ Execution failed: ${error.message}`);
    } catch (updateError) {
      console.error('Failed to update tracking comment:', updateError);
    }
    
    process.exit(1);
  }
}
```

### Common Error Scenarios

**Webhook Validation Failure**:

```typescript
if (process.env.CLAUDE_TRIGGER !== 'true') {
  throw new Error('Not triggered by webhook - use webhook server to trigger Claude');
}
```

**Authentication Failure**:

```typescript
if (!process.env.CLAUDE_CODE_GL_ACCESS_TOKEN) {
  throw new Error('CLAUDE_CODE_GL_ACCESS_TOKEN not set in CI/CD variables');
}
```

**Context Missing**:

```typescript
if (!process.env.CLAUDE_RESOURCE_TYPE || !process.env.CLAUDE_RESOURCE_ID) {
  throw new Error('Missing webhook context - ensure webhook server is properly configured');
}
```

## Debugging and Monitoring

### Environment Variable Debugging

The entrypoint includes comprehensive debugging:

```typescript
function debugEnvironment() {
  console.log('=== Webhook Environment Variables ===');
  console.log(`CLAUDE_TRIGGER: ${process.env.CLAUDE_TRIGGER}`);
  console.log(`CLAUDE_AUTHOR: ${process.env.CLAUDE_AUTHOR}`);
  console.log(`CLAUDE_RESOURCE_TYPE: ${process.env.CLAUDE_RESOURCE_TYPE}`);
  console.log(`CLAUDE_RESOURCE_ID: ${process.env.CLAUDE_RESOURCE_ID}`);
  
  console.log('=== GitLab Token Debug ===');
  const token = process.env.CLAUDE_CODE_GL_ACCESS_TOKEN;
  if (token) {
    console.log(`CLAUDE_CODE_GL_ACCESS_TOKEN: Set (length: ${token.length}, prefix: "${token.substring(0, 8)}...")`);
  } else {
    console.log('CLAUDE_CODE_GL_ACCESS_TOKEN: Not set');
  }
}
```

### Pipeline Logs Structure

Expected log output:

```
=== Webhook Environment Variables ===
CLAUDE_TRIGGER: true
CLAUDE_AUTHOR: username
CLAUDE_RESOURCE_TYPE: issue
CLAUDE_RESOURCE_ID: 123

=== Phase 1: Prepare ===
✓ Webhook context validated
✓ Git authentication configured
✓ Tracking comment created

=== Phase 2: Execute ===
✓ Claude Code dependencies installed
✓ Executing Claude Code...
✓ Claude execution completed

=== Phase 3: Update ===
✓ Checking for code changes...
✓ Changes detected, creating merge request...
✓ Merge request created: https://gitlab.com/project/-/merge_requests/123
✓ Tracking comment updated
```

## Configuration Options

### Environment Variables

**Required**:

- `CLAUDE_TRIGGER`: Must be "true" for webhook execution
- `CLAUDE_CODE_GL_ACCESS_TOKEN`: GitLab personal access token
- `CLAUDE_CODE_OAUTH_TOKEN` or `ANTHROPIC_API_KEY`: Claude authentication

**Optional**:

- `CLAUDE_MODEL`: Claude model to use (default: "sonnet")
- `CLAUDE_MAX_TOKENS`: Token limit for responses
- `CUSTOM_INSTRUCTIONS`: Additional instructions for Claude
- `CLAUDE_DEBUG`: Enable verbose debug output

### Git Configuration

Automatic Git setup:

```typescript
async function setupGitAuth() {
  // Configure Git user
  await exec('git config --global user.name "Claude[bot]"');
  await exec('git config --global user.email "claude-bot@noreply.gitlab.com"');
  
  // Setup authentication for GitLab
  const token = process.env.CI_JOB_TOKEN;
  await exec(`git config --global url."https://gitlab-ci-token:${token}@${CI_SERVER_HOST}".insteadOf "${CI_SERVER_HOST}"`);
}
```

## Migration Benefits

### From Direct CI/CD Execution

**Simplified Pipeline Configuration**:

- Reduced from 100+ lines of YAML to ~50 lines
- Single script execution instead of multiple phases
- Centralized error handling instead of per-step error management

**Better Webhook Integration**:

- Native webhook context handling
- Automatic branch creation (handled by webhook server)
- Real-time triggering instead of polling or manual triggers

**Enhanced Security**:

- Token validation at execution start
- Webhook secret validation (handled by webhook server)
- Secure environment variable handling

## Performance Considerations

### Execution Time

- **Phase 1 (Prepare)**: ~10-30 seconds (Git setup, comment creation)
- **Phase 2 (Execute)**: Variable (depends on Claude task complexity)
- **Phase 3 (Update)**: ~10-30 seconds (MR creation or comment posting)

### Resource Usage

- **Memory**: Typical usage ~256MB-512MB
- **CPU**: Light usage except during Claude execution
- **Network**: GitLab API calls and Claude API requests

### Optimization Tips

```yaml
claude:
  # Cache dependencies for faster subsequent runs
  cache:
    key: claude-deps-${CI_COMMIT_REF_SLUG}
    paths:
      - /tmp/claude-code/node_modules/
  
  # Use shallow clones for faster Git operations
  variables:
    GIT_DEPTH: 1
    GIT_STRATEGY: clone
  
  # Set appropriate resource limits
  resource_group: claude-execution  # Limit concurrent executions
```

## Best Practices

### Pipeline Configuration

1. **Use webhook-only triggers**: Ensure pipeline only runs when `CLAUDE_TRIGGER=true`
2. **Set appropriate timeouts**: Default 30 minutes, adjust based on expected execution time
3. **Enable interruptible**: Allow cancellation of long-running executions
4. **Cache dependencies**: Speed up subsequent runs with caching

### Error Handling

1. **Validate early**: Check required environment variables in prepare phase
2. **Graceful degradation**: Always attempt to update tracking comment even on failure
3. **Clear error messages**: Provide actionable error information for users
4. **Log comprehensively**: Include context for debugging failures

### Security

1. **Token management**: Store tokens securely in GitLab CI/CD variables
2. **Scope limitation**: Use minimal required token permissions
3. **Audit logging**: Monitor webhook triggers and execution patterns
4. **Branch protection**: Ensure Claude respects branch protection rules

## Support and Troubleshooting

### Common Issues

**Pipeline doesn't start**:

- Verify webhook server is running and accessible
- Check webhook configuration in GitLab project settings
- Ensure `CLAUDE_TRIGGER=true` is being set by webhook server

**Execution fails**:

- Review pipeline logs for specific error messages
- Verify GitLab and Claude tokens are valid and have required scopes
- Check network connectivity between GitLab and Claude API

**Results not posted**:

- Ensure GitLab token has `api` scope for comment/MR creation
- Verify user permissions for the target project
- Check for GitLab API rate limiting

### Getting Help

- Review pipeline logs in GitLab CI/CD for detailed execution information
- Check webhook server logs for trigger events and branch creation
- Verify token permissions and configuration
- Test webhook delivery in GitLab project settings

## Related Documentation

- [Webhook Server Setup](GITLAB_APP_SETUP.md) - Complete webhook server deployment guide
- [Execution Guide](GITLAB_CLAUDE_EXECUTION_GUIDE.md) - Detailed execution flow documentation
- [Token Troubleshooting](GITLAB_TOKEN_TROUBLESHOOTING.md) - Authentication issue resolution
- [MR Creation Guide](GITLAB_MR_CREATION.md) - How results are processed and posted to GitLab
