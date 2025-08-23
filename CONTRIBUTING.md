# Contributing to Claude Code for GitLab

Thank you for your interest in contributing to Claude Code for GitLab! This document provides guidelines and instructions for contributing to the webhook-only GitLab integration project.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18.0.0 or higher
- [Bun](https://bun.sh/) runtime (for package management and testing)
- [Redis](https://redis.io/) server (for rate limiting)
- An Anthropic API key (for testing)
- GitLab Personal Access Token (for API testing)

### Setup

1. Fork the repository on Github and clone your fork:

   ```bash
   git clone https://github.com/your-username/claude-code-for-gitlab.git
   cd claude-code-for-gitlab
   ```

2. Install dependencies for the root project:

   ```bash
   bun install
   ```

3. Install dependencies for the webhook server:

   ```bash
   cd gitlab-app
   bun install
   cd ..
   ```

4. Set up your environment variables:

   ```bash
   # For webhook server development
   export ANTHROPIC_API_KEY="your-api-key-here"
   export GITLAB_TOKEN="your-gitlab-token"
   export WEBHOOK_SECRET="your-webhook-secret"
   export REDIS_URL="redis://localhost:6379"

   # Optional
   export DISCORD_WEBHOOK_URL="your-discord-webhook-url"
   ```

## Development

### Available Scripts

#### Root Project Scripts

- `bun test` - Run all tests
- `bun run typecheck` - Type check the code
- `bun run format` - Format code with Prettier
- `bun run format:check` - Check code formatting

#### Webhook Server Scripts

- `cd gitlab-app && bun run dev` - Run webhook server in development mode
- `cd gitlab-app && bun run build` - Build webhook server for production
- `cd gitlab-app && bun run start` - Start production webhook server
- `cd gitlab-app && bun run test` - Run webhook server tests

### Local Development Setup

1. **Start Redis server**:

   ```bash
   # Using Docker
   docker run -d -p 6379:6379 redis:alpine

   # Or install locally and start
   redis-server
   ```

2. **Run webhook server in development mode**:

   ```bash
   cd gitlab-app
   cp .env.example .env
   # Edit .env with your configuration
   bun run dev
   ```

3. **Test webhook endpoints locally**:

   ```bash
   # Health check
   curl http://localhost:3000/health

   # Test webhook endpoint (with proper GitLab webhook payload)
   curl -X POST http://localhost:3000/webhook \
     -H "Content-Type: application/json" \
     -H "X-Gitlab-Token: your-webhook-secret" \
     -d @test-payload.json
   ```

## Testing

### Running Tests Locally

1. **Unit Tests**:

   ```bash
   bun test
   ```

2. **Webhook Server Tests**:

   ```bash
   cd gitlab-app
   bun test
   ```

3. **Integration Tests**:

   ```bash
   # Start Redis for integration tests
   docker run -d -p 6379:6379 redis:alpine
   bun test test/gitlab/
   ```

## Merge Request Process

1. Create a new branch from `main`:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit them:

   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. Run tests and formatting:

   ```bash
   bun test
   bun run typecheck
   bun run format:check

   # Also test webhook server
   cd gitlab-app
   bun test
   cd ..
   ```

4. Push your branch and create a Merge Request:

   ```bash
   git push origin feature/your-feature-name
   ```

5. Ensure all CI checks pass

6. Request review from maintainers

## Webhook Server Development

### Testing Your Changes

When modifying the webhook server or GitLab integration:

1. **Local Webhook Testing**:

   - Set up ngrok or similar tool to expose local webhook server
   - Configure GitLab webhook to point to your local endpoint
   - Test with real GitLab webhook events

2. **GitLab CI Pipeline Testing**:

   - Create a test repository on GitLab
   - Configure webhook server to trigger pipelines
   - Use the example pipeline configuration:

     ```yaml
     # Use gitlab-claude-unified.yml as reference
     stages:
       - claude-response

     claude-code:
       stage: claude-response
       image: node:18
       script:
         - npx @hyperremix/claude-code-for-gitlab
       variables:
         GITLAB_TOKEN: $CI_JOB_TOKEN
       rules:
         - if: $CLAUDE_TRIGGER == "true"
     ```

### Debugging

- **Webhook Server Logs**: Check console output for webhook processing
- **GitLab Webhook Logs**: Check GitLab's webhook delivery logs
- **CI Pipeline Logs**: Check GitLab CI job logs for runtime issues
- **Redis Logs**: Monitor rate limiting and caching behavior

### Development Best Practices

1. **Always test webhook validation** - Ensure HMAC validation works correctly
2. **Test rate limiting** - Verify Redis-based rate limiting functions properly
3. **Handle webhook retries** - GitLab retries failed webhooks, handle duplicate events
4. **Validate webhook payloads** - Ensure proper payload structure validation
5. **Test branch creation** - Verify automatic branch creation for issues works

## Common Issues

### Environment Variables

Make sure your environment variables are properly set:

**Webhook Server Required:**

- `GITLAB_TOKEN` - GitLab Personal Access Token with API access
- `WEBHOOK_SECRET` - Secret for HMAC webhook validation
- `ANTHROPIC_API_KEY` - Claude API authentication

**Webhook Server Optional:**

- `REDIS_URL` - Redis connection URL (default: redis://localhost:6379)
- `DISCORD_WEBHOOK_URL` - Discord webhook for notifications
- `PORT` - Server port (default: 3000)

**CI/CD Pipeline Variables (set by webhook server):**

- `CLAUDE_TRIGGER` - Set to "true" for webhook-triggered executions
- `CI_PROJECT_ID` - GitLab project ID
- `CLAUDE_RESOURCE_ID` - Issue or MR ID

### Webhook Issues

1. **Webhook not triggering**: Check GitLab webhook configuration and delivery logs
2. **Rate limiting**: Verify Redis connection and rate limit configuration
3. **HMAC validation failures**: Ensure webhook secret matches between GitLab and server
4. **Pipeline not starting**: Check GitLab CI/CD settings and webhook server logs

### Development Environment

1. **Redis connection**: Ensure Redis server is running for rate limiting
2. **GitLab API access**: Verify token has proper scopes (api, read_user, read_repository, write_repository)
3. **Webhook delivery**: Use tools like ngrok for local webhook testing
4. **Port conflicts**: Default port 3000 may conflict with other services
