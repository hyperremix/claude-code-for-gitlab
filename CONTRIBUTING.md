# Contributing to Claude Code for GitLab

Thank you for your interest in contributing to Claude Code for GitLab! This document provides guidelines and instructions for contributing to the project.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) runtime
- An Anthropic API key (for testing)

### Setup

1. Fork the repository on Github and clone your fork:

   ```bash
   git clone https://github.com/your-username/claude-code-for-gitlab.git
   cd claude-code-for-gitlab
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Set up your Anthropic API key:

   ```bash
   export ANTHROPIC_API_KEY="your-api-key-here"
   ```

## Development

### Available Scripts

- `bun test` - Run all tests
- `bun run typecheck` - Type check the code
- `bun run format` - Format code with Prettier
- `bun run format:check` - Check code formatting

## Testing

### Running Tests Locally

1. **Unit Tests**:

   ```bash
   bun test
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
   ```

4. Push your branch and create a Merge Request:

   ```bash
   git push origin feature/your-feature-name
   ```

5. Ensure all CI checks pass

6. Request review from maintainers

## GitLab Integration Development

### Testing Your Changes

When modifying the GitLab integration:

1. Test in a real GitLab CI pipeline by:

   - Creating a test repository on GitLab
   - Using the unified entrypoint:

     ```yaml
     script: |
       cd /tmp/claude-code
       bun run src/entrypoints/gitlab_entrypoint.ts
     ```

### Debugging

- Use `console.log` for debugging in development
- Check GitLab CI job logs for runtime issues
- Test locally with the unified entrypoint script

## Common Issues

### Environment Variables

Make sure your GitLab CI/CD variables are properly set:

- `CLAUDE_CODE_GL_ACCESS_TOKEN` - GitLab access token
- `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN` - Claude authentication
