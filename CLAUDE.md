# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **GitLab CI/CD Integration Tool** that enables Claude AI to work directly within GitLab workflows through CI/CD pipelines, webhook processing, and merge request automation. It provides intelligent code assistance, automated reviews, and AI-powered development support integrated into GitLab projects.

## Architecture

### Technology Stack

- **Runtime**: Node.js + TypeScript
- **Package Manager**: Bun (for dependency management and testing)
- **GitLab Integration**: @gitbeaker/rest for GitLab API operations
- **Authentication**: GitLab Personal Access Tokens and OAuth tokens
- **CI/CD**: GitLab CI/CD pipeline integration
- **Webhook Processing**: Real-time GitLab webhook handling

### Project Structure

```bash
src/
├── entrypoints/              # Main entry points
│   ├── gitlab_entrypoint.ts  # GitLab CI/CD entry point
│   ├── prepare.ts            # Context preparation
│   ├── format-turns.ts       # Conversation formatting
│   └── update-comment-gitlab.ts # GitLab comment updates
├── gitlab/                   # GitLab-specific integration
│   ├── context.ts            # GitLab context parsing
│   ├── webhook.ts            # Webhook handling
│   ├── data/                 # Data fetching utilities
│   └── validation/           # Trigger validation
├── providers/                # SCM provider abstraction
│   ├── gitlab-provider.ts    # GitLab API provider
│   ├── provider-factory.ts   # Provider factory (GitLab-only)
│   └── scm-provider.ts       # Provider interface
├── modes/                    # Operation modes
│   ├── registry.ts           # Mode registry
│   ├── types.ts              # Mode type definitions
│   └── tag/                  # Tag mode implementation
├── utils/                    # Utility functions
│   ├── retry.ts              # Retry mechanisms
│   └── temp-directory.ts     # Temporary directory handling
└── types/                    # Type definitions
    └── gitbeaker.ts          # GitLab API types

gitlab-app/                   # GitLab OAuth Application (separate component)
├── src/                      # Application source
├── docker-compose.yml        # Container deployment
└── package.json              # Application dependencies

examples/                     # GitLab CI/CD examples
├── .gitlab-ci.yml            # Basic integration
├── advanced-features.gitlab-ci.yml
├── docker-integration.gitlab-ci.yml
└── include/
    └── claude-code.gitlab-ci.yml

docs/                         # Documentation
├── GITLAB_APP_SETUP.md       # OAuth app setup
├── GITLAB_CLAUDE_EXECUTION_GUIDE.md
├── GITLAB_MR_CREATION.md     # Merge request workflows
└── GITLAB_TOKEN_TROUBLESHOOTING.md
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
bun run format
```

### Development Commands

```bash
# Development and testing
bun run typecheck          # TypeScript type checking
bun test                   # Run test suite
bun run format            # Code formatting with Prettier
bun run format:check      # Check code formatting

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

### Entry Points

- **GitLab Entry** (`src/entrypoints/gitlab_entrypoint.ts`): Main GitLab CI/CD integration point
- **Preparation** (`src/entrypoints/prepare.ts`): Context and environment preparation
- **Comment Updates** (`src/entrypoints/update-comment-gitlab.ts`): GitLab comment management

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

## GitLab CI/CD Integration

### Basic Pipeline Integration

```yaml
# .gitlab-ci.yml
stages:
  - claude-review

claude-code:
  stage: claude-review
  image: node:18
  script:
    - npx @hyperremix/claude-code-for-gitlab
  variables:
    GITLAB_TOKEN: $CLAUDE_CODE_GL_ACCESS_TOKEN
  only:
    - merge_requests
```

### Webhook Integration

1. Configure GitLab webhooks to point to your Claude endpoint
2. Set webhook triggers for:
   - Merge request events
   - Issue events
   - Note (comment) events
   - Pipeline events

### Environment Variables

```bash
# Required
GITLAB_TOKEN=your_gitlab_token
CI_PROJECT_ID=gitlab_project_id

# Optional
CI_MERGE_REQUEST_IID=merge_request_id
CI_SERVER_URL=https://gitlab.com
CI_PIPELINE_URL=pipeline_url
CLAUDE_RESOURCE_ID=issue_id
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

### GitLab CI/CD Integration

Deploy as part of GitLab CI/CD pipelines using the published npm package or Docker images.

### Self-Hosted GitLab

Compatible with self-hosted GitLab instances:

- Configure `CI_SERVER_URL` for your GitLab instance
- Set up OAuth applications in GitLab admin
- Configure webhook endpoints
- Ensure network connectivity for API calls

### Container Deployment

```bash
# Using published package
npx @hyperremix/claude-code-for-gitlab

# Using Docker
docker run -e GITLAB_TOKEN=$TOKEN hyperremix/claude-code-for-gitlab
```

## Important Implementation Notes

- **GitLab-Only Architecture**: Simplified from dual-platform to GitLab-focused
- **No Database Required**: Uses GitLab API and CI/CD environment variables
- **Webhook-Driven**: Real-time responses via GitLab webhooks
- **Security-First**: Configurable tool permissions and authentication methods
- **CI/CD Native**: Designed to work seamlessly in GitLab pipelines
- **Self-Contained**: Minimal external dependencies, works in containerized environments
