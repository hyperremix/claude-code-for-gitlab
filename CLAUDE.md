# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **GitLab Webhook Integration Tool** that enables Claude AI to work within GitLab workflows through a dedicated webhook server architecture. It provides intelligent code assistance, automated reviews, and AI-powered development support by listening for GitLab webhook events and triggering automated CI/CD pipelines in response to @claude mentions.

## Architecture

### Webhook-Only Architecture

The project uses a **webhook-only architecture** that consists of a standalone webhook server that:

1. **Listens** for GitLab webhook events (Note Hook for comments)
2. **Validates** webhook secrets and trigger phrases (@claude)
3. **Creates** branches automatically for issues
4. **Triggers** CI/CD pipelines with proper environment variables
5. **Provides** rate limiting and security features

### Technology Stack

- **Webhook Server**: Node.js + TypeScript with Hono framework
- **Package Manager**: Bun (for dependency management and testing)
- **GitLab Integration**: @gitbeaker/rest for GitLab API operations
- **Authentication**: GitLab Personal Access Tokens
- **Rate Limiting**: Redis-based rate limiting (3 triggers per user per resource per 15 minutes)
- **Security**: HMAC webhook validation
- **Notifications**: Optional Discord integration

### Project Structure

```bash
gitlab-app/                   # Webhook Server (Primary Component)
├── src/                      # Application source
│   ├── index.ts              # Main webhook server entry point
│   ├── gitlab.ts             # GitLab API integration
│   ├── limiter.ts            # Redis rate limiting
│   ├── discord.ts            # Discord notifications
│   ├── logger.ts             # Logging utilities
│   └── types.ts              # TypeScript definitions
├── docker-compose.yml        # Container deployment
├── Dockerfile                # Container build
└── package.json              # Application dependencies

src/                          # Supporting Libraries (Used by Webhook Server)
├── gitlab/                   # GitLab-specific integration
│   ├── context.ts            # GitLab context parsing
│   ├── webhook.ts            # Webhook handling utilities
│   ├── data/                 # Data fetching utilities
│   └── validation/           # Trigger validation
├── providers/                # SCM provider abstraction
│   ├── gitlab-provider.ts    # GitLab API provider
│   ├── provider-factory.ts   # Provider factory
│   └── scm-provider.ts       # Provider interface
├── modes/                    # Operation modes
│   ├── registry.ts           # Mode registry
│   ├── types.ts              # Mode type definitions
│   └── tag/                  # Tag mode (@claude trigger detection)
├── utils/                    # Utility functions
│   ├── retry.ts              # Retry mechanisms
│   └── temp-directory.ts     # Temporary directory handling
└── types/                    # Type definitions
    └── gitbeaker.ts          # GitLab API types

gitlab-claude-unified.yml     # Example CI/CD pipeline for webhook-triggered execution

docs/                         # Documentation
├── AUTHENTICATION_GUIDE.md   # Complete authentication setup
├── QUICK_START.md            # 10-minute setup guide
├── WEBHOOK_DEPLOYMENT.md     # Advanced deployment guide
├── TROUBLESHOOTING.md        # Issue resolution guide
├── GITLAB_CLAUDE_EXECUTION_GUIDE.md  # Webhook execution flow
├── GITLAB_CLAUDE_EXECUTION_GUIDE.md  # Webhook execution flow
└── WEBHOOK_EXAMPLES.md               # Webhook server setup guide
```

## Development Environment

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **Bun**: v1.0.0 or higher (for package management and testing)
- **GitLab Access**: Personal Access Token or OAuth setup

### Setup and Installation

```bash
# Install dependencies
bun install

# Type checking
bun run typecheck

# Run tests
bun test

# Format code
bun run format:fix
```

### Development Commands

```bash
# Development and testing
bun run typecheck          # TypeScript type checking
bun test                   # Run test suite
bun run format:fix         # Code formatting with Biome
bun run format             # Check code formatting

# GitLab integration testing
bun test test/gitlab/     # GitLab-specific tests
bun test test/providers/  # Provider tests
```

