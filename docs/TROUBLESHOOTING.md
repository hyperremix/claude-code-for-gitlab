# Troubleshooting Guide

This comprehensive troubleshooting guide covers common issues, error messages, and solutions for Claude Code for GitLab webhook integration.

## Table of Contents

- [Webhook Server Issues](#webhook-server-issues)
- [Authentication Issues](#authentication-issues)
- [Pipeline and Execution Issues](#pipeline-and-execution-issues)
- [GitLab Integration Issues](#gitlab-integration-issues)
- [Claude Execution Issues](#claude-execution-issues)
- [Network and Connectivity Issues](#network-and-connectivity-issues)
- [Performance Issues](#performance-issues)
- [Debugging Tools and Techniques](#debugging-tools-and-techniques)

## Webhook Server Issues

### Webhook Server Won't Start

**Symptoms**:

- Docker container exits immediately
- Health check endpoint returns errors
- Server logs show startup failures

**Common Causes and Solutions**:

1. **Invalid Environment Variables**:

   ```bash
   # Check logs for environment variable errors
   docker logs gitlab-claude-webhook

   # Verify required variables are set
   docker exec gitlab-claude-webhook env | grep -E "(GITLAB|WEBHOOK)"
   ```

2. **Redis Connection Failure**:

   ```bash
   # Check Redis connectivity
   docker-compose exec redis redis-cli ping

   # Verify Redis URL format
   echo $REDIS_URL  # Should be: redis://hostname:6379
   ```

3. **Port Conflicts**:

   ```bash
   # Check if port 3000 is already in use
   netstat -tuln | grep :3000

   # Use different port if needed
   docker run -p 3001:3000 ...
   ```

### Webhook Not Triggering

**Symptoms**:

- @claude mentions don't trigger pipelines
- GitLab webhook shows delivery failures
- No activity in webhook server logs

**Debugging Steps**:

1. **Check Webhook Server Logs**:

   ```bash
   # View real-time logs
   docker logs -f gitlab-claude-webhook

   # Look for webhook events
   docker logs gitlab-claude-webhook | grep -i "webhook\|trigger"
   ```

2. **Verify Webhook Configuration**:

   - Check GitLab webhook URL points to `/webhook` endpoint
   - Verify webhook secret matches `WEBHOOK_SECRET` environment variable
   - Ensure "Comments" trigger is enabled

3. **Test Webhook Endpoint**:

   ```bash
   # Test health endpoint
   curl https://your-webhook-server.com/health

   # Test webhook endpoint (should return 405 for GET)
   curl https://your-webhook-server.com/webhook
   ```

4. **Check GitLab Webhook Delivery**:
   - Go to GitLab project → Settings → Webhooks
   - Click on your webhook → Recent Deliveries
   - Look for failed deliveries and error messages

### Rate Limiting Issues

**Symptoms**:

- Users hit "rate limit exceeded" errors
- Webhook server logs show rate limit violations
- Discord notifications about rate limits

**Solutions**:

1. **Check Current Rate Limits**:

   ```bash
   # Check Redis for rate limit keys
   docker-compose exec redis redis-cli
   > KEYS rate_limit:*
   > TTL rate_limit:user:123:issue:456
   ```

2. **Adjust Rate Limits**:

   ```bash
   # Modify .env file
   echo "RATE_LIMIT_MAX=5" >> .env           # 5 triggers per window
   echo "RATE_LIMIT_WINDOW=600" >> .env      # 10 minutes instead of 15
   docker-compose restart
   ```

3. **Clear Rate Limits** (emergency):

   ```bash
   # Clear all rate limit keys
   docker-compose exec redis redis-cli FLUSHDB
   ```

## Authentication Issues

### GitLab Token Problems

#### "Token appears to be unexpanded"

**Error Message**:

```
ERROR: CLAUDE_CODE_GL_ACCESS_TOKEN appears to be unexpanded: "$CLAUDE_CODE_GL_ACCESS_TOKEN"
```

**Cause**: Environment variable not set in GitLab CI/CD

**Solutions**:

1. Add token to GitLab CI/CD variables (Settings → CI/CD → Variables)
2. Verify variable name matches exactly: `CLAUDE_CODE_GL_ACCESS_TOKEN`
3. Check environment scope includes your branch/deployment
4. Ensure variable is not protected if branch is not protected

#### "401 Unauthorized" Errors

**Causes and Solutions**:

1. **Invalid or Expired Token**:

   ```bash
   # Test token manually
   curl -H "Authorization: Bearer glpat-your-token-here" \
        "https://gitlab.com/api/v4/user"
   ```

2. **Insufficient Token Scopes**:

   - Ensure token has `api` scope minimum
   - Add `read_repository` and `write_repository` for full functionality

3. **User Permissions**:
   - Token user needs Developer+ access to the project
   - Check project/group access restrictions

#### "403 Forbidden" Errors

**Solutions**:

1. Grant user Developer+ access to the project
2. Check if project/group has additional restrictions
3. Verify token scopes include required permissions
4. For webhook server: ensure token user can trigger pipelines

### Claude API Authentication

#### Anthropic API Key Issues

**Common Errors**:

```
ERROR: Claude API authentication failed
ERROR: Anthropic API key invalid
```

**Solutions**:

1. **Verify API Key Format**:

   ```bash
   # Should start with sk-ant-api03-
   echo $ANTHROPIC_API_KEY | grep "^sk-ant-api03-"
   ```

2. **Test API Key**:

   ```bash
   curl -H "Authorization: Bearer sk-ant-your-key-here" \
        -H "Content-Type: application/json" \
        -d '{"model":"claude-3-haiku-20240307","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}' \
        "https://api.anthropic.com/v1/messages"
   ```

3. **Check API Credits**: Verify you have sufficient API credits in Anthropic Console

#### Claude Code OAuth Token Issues

**Solutions**:

1. Regenerate OAuth token: `claude auth login`
2. Verify token hasn't expired
3. Check Claude Code subscription status

## Pipeline and Execution Issues

### Pipeline Not Starting

**Symptoms**:

- @claude mention doesn't trigger pipeline
- No pipeline appears in GitLab CI/CD
- Webhook server shows trigger but no pipeline

**Debugging Steps**:

1. **Check Workflow Rules**:

   ```yaml
   # Ensure your .gitlab-ci.yml has correct workflow
   workflow:
     rules:
       - if: $CLAUDE_TRIGGER == "true"
   ```

2. **Verify CI/CD Variables**:

   - Check `CLAUDE_CODE_GL_ACCESS_TOKEN` is set
   - Verify authentication variables are configured
   - Ensure variables are not protected if branch isn't protected

3. **Check GitLab Token Permissions**:

   ```bash
   # Test pipeline trigger capability
   curl -X POST \
        -H "Authorization: Bearer glpat-your-token-here" \
        "https://gitlab.com/api/v4/projects/your-project-id/pipeline?ref=main"
   ```

### Pipeline Execution Failures

#### Claude Code Execution Errors

**Common Error**: "Claude Code binary not found"

**Solution**: Use the unified entrypoint:

```yaml
script:
  - cd /tmp/claude-code && bun run src/entrypoints/gitlab_entrypoint.ts
```

#### Git Configuration Issues

**Error**: "Git user not configured"

**Solution**: Add git configuration to pipeline:

```yaml
before_script:
  - git config --global user.name "Claude[bot]"
  - git config --global user.email "claude-bot@noreply.gitlab.com"
```

#### Branch Creation Failures

**Error**: "Failed to create branch"

**Solutions**:

1. Verify GitLab token has `write_repository` scope
2. Check project permissions for the token user
3. Ensure branch protection rules allow the webhook user

### Environment Variable Issues

#### Missing Required Variables

**Debug Environment Variables**:

```yaml
# Add to your pipeline for debugging
before_script:
  - echo "=== Environment Debug ==="
  - echo "CLAUDE_TRIGGER=${CLAUDE_TRIGGER}"
  - echo "CLAUDE_RESOURCE_TYPE=${CLAUDE_RESOURCE_TYPE}"
  - |
    if [ -n "$CLAUDE_CODE_GL_ACCESS_TOKEN" ]; then
      echo "CLAUDE_CODE_GL_ACCESS_TOKEN: Set (length: ${#CLAUDE_CODE_GL_ACCESS_TOKEN})"
    else
      echo "CLAUDE_CODE_GL_ACCESS_TOKEN: Not set"
    fi
```

## GitLab Integration Issues

### Webhook Delivery Failures

**Check GitLab Webhook Logs**:

1. Go to Project → Settings → Webhooks
2. Click on your webhook
3. View "Recent Deliveries" for error details

**Common Issues**:

1. **SSL Certificate Problems**:

   ```bash
   # For development with self-signed certificates only
   export NODE_TLS_REJECT_UNAUTHORIZED=0
   ```

2. **Network Connectivity**:

   ```bash
   # Test from GitLab to webhook server
   curl -I https://your-webhook-server.com/webhook
   ```

3. **HMAC Validation Failures**:
   - Verify webhook secret matches exactly
   - Check for extra whitespace in secret configuration

### Comment Posting Issues

**Symptoms**:

- Claude executes but doesn't post results
- "Failed to update comment" errors
- Results appear in pipeline logs but not in GitLab

**Solutions**:

1. **Check GitLab Token Scope**:

   ```bash
   # Token needs 'api' scope for comment posting
   curl -H "Authorization: Bearer glpat-your-token-here" \
        "https://gitlab.com/api/v4/projects/your-project-id"
   ```

2. **Verify User Permissions**:

   - Token user needs permission to comment on issues/MRs
   - Check project access level

3. **Check API Rate Limits**:
   - GitLab may rate limit API requests
   - Check for 429 errors in pipeline logs

## Claude Execution Issues

### Claude Not Responding

**Symptoms**:

- Pipeline completes but Claude doesn't provide output
- "No response from Claude" errors
- Empty or truncated responses

**Solutions**:

1. **Check Model Availability**:

   ```yaml
   variables:
     CLAUDE_MODEL: claude-3-haiku-20240307 # Try different model
   ```

2. **Increase Timeout**:

   ```yaml
   claude:
     timeout: 45m # Increase from default 30m
   ```

3. **Check Input Limits**:
   - Verify prompt isn't too long
   - Check if repository size exceeds limits

### Capabilities and Limitations

**What Claude Cannot Do**:

- Submit formal GitLab MR reviews
- Approve merge requests (security restriction)
- Execute arbitrary bash commands (unless explicitly allowed)
- Access external APIs without proper configuration

**What Claude Can Do**:

- Analyze code and provide explanations
- Implement code changes and create commits
- Create merge requests with changes
- Review MR changes and provide feedback
- Answer questions about code and architecture

## Network and Connectivity Issues

### Self-Hosted GitLab

**SSL Certificate Issues**:

```yaml
# For development only - never use in production
variables:
  GIT_SSL_NO_VERIFY: "true"
  NODE_TLS_REJECT_UNAUTHORIZED: "0"
```

**Custom Domain Configuration**:

```env
# In webhook server .env
GITLAB_URL=https://gitlab.your-company.com
```

**Network Connectivity Tests**:

```bash
# Test from webhook server to GitLab
docker exec gitlab-claude-webhook curl -I https://gitlab.your-company.com/api/v4/version

# Test from GitLab runner
ping gitlab.your-company.com
```

### Firewall and Network Issues

**Common Solutions**:

1. **Open Required Ports**:

   ```bash
   # Webhook server needs inbound access on configured port
   sudo ufw allow 3000/tcp
   ```

2. **IP Whitelisting**: Configure firewall to allow GitLab IP ranges

3. **Proxy Configuration**:

   ```env
   # For environments requiring proxy
   HTTP_PROXY=http://proxy.company.com:8080
   HTTPS_PROXY=http://proxy.company.com:8080
   ```

## Performance Issues

### Slow Pipeline Execution

**Optimization Strategies**:

1. **Use Shallow Git Clones**:

   ```yaml
   variables:
     GIT_DEPTH: 1
   ```

2. **Cache Dependencies**:

   ```yaml
   cache:
     key: claude-deps-${CI_COMMIT_REF_SLUG}
     paths:
       - /tmp/claude-code/node_modules/
   ```

3. **Optimize Docker Image**:

   ```yaml
   # Use Alpine-based images for faster startup
   image: oven/bun:1.1.29-alpine
   ```

### Memory and Resource Issues

**Solutions**:

1. **Increase Runner Resources**:

   ```yaml
   # In .gitlab-ci.yml if using specific runners
   tags:
     - large-runner # Use runners with more resources
   ```

2. **Set Resource Limits**:

   ```yaml
   variables:
     NODE_OPTIONS: "--max-old-space-size=4096" # Increase Node.js memory
   ```

## Debugging Tools and Techniques

### Webhook Server Debugging

1. **Enable Debug Logging**:

   ```env
   DEBUG=true
   NODE_ENV=development
   ```

2. **Monitor Real-time Logs**:

   ```bash
   # Follow webhook server logs
   docker logs -f gitlab-claude-webhook

   # Filter for specific events
   docker logs gitlab-claude-webhook | grep -E "(trigger|error|auth)"
   ```

3. **Check Server Health**:

   ```bash
   # Health check endpoint
   curl https://your-webhook-server.com/health

   # Should return: {"status":"ok"}
   ```

### Pipeline Debugging

1. **Add Debug Output**:

   ```yaml
   before_script:
     - echo "=== Debug Information ==="
     - echo "Pipeline triggered by: $CLAUDE_AUTHOR"
     - echo "Resource type: $CLAUDE_RESOURCE_TYPE"
     - echo "Resource ID: $CLAUDE_RESOURCE_ID"
     - echo "Direct prompt: $DIRECT_PROMPT"
   ```

2. **Test Environment Variables**:

   ```yaml
   script:
     - env | grep CLAUDE_ | sort
     - env | grep GITLAB_ | sort
   ```

### GitLab API Testing

1. **Test Token Permissions**:

   ```bash
   # Test user info
   curl -H "Authorization: Bearer glpat-your-token" \
        "https://gitlab.com/api/v4/user"

   # Test project access
   curl -H "Authorization: Bearer glpat-your-token" \
        "https://gitlab.com/api/v4/projects/your-project-id"
   ```

2. **Test Pipeline Triggering**:

   ```bash
   # Manual pipeline trigger test
   curl -X POST \
        -H "Authorization: Bearer glpat-your-token" \
        -H "Content-Type: application/json" \
        -d '{"ref":"main","variables":[{"key":"CLAUDE_TRIGGER","value":"true"}]}' \
        "https://gitlab.com/api/v4/projects/your-project-id/pipeline"
   ```

## Common Error Messages and Solutions

### "Method Not Allowed" on Webhook Endpoint

**Error**: `405 Method Not Allowed`

**Cause**: Normal behavior for GET requests to webhook endpoint

**Solution**: This is expected - webhook endpoint only accepts POST requests from GitLab

### "ECONNREFUSED" or Connection Errors

**Causes**:

- Webhook server not running
- Wrong port configuration
- Network connectivity issues

**Solutions**:

1. Verify webhook server is running: `docker ps | grep webhook`
2. Check port mapping: `docker port gitlab-claude-webhook`
3. Test local connectivity: `curl localhost:3000/health`

### "Invalid Webhook Secret"

**Error**: `Invalid webhook secret` in server logs

**Solutions**:

1. Verify webhook secret matches between GitLab and server
2. Check for whitespace or encoding issues in secret
3. Regenerate webhook secret if needed:

   ```bash
   # Generate new secret
   openssl rand -hex 32
   ```

## Getting Additional Help

### Log Collection

When seeking help, collect these logs:

1. **Webhook Server Logs**:

   ```bash
   docker logs gitlab-claude-webhook > webhook-logs.txt
   ```

2. **Pipeline Logs**: Download from GitLab CI/CD pipeline interface

3. **GitLab Webhook Delivery Logs**: Screenshot from GitLab webhook settings

4. **Configuration** (redact secrets):

   ```bash
   # Webhook server environment (redact sensitive values)
   docker exec gitlab-claude-webhook env | grep -v -E "(TOKEN|SECRET|KEY)"
   ```

### Support Resources

1. **Project Repository**: [GitHub Issues](https://github.com/hyperremix/claude-code-for-gitlab/issues)
2. **Documentation**: Check other guides in `/docs/` directory
3. **GitLab Documentation**: [GitLab Webhooks](https://docs.gitlab.com/ee/user/project/integrations/webhooks.html)
4. **Anthropic Documentation**: [Claude API](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)

### Creating Bug Reports

Include this information when reporting issues:

1. **Environment Details**:

   - Webhook server version/image tag
   - GitLab version (self-hosted vs GitLab.com)
   - Docker/container runtime version

2. **Configuration** (redacted):

   - Webhook server environment variables
   - GitLab CI/CD pipeline configuration
   - Webhook configuration in GitLab

3. **Error Details**:

   - Complete error messages
   - Relevant log excerpts
   - Steps to reproduce the issue

4. **Expected vs Actual Behavior**:
   - What you expected to happen
   - What actually happened
   - Any workarounds you've tried

This comprehensive troubleshooting guide should help resolve most common issues with Claude Code for GitLab webhook integration. For issues not covered here, please refer to the specific documentation sections or create a detailed bug report.
