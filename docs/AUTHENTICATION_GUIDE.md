# Authentication Guide

This comprehensive guide covers all authentication aspects for the Claude Code for GitLab webhook-only integration, including token types, setup, troubleshooting, and security best practices.

## Overview

The webhook-only architecture requires authentication in two contexts:

1. **Webhook Server Authentication**: Used by the webhook server to trigger pipelines and create branches
2. **Pipeline Authentication**: Used within CI/CD pipelines for GitLab API operations and Claude API access

## Token Types

### GitLab Personal Access Tokens (Recommended)

**Format**: `glpat-xxxxxxxxxxxxxxxxxxxx`

**Usage**: Both webhook server and pipeline execution

**Required Scopes**:

- `api` - Full API access (required)
- `read_repository` - Read repository content
- `write_repository` - Write repository content

**How to Create**:

1. Go to GitLab → User Settings → Access Tokens
2. Enter name and expiration date
3. Select required scopes: `api`, `read_repository`, `write_repository`
4. Click "Create personal access token"
5. Copy the token immediately (it won't be shown again)

### GitLab Project Access Tokens

**Format**: `glpat-xxxxxxxxxxxxxxxxxxxx`

**Usage**: Project-specific access (alternative to personal tokens)

**How to Create**:

1. Go to Project → Settings → Access Tokens
2. Create token with `api` scope and appropriate role (Developer or higher)
3. Use this token for both webhook server and pipeline

### Anthropic API Keys

**Format**: `sk-ant-api03-...`

**Usage**: Direct access to Claude API

**How to Obtain**:

1. Sign up at [Anthropic Console](https://console.anthropic.com/)
2. Navigate to API Keys section
3. Create a new API key
4. Copy the key for use in your environment

### Claude Code OAuth Tokens

**Format**: `claude-oauth-token`

**Usage**: Alternative to Anthropic API keys for Claude access

**Note**: These are obtained through the Claude Code OAuth flow and provide access to Claude through the Claude Code service.

## Authentication Setup

### Webhook Server Configuration

#### Environment Variables

Create a `.env` file for your webhook server:

```env
# Required GitLab Authentication
GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
GITLAB_URL=https://gitlab.com

# Required Webhook Security
WEBHOOK_SECRET=your-webhook-secret-here

# Optional Server Configuration
PORT=3000
REDIS_URL=redis://localhost:6379

# Optional Features
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
TRIGGER_PHRASE=@claude
```

#### Docker Deployment

```bash
docker run -d \
  --name gitlab-claude-webhook \
  -p 3000:3000 \
  -e GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx \
  -e WEBHOOK_SECRET=your-webhook-secret-here \
  -e GITLAB_URL=https://gitlab.com \
  ghcr.io/hyperremix/claude-code-gitlab-app:latest
```

#### Docker Compose

```yaml
# docker-compose.yml
services:
  webhook:
    image: ghcr.io/hyperremix/claude-code-gitlab-app:latest
    environment:
      - GITLAB_TOKEN=${GITLAB_TOKEN}
      - WEBHOOK_SECRET=${WEBHOOK_SECRET}
      - GITLAB_URL=${GITLAB_URL}
      - REDIS_URL=redis://redis:6379
    ports:
      - "3000:3000"
    depends_on:
      - redis

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

### GitLab CI/CD Variables

Add these variables in GitLab project settings (Settings → CI/CD → Variables):

| Variable Name                 | Description               | Example              | Protected | Masked |
| ----------------------------- | ------------------------- | -------------------- | --------- | ------ |
| `CLAUDE_CODE_GL_ACCESS_TOKEN` | GitLab API access         | `glpat-xxx...`       | ✓         | ✓      |
| `ANTHROPIC_API_KEY`           | Claude API access         | `sk-ant-api03-...`   | ✓         | ✓      |
| `CLAUDE_CODE_OAUTH_TOKEN`     | Alternative Claude access | `claude-oauth-token` | ✓         | ✓      |

**Authentication Priority**: The system checks for authentication in this order:

1. `ANTHROPIC_API_KEY` (if set)
2. `CLAUDE_CODE_OAUTH_TOKEN` (fallback)

### GitLab Webhook Configuration

1. In your GitLab project/group, go to **Settings → Webhooks**
2. Add webhook URL: `https://your-webhook-server.com/webhook`
3. Set secret token: Use the same value as `WEBHOOK_SECRET` in your webhook server
4. Enable trigger: **Comments**
5. Test the webhook to ensure connectivity

## Development Environment Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v18.0.0 or higher
- [Bun](https://bun.sh/) runtime
- [Redis](https://redis.io/) server
- GitLab Personal Access Token
- Anthropic API key

### Local Development

1. **Clone and install dependencies**:

   ```bash
   git clone https://github.com/hyperremix/claude-code-for-gitlab.git
   cd claude-code-for-gitlab/gitlab-app
   bun install
   ```

2. **Set up environment variables**:

   ```bash
   cp .env.example .env
   # Edit .env with your tokens
   ```

3. **Start Redis server**:

   ```bash
   # Using Docker
   docker run -d -p 6379:6379 redis:alpine

   # Or install locally
   redis-server
   ```

4. **Run webhook server in development**:

   ```bash
   bun run dev
   ```

5. **Test webhook endpoint**:

   ```bash
   curl http://localhost:3000/health
   ```

## Authentication Headers

GitLab supports different authentication header formats. The system automatically detects the token type and uses the appropriate header:

**For Personal/Project Access Tokens**:

```http
Authorization: Bearer glpat-xxxxxxxxxxxxxxxxxxxx
```

**Alternative Header Format**:

```http
PRIVATE-TOKEN: glpat-xxxxxxxxxxxxxxxxxxxx
```

## Troubleshooting Authentication Issues

### Common Error Messages

#### "Token appears to be unexpanded"

**Error**:

```
ERROR: CLAUDE_CODE_GL_ACCESS_TOKEN appears to be unexpanded: "$CLAUDE_CODE_GL_ACCESS_TOKEN"
```

**Cause**: Environment variable not set in GitLab CI/CD

**Solutions**:

1. Add token to GitLab CI/CD variables (Settings → CI/CD → Variables)
2. Verify variable name matches exactly: `CLAUDE_CODE_GL_ACCESS_TOKEN`
3. Check environment scope includes your branch/deployment
4. Ensure variable is not protected if branch is not protected

#### "401 Unauthorized"

**Cause**: Invalid or expired token

**Solutions**:

1. Verify token is correct and not expired
2. Check token has required scopes (`api` minimum)
3. Ensure token user has Developer+ access to the project
4. Regenerate token if expired

#### "403 Forbidden"

**Cause**: Valid token but insufficient permissions

**Solutions**:

1. Grant user Developer+ access to the project
2. Check if project/group has additional restrictions
3. Verify token scopes include required permissions
4. For webhook server: ensure token user can trigger pipelines

#### "404 Not Found"

**Cause**: Project not accessible or doesn't exist

**Solutions**:

1. Verify project path is correct
2. Check if project is private and token user has access
3. Ensure GitLab URL is correct for self-hosted instances
4. Verify project ID vs project path usage

### Debugging Steps

#### 1. Verify Webhook Server Authentication

```bash
# Check webhook server logs
docker logs -f gitlab-claude-webhook

# Look for authentication errors
docker logs gitlab-claude-webhook | grep -E "(auth|token|401|403)"

# Test health endpoint
curl https://your-webhook-server.com/health
```

#### 2. Test GitLab API Access

```bash
# Test token manually
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

#### 3. Verify Pipeline Environment

Add debugging to your `.gitlab-ci.yml`:

```yaml
claude:
  before_script:
    - echo "=== Authentication Debug ==="
    - |
      if [ -n "$CLAUDE_CODE_GL_ACCESS_TOKEN" ]; then
        echo "CLAUDE_CODE_GL_ACCESS_TOKEN: Set (length: ${#CLAUDE_CODE_GL_ACCESS_TOKEN})"
        echo "Token prefix: ${CLAUDE_CODE_GL_ACCESS_TOKEN:0:8}..."
      else
        echo "CLAUDE_CODE_GL_ACCESS_TOKEN: Not set"
      fi
    - |
      if [ -n "$ANTHROPIC_API_KEY" ]; then
        echo "ANTHROPIC_API_KEY: Set (length: ${#ANTHROPIC_API_KEY})"
        echo "Key prefix: ${ANTHROPIC_API_KEY:0:8}..."
      else
        echo "ANTHROPIC_API_KEY: Not set"
      fi
```

#### 4. Test Anthropic API Access

```bash
# Test Anthropic API key
curl -H "Authorization: Bearer sk-ant-your-key-here" \
     -H "Content-Type: application/json" \
     -d '{"model":"claude-3-sonnet-20240229","max_tokens":1024,"messages":[{"role":"user","content":"Hello"}]}' \
     "https://api.anthropic.com/v1/messages"
```

### Token Validation Script

Create a script to validate your tokens:

```bash
#!/bin/bash
# validate-tokens.sh

GITLAB_TOKEN="$1"
ANTHROPIC_KEY="$2"
GITLAB_URL="${3:-https://gitlab.com}"

echo "=== Token Validation ==="

# Test GitLab token
if [ -n "$GITLAB_TOKEN" ]; then
  echo "Testing GitLab token..."
  response=$(curl -s -w "%{http_code}" -o /tmp/gitlab-test \
    -H "Authorization: Bearer $GITLAB_TOKEN" \
    "$GITLAB_URL/api/v4/user")

  if [ "$response" = "200" ]; then
    username=$(jq -r '.username' /tmp/gitlab-test 2>/dev/null)
    echo "✓ GitLab authentication successful as: $username"
  else
    echo "✗ GitLab authentication failed (HTTP $response)"
  fi
  rm -f /tmp/gitlab-test
fi

# Test Anthropic API key
if [ -n "$ANTHROPIC_KEY" ]; then
  echo "Testing Anthropic API key..."
  response=$(curl -s -w "%{http_code}" -o /tmp/anthropic-test \
    -H "Authorization: Bearer $ANTHROPIC_KEY" \
    -H "Content-Type: application/json" \
    -d '{"model":"claude-3-haiku-20240307","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}' \
    "https://api.anthropic.com/v1/messages")

  if [ "$response" = "200" ]; then
    echo "✓ Anthropic API key valid"
  else
    echo "✗ Anthropic API key invalid (HTTP $response)"
  fi
  rm -f /tmp/anthropic-test
fi
```

Usage:

```bash
./validate-tokens.sh "glpat-your-gitlab-token" "sk-ant-your-anthropic-key"
```

## Self-Hosted GitLab Considerations

### SSL Certificate Configuration

For self-hosted GitLab with self-signed certificates:

```env
# Webhook server (development only)
NODE_TLS_REJECT_UNAUTHORIZED=0
GITLAB_URL=https://gitlab.your-company.com
```

```yaml
# Pipeline configuration (development only)
variables:
  GIT_SSL_NO_VERIFY: "true"
  NODE_TLS_REJECT_UNAUTHORIZED: "0"
```

**⚠️ Warning**: Only disable SSL verification in development environments.

### Network Connectivity

Ensure webhook server can reach your GitLab instance:

```bash
# Test connectivity from webhook server
curl -I https://gitlab.your-company.com/api/v4/version

# Test from CI/CD runner
ping gitlab.your-company.com
```

### Authentication with Custom Domains

For GitLab instances with custom domains:

```env
# Webhook server configuration
GITLAB_URL=https://code.company.com
GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
```

## Security Best Practices

### Token Management

1. **Token Rotation**:

   - Rotate personal access tokens every 90 days
   - Set expiration dates on all tokens
   - Monitor token usage in GitLab audit logs

2. **Scope Limitation**:

   - Use minimal required scopes (`api` for GitLab, basic access for Anthropic)
   - Consider project access tokens for project-specific deployments
   - Avoid using admin tokens unless absolutely necessary

3. **Secure Storage**:

   ```bash
   # Generate secure webhook secrets
   openssl rand -hex 32

   # Store in GitLab CI/CD variables with:
   # - Protected: Yes (for protected branches)
   # - Masked: Yes (hide in logs)
   ```

### Webhook Security

1. **Secret Validation**: Always use webhook secrets for HMAC validation
2. **Network Restrictions**: Limit webhook endpoint access to GitLab IPs when possible
3. **Rate Limiting**: Configure appropriate rate limits to prevent abuse
4. **Logging**: Monitor webhook server logs for suspicious activity

### Environment Security

1. **Variable Protection**: Mark sensitive CI/CD variables as protected and masked
2. **Branch Protection**: Use branch protection rules to require reviews
3. **Audit Logging**: Enable GitLab audit logging for token usage tracking
4. **Access Reviews**: Regularly review who has access to tokens and projects

## Rate Limiting

The webhook server includes built-in rate limiting:

- **Default**: 3 triggers per user per resource per 15 minutes
- **Configurable via environment variables**:

  ```env
  RATE_LIMIT_MAX=3        # Max requests per window
  RATE_LIMIT_WINDOW=900   # Window in seconds (15 minutes)
  ```

### Rate Limit Troubleshooting

If you encounter rate limiting:

1. **Check current limits**: Review webhook server logs for rate limit messages
2. **Adjust limits**: Modify `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW` if needed
3. **Monitor usage**: Use Discord notifications to track rate limit events
4. **Redis inspection**: Check Redis for rate limit keys if needed

## Advanced Configuration

### Multiple Authentication Methods

The system supports fallback authentication:

```yaml
# In .gitlab-ci.yml or CI/CD variables
variables:
  # Primary: Direct Anthropic access
  ANTHROPIC_API_KEY: sk-ant-api03-...

  # Fallback: Claude Code OAuth
  CLAUDE_CODE_OAUTH_TOKEN: claude-oauth-token

  # GitLab API access
  CLAUDE_CODE_GL_ACCESS_TOKEN: glpat-...
```

### Custom Authentication Headers

For special cases, you can customize headers:

```javascript
// In custom webhook server modifications
const headers = {
  Authorization: `Bearer ${token}`,
  "User-Agent": "Claude-Webhook-Server/1.0",
  "X-Custom-Auth": customAuthValue,
};
```

### Proxy Configuration

For environments requiring proxy access:

```env
# Webhook server proxy configuration
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=http://proxy.company.com:8080
NO_PROXY=localhost,127.0.0.1
```

## Monitoring and Alerts

### Health Checks

Set up monitoring for authentication health:

```bash
# Health check script
#!/bin/bash
response=$(curl -s -o /dev/null -w "%{http_code}" https://your-webhook-server.com/health)
if [ "$response" != "200" ]; then
  echo "Webhook server health check failed: $response"
  exit 1
fi
```

### Discord Notifications

Configure Discord alerts for authentication issues:

```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook-id/your-webhook-token
```

The webhook server will automatically send notifications for:

- Pipeline triggers
- Rate limit events
- Authentication failures (if configured)

### Log Monitoring

Monitor authentication-related logs:

```bash
# Webhook server authentication logs
docker logs gitlab-claude-webhook | grep -i "auth\|token\|401\|403"

# GitLab CI/CD authentication logs
# Check pipeline logs for authentication debug output
```

## Getting Help

For authentication-specific issues:

1. **Documentation**: Review [GitLab Personal Access Tokens](https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html)
2. **Webhook Server Logs**: Check Docker logs for authentication errors
3. **Token Testing**: Use the validation scripts provided in this guide
4. **GitLab Audit Logs**: Monitor authentication events and failures
5. **Community Support**: Check the project repository for similar issues

## Related Documentation

- [Quick Start Guide](QUICK_START.md) - Get up and running quickly
- [Webhook Deployment Guide](WEBHOOK_DEPLOYMENT.md) - Detailed deployment instructions
- [Troubleshooting Guide](TROUBLESHOOTING.md) - Common issues and solutions
- [GitLab Claude Execution Guide](GITLAB_CLAUDE_EXECUTION_GUIDE.md) - How Claude executes in pipelines