## Key Components

### GitLab Integration

- **Context Parsing** (`src/gitlab/context.ts`): Parse GitLab CI/CD environment and webhook payloads
- **Webhook Processing** (`src/gitlab/webhook.ts`): Handle GitLab webhook events
- **Data Fetching** (`src/gitlab/data/fetcher.ts`): Retrieve GitLab project data
- **Trigger Validation** (`src/gitlab/validation/trigger.ts`): Validate @claude mentions and triggers

### Provider System

- **GitLab Provider** (`src/providers/gitlab-provider.ts`): Complete GitLab API integration
- **Provider Factory** (`src/providers/provider-factory.ts`): Creates GitLab provider instances
- **SCM Interface** (`src/providers/scm-provider.ts`): Abstract provider interface

### Webhook Server Components

- **Webhook Handler** (`gitlab-app/src/index.ts`): Main webhook server entry point
- **GitLab Integration** (`gitlab-app/src/gitlab.ts`): GitLab API operations and project management
- **Rate Limiter** (`gitlab-app/src/limiter.ts`): Redis-based rate limiting functionality
- **Discord Notifications** (`gitlab-app/src/discord.ts`): Optional Discord webhook integration

## Authentication & Security

### GitLab Authentication

Support for multiple authentication methods:

1. **Personal Access Tokens**: `GITLAB_TOKEN` environment variable
2. **OAuth Tokens**: `CLAUDE_CODE_OAUTH_TOKEN` for app integration
3. **GitLab Access Tokens**: `CLAUDE_CODE_GL_ACCESS_TOKEN` for enhanced access
4. **CI/CD Variables**: `INPUT_GITLAB_TOKEN` for pipeline integration

### Token Priority Order

1. `CLAUDE_CODE_GL_ACCESS_TOKEN` (highest priority)
2. `CLAUDE_CODE_OAUTH_TOKEN` or `INPUT_CLAUDE_CODE_OAUTH_TOKEN`
3. `INPUT_GITLAB_TOKEN`
4. `GITLAB_TOKEN` (fallback)

### Required GitLab Permissions

- `api` scope for full API access
- `read_user` for user information
- `read_repository` for repository access
- `write_repository` for creating commits and branches

## Webhook Server Deployment

### Webhook Server Setup

The webhook server is the core component that handles GitLab integrations:

```bash
# Deploy webhook server using Docker Compose
cd gitlab-app
docker-compose up -d

# Or run locally for development
bun install
bun run dev
```

### GitLab Webhook Configuration

1. **Configure GitLab webhooks** to point to your webhook server endpoint
2. **Set webhook triggers** for:
   - Note (comment) events - Primary trigger for @claude mentions
   - Issue events - For issue-based workflows
   - Merge request events - For MR-based workflows
3. **Configure webhook secret** for HMAC validation

### Webhook-Triggered Pipeline Integration

When the webhook server receives a valid @claude mention, it triggers a CI/CD pipeline with this configuration:

```yaml
# Example .gitlab-ci.yml (see gitlab-claude-unified.yml)
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

### Environment Variables

```bash
# Webhook Server Configuration
GITLAB_TOKEN=your_gitlab_personal_access_token
WEBHOOK_SECRET=your_webhook_secret
ANTHROPIC_API_KEY=your_anthropic_api_key
REDIS_URL=redis://localhost:6379  # For rate limiting

# Optional
DISCORD_WEBHOOK_URL=your_discord_webhook  # For notifications
PORT=3000  # Server port (default: 3000)

