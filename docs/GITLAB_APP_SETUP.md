# Setting Up the Claude Code Webhook Server

This guide explains how to deploy and configure the Claude Code webhook server for GitLab integration. The webhook server provides a single endpoint that listens for GitLab webhook events and triggers Claude Code execution automatically when @claude is mentioned in issues or merge requests.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Webhook Server Deployment](#webhook-server-deployment)
- [GitLab Configuration](#gitlab-configuration)
- [Pipeline Setup](#pipeline-setup)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

## Overview

The webhook server provides several benefits over direct CI/CD integration:

- **Single Deployment**: One webhook server can handle multiple GitLab projects
- **Real-time Response**: Immediate triggering when @claude is mentioned
- **Automatic Branch Creation**: Creates branches for issue-triggered workflows
- **Rate Limiting**: Built-in protection against abuse (3 triggers per user per resource per 15 minutes)
- **Security**: HMAC webhook validation and secure token handling
- **Discord Integration**: Optional notifications for monitoring

## Prerequisites

- Docker or container runtime for webhook server deployment
- GitLab Personal Access Token with `api` scope
- Public endpoint for webhook server (or use Cloudflare Tunnel)
- SSL certificate for webhook endpoint (required for production)

## Webhook Server Deployment

### Option 1: Docker Run (Quick Start)

Using the pre-built Docker image:

```bash
docker run -d \
  --name gitlab-claude-webhook \
  -p 3000:3000 \
  -e GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx \
  -e WEBHOOK_SECRET=your-webhook-secret-here \
  ghcr.io/hyperremix/claude-code-gitlab-app:latest
```

### Option 2: Docker Compose (Recommended)

1. Clone the repository and navigate to the webhook server directory:

   ```bash
   git clone https://github.com/hyperremix/claude-code-for-gitlab.git
   cd claude-code-for-gitlab/gitlab-app
   ```

2. Copy and configure environment variables:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:

   ```env
   # GitLab Configuration
   GITLAB_URL=https://gitlab.com  # or your GitLab instance URL
   GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
   
   # Webhook Configuration
   WEBHOOK_SECRET=generate_a_random_secret_here
   
   # Server Configuration
   PORT=3000
   
   # Rate Limiting
   RATE_LIMIT_MAX=3
   RATE_LIMIT_WINDOW=900  # 15 minutes
   
   # Optional: Discord Notifications
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
   
   # Optional: Custom trigger phrase
   TRIGGER_PHRASE=@claude
   ```

3. Deploy with Docker Compose:

   **Simple deployment (with local Redis):**

   ```bash
   docker-compose -f docker-compose.simple.yml up -d
   ```

   **With Cloudflare Tunnel (no port exposure needed):**

   ```bash
   # Add your Cloudflare tunnel token to .env:
   echo "CLOUDFLARE_TUNNEL_TOKEN=your-tunnel-token-here" >> .env
   docker-compose up -d
   ```

### Option 3: Build from Source

If you need to customize the webhook server:

```bash
# Clone and build
git clone https://github.com/hyperremix/claude-code-for-gitlab.git
cd claude-code-for-gitlab/gitlab-app

# Build Docker image
docker build -t gitlab-claude-webhook .

# Run locally built image
docker run -d \
  --name gitlab-claude-webhook \
  -p 3000:3000 \
  --env-file .env \
  gitlab-claude-webhook
```

## GitLab Configuration

### Step 1: Create GitLab Personal Access Token

1. Go to GitLab → **User Settings** → **Access Tokens**
2. Create a new token with:
   - **Name**: `Claude Code Webhook Server`
   - **Scopes**:
     - `api` - Full API access (required)
   - **Expiration**: Set appropriate expiration date
3. Copy the token and add it to your webhook server configuration as `GITLAB_TOKEN`

### Step 2: Configure Webhooks

**For individual projects:**

1. Go to your GitLab project
2. Navigate to **Settings** → **Webhooks**
3. Add a new webhook:
   - **URL**: `https://your-webhook-server.com/webhook`
   - **Secret token**: Use the same value as `WEBHOOK_SECRET` from your .env
   - **Trigger events**: Enable **Comments**
   - **SSL verification**: Enable (disable only for development with self-signed certificates)
4. Click **Add webhook**

**For group-level webhooks (multiple projects):**

1. Go to your GitLab group
2. Navigate to **Settings** → **Webhooks**
3. Configure the same way as project webhooks
4. This webhook will apply to all projects in the group

**For instance-level webhooks (GitLab admin):**

1. Go to **Admin Area** → **System Hooks**
2. Add webhook URL and configure for Note events
3. This applies to all projects on the GitLab instance

## Pipeline Setup

Each project that should respond to @claude mentions needs a pipeline configuration:

### GitLab CI/CD Configuration

Create or update `.gitlab-ci.yml` in your project:

```yaml
# Only run when triggered by webhook
workflow:
  rules:
    - if: $CLAUDE_TRIGGER == "true"

stages:
  - claude

variables:
  # Use your GitLab token for Claude execution
  GITLAB_TOKEN: $CLAUDE_CODE_GL_ACCESS_TOKEN
  # Use Claude OAuth token or Anthropic API key
  CLAUDE_CODE_OAUTH_TOKEN: $CLAUDE_CODE_OAUTH_TOKEN

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
    # Run Claude Code with webhook context
    - cd /tmp/claude-code && bun run src/entrypoints/gitlab_entrypoint.ts
  rules:
    - if: $CLAUDE_TRIGGER == "true"
  timeout: 30m
  interruptible: true
```

### Environment Variables Available in Pipeline

The webhook server provides these variables to your pipeline:

- `CLAUDE_TRIGGER`: Always "true" when triggered by webhook
- `CLAUDE_AUTHOR`: Username who mentioned @claude
- `CLAUDE_RESOURCE_TYPE`: "merge_request" or "issue"
- `CLAUDE_RESOURCE_ID`: MR/Issue IID
- `CLAUDE_NOTE`: The full comment text
- `DIRECT_PROMPT`: Text after the @claude mention
- `TRIGGER_PHRASE`: The trigger phrase used
- `CLAUDE_PROJECT_PATH`: Project path with namespace
- `GITLAB_WEBHOOK_PAYLOAD`: Full webhook payload as JSON string

## Security Considerations

### 1. Webhook Security

- Always use HTTPS for webhook endpoints in production
- Generate a strong random webhook secret and keep it secure
- Enable SSL verification in GitLab webhook settings
- Consider IP whitelisting if possible

### 2. Token Security

Store all tokens and secrets securely:

```bash
# Generate a secure webhook secret
openssl rand -hex 32

# Set secure environment variables
echo "WEBHOOK_SECRET=$(openssl rand -hex 32)" >> .env
echo "GITLAB_TOKEN=glpat-your-token-here" >> .env
```

### 3. Access Control

- Limit GitLab token permissions to only what's needed
- Use project-specific tokens where possible
- Regularly rotate tokens and webhook secrets
- Monitor webhook server logs for suspicious activity

### 4. Rate Limiting

The webhook server includes built-in rate limiting:

```env
# Configure rate limits in .env
RATE_LIMIT_MAX=3        # Max triggers per window
RATE_LIMIT_WINDOW=900   # Window in seconds (15 minutes)
```

### 5. Network Security

For production deployments:

```yaml
# Example nginx configuration for webhook server
server {
    listen 443 ssl http2;
    server_name claude-webhook.your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=webhook:10m rate=10r/s;

    location /webhook {
        limit_req zone=webhook burst=20 nodelay;
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://localhost:3000;
    }
}
```

## Troubleshooting

### Common Issues

**Webhook not triggering:**

1. Check webhook server logs: `docker logs gitlab-claude-webhook`
2. Verify webhook URL is accessible from GitLab
3. Check webhook secret matches between GitLab and server
4. Ensure Comments trigger is enabled in GitLab webhook settings

**Pipeline not starting:**

1. Verify `CLAUDE_TRIGGER=true` is being set
2. Check GitLab token has `api` scope
3. Ensure pipeline configuration includes webhook workflow rules
4. Check rate limiting isn't blocking the trigger

**Branch creation failures:**

1. Verify GitLab token has `write_repository` scope
2. Check branch protection rules don't block the webhook user
3. Ensure project access permissions for the token user

**Authentication errors:**

1. Verify GitLab token hasn't expired
2. Check token has required scopes (`api`)
3. For self-hosted GitLab, ensure `GITLAB_URL` is set correctly

### Health Checks

Monitor webhook server health:

```bash
# Check server status
curl https://your-webhook-server.com/health

# Check server logs
docker logs -f gitlab-claude-webhook

# Test webhook endpoint (should return 405 Method Not Allowed for GET)
curl https://your-webhook-server.com/webhook
```

### Self-Hosted GitLab

For self-hosted GitLab instances:

1. Set `GITLAB_URL` to your GitLab instance URL
2. Ensure webhook server can reach your GitLab instance
3. Configure SSL certificates properly
4. For internal networks, consider using Docker network or VPN

```env
# Self-hosted GitLab configuration
GITLAB_URL=https://gitlab.your-company.com
```

## Monitoring and Maintenance

### Discord Notifications

Enable Discord notifications to monitor webhook activity:

1. Create a Discord webhook in your server settings
2. Add the webhook URL to your configuration:

   ```env
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook-id/your-webhook-token
   ```

3. The webhook server will send notifications for:
   - Pipeline triggers with project and user details
   - Rate limit events
   - Error conditions

### Log Monitoring

Key log messages to monitor:

- `Pipeline triggered` - Successful triggers
- `Rate limit exceeded` - Users hitting rate limits
- `Branch created` - Successful branch creation
- `Authentication failed` - Token issues
- `Webhook validation failed` - Security issues

### Backup and Updates

- Regularly backup your webhook server configuration
- Keep the Docker image updated for security patches
- Monitor GitLab API changes that might affect integration
- Test webhook functionality after GitLab updates

## Best Practices

1. **Use environment-specific deployments**: Separate webhook servers for dev/staging/production
2. **Monitor resource usage**: The webhook server is lightweight but monitor memory/CPU usage
3. **Regular token rotation**: Rotate GitLab tokens and webhook secrets periodically
4. **Test thoroughly**: Test webhook integration in staging before production deployment
5. **Document configuration**: Keep documentation of your specific deployment configuration

## Support

For webhook server specific issues:

- Check the [webhook server README](../gitlab-app/README.md)
- Review Docker container logs
- Test webhook delivery in GitLab settings
- Verify network connectivity between GitLab and webhook server

For Claude Code integration issues:

- Review pipeline logs for Claude execution details
- Check environment variable configuration
- Verify GitLab token permissions and scopes
