# Quick Start Guide

Get Claude Code for GitLab up and running in 10 minutes with this streamlined setup guide.

## Prerequisites

- GitLab account with Developer+ permissions on target project
- Docker for webhook server deployment
- Domain/server with public internet access (or Cloudflare Tunnel)

## Step 1: Get Required Tokens

### GitLab Personal Access Token

1. Go to GitLab → **User Settings** → **Access Tokens**
2. Create token with these scopes:
   - `api` - Full API access (required)
   - `read_repository` - Read repository content
   - `write_repository` - Write repository content
3. Copy the token (format: `glpat-xxxxxxxxxxxxxxxxxxxx`)

### Claude API Access

Choose one option:

**Option A: Anthropic API Key** (Direct access)

1. Sign up at [Anthropic Console](https://console.anthropic.com/)
2. Create an API key (format: `sk-ant-api03-...`)

**Option B: Claude Code OAuth Token** (Alternative)

1. Obtain through Claude Code OAuth flow
2. Use token format: `claude-oauth-token`

## Step 2: Deploy Webhook Server

### Quick Docker Deployment

```bash
# Replace with your tokens
docker run -d \
  --name gitlab-claude-webhook \
  -p 3000:3000 \
  -e GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx \
  -e WEBHOOK_SECRET=$(openssl rand -hex 32) \
  -e GITLAB_URL=https://gitlab.com \
  ghcr.io/hyperremix/claude-code-gitlab-app:latest
```

### With Docker Compose (Recommended)

1. **Create configuration**:

   ```bash
   mkdir claude-webhook && cd claude-webhook
   curl -O https://raw.githubusercontent.com/hyperremix/claude-code-for-gitlab/main/gitlab-app/docker-compose.simple.yml
   ```

2. **Create environment file**:

   ```bash
   cat > .env << EOF
   GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
   WEBHOOK_SECRET=$(openssl rand -hex 32)
   GITLAB_URL=https://gitlab.com
   PORT=3000
   EOF
   ```

3. **Deploy**:

   ```bash
   docker-compose -f docker-compose.simple.yml up -d
   ```

4. **Verify deployment**:

   ```bash
   curl http://localhost:3000/health
   # Should return: {"status":"ok"}
   ```

### With Cloudflare Tunnel (No Port Exposure)

If you don't want to expose ports directly:

1. Get Cloudflare Tunnel token from [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Add to `.env`:

   ```bash
   echo "CLOUDFLARE_TUNNEL_TOKEN=your-tunnel-token" >> .env
   ```

3. Use full docker-compose:

   ```bash
   curl -O https://raw.githubusercontent.com/hyperremix/claude-code-for-gitlab/main/gitlab-app/docker-compose.yml
   docker-compose up -d
   ```

## Step 3: Configure GitLab Webhook

1. **Go to your GitLab project**

   - Navigate to **Settings** → **Webhooks**

2. **Add webhook**:

   - **URL**: `https://your-domain.com/webhook` (or Cloudflare tunnel URL)
   - **Secret token**: Copy `WEBHOOK_SECRET` from your `.env` file
   - **Trigger events**: Enable **Comments**
   - **SSL verification**: ✓ Enable

3. **Test webhook**:
   - Click **Test** → **Comments events**
   - Should see success response

## Step 4: Configure GitLab CI/CD

### Add CI/CD Variables

Go to **Project Settings** → **CI/CD** → **Variables** and add:

| Variable                      | Value              | Protected | Masked |
| ----------------------------- | ------------------ | --------- | ------ |
| `CLAUDE_CODE_GL_ACCESS_TOKEN` | Your GitLab token  | ✓         | ✓      |
| `ANTHROPIC_API_KEY`           | Your Anthropic key | ✓         | ✓      |

_Note: Use either `ANTHROPIC_API_KEY` OR `CLAUDE_CODE_OAUTH_TOKEN`, not both_

### Add Pipeline Configuration

Add to your project's `.gitlab-ci.yml`:

```yaml
# Include the Claude Code pipeline
include:
  - remote: "https://raw.githubusercontent.com/hyperremix/claude-code-for-gitlab/main/gitlab-claude-unified.yml"

# Configure authentication
variables:
  CLAUDE_CODE_GL_ACCESS_TOKEN: $CLAUDE_CODE_GL_ACCESS_TOKEN
  ANTHROPIC_API_KEY: $ANTHROPIC_API_KEY
  # OR use: CLAUDE_CODE_OAUTH_TOKEN: $CLAUDE_CODE_OAUTH_TOKEN
```

## Step 5: Test the Integration

1. **Create a test issue**:

   ```
   Title: Test Claude Integration
   Description: Testing @claude integration
   ```

2. **Add a comment**:

   ```
   @claude Can you explain what this project does and suggest an improvement?
   ```

3. **Watch the magic**:
   - Webhook server receives the event
   - GitLab pipeline is triggered automatically
   - Claude analyzes your project and responds in the comment
   - Progress is shown with checkboxes ✓

## Verification Checklist

- [ ] Webhook server returns `{"status":"ok"}` on `/health`
- [ ] GitLab webhook shows successful delivery
- [ ] CI/CD variables are set and masked
- [ ] Pipeline includes Claude Code configuration
- [ ] Test comment with `@claude` triggers pipeline
- [ ] Claude responds with analysis and suggestions

## Common Issues

### Webhook Not Triggering

```bash
# Check webhook server logs
docker logs gitlab-claude-webhook

# Verify webhook secret matches
grep WEBHOOK_SECRET .env
```

### Pipeline Not Starting

1. Check workflow rules in `.gitlab-ci.yml` include `if: $CLAUDE_TRIGGER == "true"`
2. Verify CI/CD variables are set correctly
3. Check GitLab token has `api` scope

### Authentication Errors

1. Verify tokens haven't expired
2. Check variable names match exactly
3. Ensure tokens have required scopes

## Next Steps

### Optional Enhancements

1. **Discord Notifications**:

   ```bash
   echo "DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/..." >> .env
   docker-compose restart
   ```

2. **Custom Trigger Phrase**:

   ```bash
   echo "TRIGGER_PHRASE=@ai" >> .env
   docker-compose restart
   ```

3. **Rate Limit Adjustment**:

   ```bash
   echo "RATE_LIMIT_MAX=5" >> .env  # 5 triggers per 15 minutes
   docker-compose restart
   ```

### Advanced Configuration

For more advanced setup options, see:

- [Authentication Guide](AUTHENTICATION_GUIDE.md) - Comprehensive authentication setup
- [Webhook Deployment Guide](WEBHOOK_DEPLOYMENT.md) - Advanced deployment options
- [Troubleshooting Guide](TROUBLESHOOTING.md) - Common issues and solutions

## Usage Examples

### Basic Questions

```
@claude What does this function do?
@claude How can I improve the performance of this code?
@claude Explain the architecture of this project
```

### Code Implementation

```
@claude Add error handling to the login function
@claude Implement user authentication for this API
@claude Fix the TypeScript errors in this file
```

### Code Review

```
@claude Review this merge request and suggest improvements
@claude Check for security vulnerabilities in this code
@claude Analyze the test coverage and suggest additional tests
```

### Bug Fixes

```
@claude Fix the bug shown in this screenshot [upload image]
@claude Debug why the tests are failing
@claude Resolve the memory leak in this component
```

## Getting Help

- **Documentation**: Check the [main README](../README.md) for comprehensive info
- **Issues**: Create issues in the [GitHub repository](https://github.com/hyperremix/claude-code-for-gitlab)
- **Detailed Guides**: See `/docs/` folder for specific topics
- **Webhook Server**: Check [gitlab-app/README.md](../gitlab-app/README.md) for server-specific docs

## Security Notes

🔒 **Important Security Practices**:

- Never commit API keys or tokens to version control
- Always use GitLab CI/CD variables for secrets
- Mark sensitive variables as Protected and Masked
- Regularly rotate tokens and webhook secrets
- Use HTTPS for webhook endpoints in production
- Monitor webhook server logs for suspicious activity

Your Claude Code integration is now ready! Start by mentioning `@claude` in any issue or merge request comment.
