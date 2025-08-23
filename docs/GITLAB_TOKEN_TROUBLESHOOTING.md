# GitLab Token Troubleshooting Guide

This guide helps resolve authentication issues with GitLab tokens in the webhook-triggered Claude Code execution environment.

## Overview

The webhook-only architecture requires two types of tokens:

1. **Webhook Server Token**: Used by the webhook server to trigger pipelines and create branches
2. **Pipeline Token**: Used within CI/CD pipelines for GitLab API operations

## Common Issues

### Token Not Expanding in GitLab CI

**Problem**: You see error messages like:

```
Using CLAUDE_CODE_GL_ACCESS_TOKEN for GitLab authentication (length: 28)
Token prefix: $CLAUDE_...
ERROR: CLAUDE_CODE_GL_ACCESS_TOKEN appears to be unexpanded: "$CLAUDE_CODE_GL_ACCESS_TOKEN"
```

This means the environment variable is showing as the literal string `$CLAUDE_CODE_GL_ACCESS_TOKEN` instead of the actual token value.

**Solution**:

1. **Add the variable to GitLab CI/CD settings:**
   - Go to your GitLab project
   - Navigate to Settings → CI/CD → Variables
   - Click "Add variable"
   - Set:
     - Key: `CLAUDE_CODE_GL_ACCESS_TOKEN`
     - Value: Your actual GitLab Personal Access Token
     - Type: Variable
     - Environment scope: All (or specific environments)
     - Protected: Yes (if using protected branches)
     - Masked: Yes (to hide in logs)

2. **Create a GitLab Personal Access Token:**
   - Go to GitLab → User Settings → Access Tokens
   - Create a new token with these scopes:
     - `api` - Full API access (required)
     - `read_repository` - Read repository content
     - `write_repository` - Write repository content  
   - Copy the token and add it to CI/CD variables as shown above

### Webhook Server Authentication Issues

**Problem**: Webhook server fails to trigger pipelines or create branches.

**Symptoms**:

```
Authentication failed: 401 Unauthorized
Failed to create branch for issue
Pipeline trigger failed
```

**Solution**:

1. **Verify webhook server token configuration:**

   ```bash
   # Check webhook server logs
   docker logs gitlab-claude-webhook
   
   # Look for authentication errors
   docker logs gitlab-claude-webhook | grep -i "auth\|401\|403"
   ```

2. **Update webhook server environment:**

   ```env
   # In your webhook server .env file
   GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx  # Your personal access token
   GITLAB_URL=https://gitlab.com             # Or your GitLab instance URL
   ```

3. **Verify token scopes:**
   - `api` - Required for pipeline triggering and branch creation
   - Token must be created by a user with Developer+ access to target projects

## Token Types and Usage

### Personal Access Tokens (Recommended)

**Format**: `glpat-xxxxxxxxxxxxxxxxxxxx`

**Usage**: Both webhook server and pipeline execution

**Scopes Required**:

- `api` - Full API access
- `read_repository` - Read repository content  
- `write_repository` - Write repository content

**How to Create**:

1. GitLab → User Settings → Access Tokens
2. Enter name and expiration
3. Select required scopes
4. Click "Create personal access token"
5. Copy the token immediately (it won't be shown again)

### Project Access Tokens

**Format**: `glpat-xxxxxxxxxxxxxxxxxxxx`

**Usage**: Project-specific access (alternative to personal tokens)

**How to Create**:

1. Go to Project → Settings → Access Tokens
2. Create token with `api` scope
3. Use this token for both webhook server and pipeline

### OAuth Tokens (Not Applicable)

OAuth tokens are not used in the webhook-only architecture. The system relies on personal or project access tokens for simplicity and reliability.

## Authentication Headers

GitLab supports different authentication header formats. The webhook server and pipeline execution automatically detect the token type and use the appropriate header:

**For Personal/Project Access Tokens**:

```http
Authorization: Bearer glpat-xxxxxxxxxxxxxxxxxxxx
```

**Alternative Header Format**:

```http
PRIVATE-TOKEN: glpat-xxxxxxxxxxxxxxxxxxxx
```

## Debugging Steps

### 1. Check Webhook Server Configuration

```bash
# View webhook server logs
docker logs -f gitlab-claude-webhook

# Check for authentication-related errors
docker logs gitlab-claude-webhook | grep -E "(auth|token|401|403)"

# Test webhook server health
curl https://your-webhook-server.com/health
```

### 2. Verify Pipeline Environment

The unified entrypoint includes debugging that shows:

```bash
=== GitLab Environment Variables Debug ===
CLAUDE_CODE_GL_ACCESS_TOKEN: Set (length: 42, prefix: "glpat-XX...")
GITLAB_TOKEN: Set (length: 42, prefix: "glpat-XX...")

=== Token Authentication Test ===
GitLab API connection: ✓ Success
User permissions: ✓ Verified
```

### 3. Test Token Manually

You can test your token manually:

```bash
# Test GitLab API access
curl -H "Authorization: Bearer glpat-your-token-here" \
     "https://gitlab.com/api/v4/user"

# Test project access
curl -H "Authorization: Bearer glpat-your-token-here" \
     "https://gitlab.com/api/v4/projects/your-project-id"

# Test pipeline trigger capability
curl -X POST \
     -H "Authorization: Bearer glpat-your-token-here" \
     "https://gitlab.com/api/v4/projects/your-project-id/pipeline?ref=main"
```

## Environment Variable Configuration

### Webhook Server Environment

```env
# Required for webhook server
GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
GITLAB_URL=https://gitlab.com
WEBHOOK_SECRET=your-webhook-secret-here

# Optional for self-hosted GitLab
NODE_TLS_REJECT_UNAUTHORIZED=0  # Only for development with self-signed certs
```

### GitLab CI/CD Variables

Set these in GitLab project settings:

| Variable Name | Value | Protected | Masked | Scope |
|---------------|-------|-----------|--------|-------|
| `CLAUDE_CODE_GL_ACCESS_TOKEN` | `glpat-xxx...` | ✓ | ✓ | All |
| `CLAUDE_CODE_OAUTH_TOKEN` | `claude-oauth-token` | ✓ | ✓ | All |

### Pipeline Environment Debugging

Add debugging to your pipeline:

```yaml
claude:
  before_script:
    - echo "=== Environment Debug ==="
    - echo "CLAUDE_TRIGGER=${CLAUDE_TRIGGER}"
    - echo "CLAUDE_RESOURCE_TYPE=${CLAUDE_RESOURCE_TYPE}"
    - |
      if [ -n "$CLAUDE_CODE_GL_ACCESS_TOKEN" ]; then
        echo "CLAUDE_CODE_GL_ACCESS_TOKEN: Set (length: ${#CLAUDE_CODE_GL_ACCESS_TOKEN})"
        echo "Token prefix: ${CLAUDE_CODE_GL_ACCESS_TOKEN:0:8}..."
      else
        echo "CLAUDE_CODE_GL_ACCESS_TOKEN: Not set"
      fi
```

## Token Security Best Practices

### 1. Token Rotation

- Rotate personal access tokens every 90 days
- Use expiration dates on all tokens
- Monitor token usage in GitLab audit logs

### 2. Scope Limitation

- Use minimal required scopes (`api` is sufficient for most cases)
- Consider project access tokens for project-specific deployments
- Avoid using admin tokens unless absolutely necessary

### 3. Storage Security

```bash
# Generate secure secrets for webhook
openssl rand -hex 32  # For WEBHOOK_SECRET

# Store tokens securely in GitLab CI/CD variables
# Mark as Protected and Masked
```

### 4. Monitoring

- Monitor webhook server logs for authentication failures
- Set up alerts for repeated authentication errors
- Track token usage and expiration dates

## Troubleshooting by Error Message

### "401 Unauthorized"

**Cause**: Invalid or expired token

**Solutions**:

1. Verify token is correct and not expired
2. Check token has required scopes
3. Ensure token user has access to the project

### "403 Forbidden"

**Cause**: Valid token but insufficient permissions

**Solutions**:

1. Grant user Developer+ access to the project
2. Check if project/group has restrictions
3. Verify token scopes include required permissions

### "404 Not Found"

**Cause**: Project not accessible or doesn't exist

**Solutions**:

1. Verify project path is correct
2. Check if project is private and token user has access
3. Ensure GitLab URL is correct for self-hosted instances

### "Token appears to be unexpanded"

**Cause**: Environment variable not set in GitLab CI/CD

**Solutions**:

1. Add token to GitLab CI/CD variables
2. Verify variable name matches exactly
3. Check environment scope includes your branch/deployment

## Self-Hosted GitLab Considerations

### SSL Certificate Issues

For self-hosted GitLab with self-signed certificates:

```env
# Webhook server configuration (development only)
NODE_TLS_REJECT_UNAUTHORIZED=0
GITLAB_URL=https://gitlab.your-company.com
```

```yaml
# Pipeline configuration (development only)
variables:
  GIT_SSL_NO_VERIFY: "true"
  NODE_TLS_REJECT_UNAUTHORIZED: "0"
```

**⚠️ Warning**: Only use SSL verification bypass in development environments.

### Network Access

Ensure webhook server can reach your GitLab instance:

```bash
# Test connectivity from webhook server
curl -I https://gitlab.your-company.com/api/v4/version

# Test from CI/CD runner
ping gitlab.your-company.com
```

## Advanced Debugging

### Enable Verbose Logging

```yaml
# In your pipeline configuration
claude:
  variables:
    GITLAB_TOKEN: $CLAUDE_CODE_GL_ACCESS_TOKEN
    CLAUDE_DEBUG: "true"  # Enable debug output
  script:
    - cd /tmp/claude-code && bun run src/entrypoints/gitlab_entrypoint.ts
```

### Network Request Debugging

```bash
# Test webhook server GitLab connectivity
docker exec gitlab-claude-webhook curl -v \
  -H "Authorization: Bearer $GITLAB_TOKEN" \
  "$GITLAB_URL/api/v4/user"
```

### Token Validation Script

Create a simple token validation script:

```bash
#!/bin/bash
# validate-token.sh

TOKEN="$1"
GITLAB_URL="${2:-https://gitlab.com}"

if [ -z "$TOKEN" ]; then
  echo "Usage: $0 <token> [gitlab-url]"
  exit 1
fi

echo "Testing token against $GITLAB_URL..."

# Test basic authentication
response=$(curl -s -w "%{http_code}" -o /tmp/test-response \
  -H "Authorization: Bearer $TOKEN" \
  "$GITLAB_URL/api/v4/user")

if [ "$response" = "200" ]; then
  echo "✓ Token authentication successful"
  username=$(jq -r '.username' /tmp/test-response)
  echo "✓ Authenticated as: $username"
else
  echo "✗ Token authentication failed (HTTP $response)"
  cat /tmp/test-response
fi

rm -f /tmp/test-response
```

## Getting Help

For token-specific issues:

1. **Check GitLab documentation**: [Personal Access Tokens](https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html)
2. **Review webhook server logs**: Look for authentication-related errors
3. **Test tokens manually**: Use curl commands to verify token functionality
4. **Monitor GitLab audit logs**: Check for authentication events and failures
5. **Contact GitLab support**: For issues with GitLab.com or GitLab enterprise support

## Related Documentation

- [Webhook Server Setup Guide](GITLAB_APP_SETUP.md) - Complete webhook server deployment guide
- [Execution Guide](GITLAB_CLAUDE_EXECUTION_GUIDE.md) - How Claude Code executes in pipelines
- [FAQ](../FAQ.md) - Common questions about webhook server setup and usage
