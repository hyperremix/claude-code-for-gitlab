# 🦊 Claude Code for GitLab

A GitLab-specific implementation of [Claude Code](https://claude.ai/code) that brings AI-powered assistance to GitLab merge requests and issues through a **webhook-only architecture**. This project enables Claude to respond to mentions in GitLab comments, implement code changes, and provide intelligent code assistance directly within your GitLab workflow.

## Key Features

- 🤖 **Interactive Code Assistant**: Claude can answer questions about code, architecture, and programming
- 🔍 **Code Review**: Analyzes MR changes and suggests improvements
- ✨ **Code Implementation**: Can implement simple fixes, refactoring, and even new features
- 💬 **MR/Issue Integration**: Works seamlessly with GitLab comments and merge request reviews
- 🛠️ **Webhook-Driven**: Reliable webhook server architecture for real-time responses
- 📋 **Progress Tracking**: Real-time updates in GitLab comments as Claude completes tasks
- 🏃 **Runs on Your Infrastructure**: Executes entirely in your GitLab runners
- 🏢 **Enterprise Ready**: Full support for self-hosted GitLab instances with custom domains

## Quick Start

**New to Claude Code for GitLab?** Follow our [📚 Quick Start Guide](docs/QUICK_START.md) to get up and running in 10 minutes.

## Documentation

### Setup Guides

- **[📚 Quick Start Guide](docs/QUICK_START.md)** - Get up and running in 10 minutes
- **[🔐 Authentication Guide](docs/AUTHENTICATION_GUIDE.md)** - Complete authentication setup and troubleshooting
- **[🚀 Webhook Deployment Guide](docs/WEBHOOK_DEPLOYMENT.md)** - Advanced webhook server deployment options

### Troubleshooting and Support

- **[🔧 Troubleshooting Guide](docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[❓ FAQ](FAQ.md)** - Frequently asked questions
- **[🦊 Webhook Server Documentation](gitlab-app/README.md)** - Webhook server specific details

### For Developers

- **[👨‍💻 Contributing Guide](CONTRIBUTING.md)** - Development setup and contribution guidelines
- **[📖 Claude Documentation](CLAUDE.md)** - Claude-specific technical details
- **[📝 Examples](examples/README.md)** - Sample configurations and use cases

## Architecture Overview

Claude Code for GitLab uses a **webhook-only architecture** that provides:

- **Simplified Setup** - Single webhook server handles all GitLab integration
- **Reliable Triggering** - Direct webhook events ensure consistent operation
- **Rate Limiting** - Built-in rate limiting (3 triggers per user per resource per 15 minutes)
- **Branch Management** - Automatic branch creation for issues
- **Pipeline Management** - Cancels old pipelines and starts new ones
- **Discord Integration** - Optional Discord notifications for results

## How It Works

1. **Webhook Trigger**: User mentions @claude in GitLab issue/MR comment
2. **Server Processing**: Webhook server validates, creates branches, and triggers pipeline
3. **Pipeline Execution**: GitLab CI/CD runs Claude Code with provided context
4. **Result Handling**: Claude's output is posted back to GitLab

## Configuration

For detailed configuration options and advanced setup, see:

- **[Authentication Guide](docs/AUTHENTICATION_GUIDE.md)** - Token setup and security
- **[Webhook Deployment Guide](docs/WEBHOOK_DEPLOYMENT.md)** - Advanced deployment options
- **[Webhook Server Documentation](gitlab-app/README.md)** - Server-specific configuration

## Usage Examples

### Basic Questions

```
@claude What does this function do and how could we improve it?
@claude How can I improve the performance of this code?
@claude Explain the architecture of this project
```

### Code Implementation

```
@claude Can you add error handling to this function?
@claude Implement user authentication for this API
@claude Fix the TypeScript errors in this file
```

### Code Review

```
@claude Please review this MR and suggest improvements
@claude Check for security vulnerabilities in this code
@claude Analyze the test coverage and suggest additional tests
```

### Bug Fixes

```
@claude Here's a screenshot of a bug I'm seeing [upload screenshot]. Can you fix it?
@claude Debug why the tests are failing
@claude Resolve the memory leak in this component
```

For more examples and detailed usage patterns, see the [Examples Documentation](examples/README.md).

## Capabilities and Limitations

### What Claude Can Do

- **Answer Questions**: Analyze code and provide explanations
- **Implement Code Changes**: Make simple to moderate code changes based on requests
- **Create Merge Requests**: Creates commits on a branch and links back to a prefilled MR creation page
- **Perform Code Reviews**: Analyze MR changes and provide detailed feedback
- **Smart Branch Handling**: Automatically creates branches for issues, uses existing MR branches
- **Progress Tracking**: Updates a single comment with progress and results

### What Claude Cannot Do

- **Submit MR Reviews**: Claude cannot submit formal GitLab MR reviews (security restriction)
- **Approve MRs**: For security reasons, Claude cannot approve merge requests
- **Execute Arbitrary Commands**: Cannot run bash commands unless explicitly allowed
- **Cross-Repository Access**: Limited to the specific repository where triggered

For detailed capabilities and troubleshooting, see the [Troubleshooting Guide](docs/TROUBLESHOOTING.md).

## Security

### Access Control and Best Practices

- **Repository Access**: Only users with Developer+ access can trigger Claude
- **Token Permissions**: GitLab tokens use minimal required scopes
- **Webhook Validation**: HMAC signatures validate all webhook requests
- **Rate Limiting**: Built-in protection against abuse (configurable)

### 🔒 Critical Security Guidelines

**Never hardcode API keys or tokens in GitLab CI files!** Always use GitLab CI/CD variables:

```yaml
# CORRECT ✅
variables:
  ANTHROPIC_API_KEY: $ANTHROPIC_API_KEY
  CLAUDE_CODE_GL_ACCESS_TOKEN: $CLAUDE_CODE_GL_ACCESS_TOKEN

# NEVER DO THIS ❌
variables:
  ANTHROPIC_API_KEY: "sk-ant-api03-..." # Exposed and vulnerable!
```

For comprehensive security guidelines, see the [Authentication Guide](docs/AUTHENTICATION_GUIDE.md).

## Cloud Provider Support

Claude Code supports multiple authentication methods:

- **Direct Anthropic API** (default) - Use your Anthropic API key
- **Amazon Bedrock** - OIDC authentication with AWS
- **Google Vertex AI** - OIDC authentication with Google Cloud

For setup instructions, see the [Authentication Guide](docs/AUTHENTICATION_GUIDE.md).

## License

This project is licensed under the MIT License—see the LICENSE file for details.