# CI/CD Pipeline Variables (Set by webhook server)
CLAUDE_TRIGGER=true  # Indicates webhook-triggered execution
CI_PROJECT_ID=gitlab_project_id
CI_MERGE_REQUEST_IID=merge_request_id  # If applicable
CLAUDE_RESOURCE_ID=issue_or_mr_id
```

## Claude AI Integration

### Trigger Detection

Claude responds to mentions in:

- Merge request comments
- Issue comments
- Merge request descriptions
- Issue descriptions

Default trigger phrase: `@claude`

### Response Generation

1. Parse GitLab context (MR, issue, CI/CD state)
2. Gather relevant code files and changes
3. Generate AI-powered response
4. Post response as GitLab comment
5. Create commits/branches as needed

### Configuration Options

- **Trigger Phrase**: Customize mention trigger
- **Direct Prompt**: Execute specific instructions automatically
- **Custom Instructions**: Add context to AI responses
- **Tool Permissions**: Control which tools Claude can use

## GitLab Features Supported

### Merge Requests

- Comment analysis and responses
- Diff analysis and code review
- Automated code improvements
- Branch creation and commits
- MR description updates

### Issues

- Comment responses
- Issue analysis and solutions
- Related code file examination
- Automated issue resolution

### CI/CD Integration

- Pipeline log analysis
- Build failure troubleshooting
- Automated testing suggestions
- Deployment assistance

### Repository Operations

- File reading and editing
- Branch management
- Commit creation
- Code analysis across multiple files

## Testing

### Test Structure

```bash
test/
├── gitlab/                 # GitLab integration tests
│   ├── context.test.ts     # Context parsing
│   ├── data-fetcher.test.ts
│   └── trigger-validation.test.ts
├── providers/              # Provider tests
│   ├── gitlab-provider.test.ts
│   ├── provider-factory.test.ts
│   └── oauth-token.test.ts
├── modes/                  # Mode tests
└── fixtures/               # Test data and fixtures
```

### Running Tests

```bash
# All tests
bun test

# GitLab-specific tests
bun test test/gitlab/

# Provider tests
bun test test/providers/

# Type checking
bun run typecheck
```

## Deployment Options

### Webhook Server Deployment

The primary deployment is the webhook server that handles GitLab integrations:

```bash
# Production deployment with Docker Compose
cd gitlab-app
docker-compose up -d

# Development deployment
cd gitlab-app
bun install
bun run dev
```

### Self-Hosted GitLab

Fully compatible with self-hosted GitLab instances:

- Configure webhook endpoints to point to your webhook server
- Set `GITLAB_TOKEN` for API access to your GitLab instance
- Configure webhook secrets for HMAC validation
- Ensure network connectivity between webhook server and GitLab

### Container Deployment

```bash
# Build and run webhook server
cd gitlab-app
docker build -t claude-webhook-server .
docker run -p 3000:3000 \
  -e GITLAB_TOKEN=$GITLAB_TOKEN \
  -e WEBHOOK_SECRET=$WEBHOOK_SECRET \
  -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  claude-webhook-server

# Using Docker Compose (recommended)
docker-compose up -d
```

### Scaling and High Availability

- **Load Balancing**: Deploy multiple webhook server instances behind a load balancer
- **Redis Clustering**: Use Redis clusters for distributed rate limiting
- **Health Checks**: Built-in health check endpoints for monitoring
- **Graceful Shutdown**: Proper signal handling for zero-downtime deployments

## Important Implementation Notes

- **Webhook-Only Architecture**: Streamlined single-path integration via webhook server
- **No Database Required**: Uses GitLab API, Redis for rate limiting, and CI/CD environment variables
- **Event-Driven**: Real-time responses via GitLab webhook events (@claude mentions)
- **Security-First**: HMAC webhook validation, rate limiting, and configurable permissions
- **Stateless Design**: Webhook server is stateless and horizontally scalable
- **GitLab-Native**: Designed specifically for GitLab workflows and CI/CD pipelines
- **Self-Contained**: Minimal external dependencies, containerized deployment ready
- **Rate Limited**: Built-in protection against abuse (3 triggers per user per resource per 15 minutes)
