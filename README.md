![Claude Code responding to a comment](./docs/assets/claude-code-response.png)

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

## Webhook-Only Architecture

Claude Code for GitLab uses a **webhook-only architecture** that provides:

- **Simplified Setup** - Single webhook server handles all GitLab integration
- **Reliable Triggering** - Direct webhook events ensure consistent operation
- **Rate Limiting** - Built-in rate limiting (3 triggers per user per resource per 15 minutes)
- **Branch Management** - Automatic branch creation for issues
- **Pipeline Management** - Cancels old pipelines and starts new ones
- **Discord Integration** - Optional Discord notifications for results

## Quick Start

### Step 1: Deploy Webhook Server

Deploy the webhook service for real-time responses to GitLab mentions:

```bash
# Using Docker
docker run -d \
  --name gitlab-claude-webhook \
  -p 3000:3000 \
  -e GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx \
  -e WEBHOOK_SECRET=your-webhook-secret-here \
  -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  ghcr.io/hyperremix/claude-code-gitlab-app:latest
```

### Step 2: Configure GitLab Webhooks

1. Go to your GitLab project's **Settings > Webhooks**
2. Add your webhook server URL
3. Configure events: **Issues events**, **Merge request events**, **Note events**
4. Set your webhook secret (same as configured in the webhook server)

### Step 3: Configure GitLab CI/CD Pipeline

Add to your `.gitlab-ci.yml`:

```yaml
include:
  - remote: "https://raw.githubusercontent.com/hyperremix/claude-code-for-gitlab/main/gitlab-claude-unified.yml"

variables:
  CLAUDE_CODE_OAUTH_TOKEN: $CLAUDE_CODE_OAUTH_TOKEN
  # Or use: ANTHROPIC_API_KEY: $ANTHROPIC_API_KEY
```

### Step 4: Start Using Claude

1. Create an issue or merge request in your GitLab project
2. Comment `@claude` with your request
3. The webhook server will automatically trigger your CI/CD pipeline
4. Claude will respond with progress updates and results

## Detailed Setup Instructions

### Webhook Server Configuration

For the webhook service, configure these environment variables:

- `GITLAB_TOKEN`: Personal access token with `api` scope
- `WEBHOOK_SECRET`: A random secret for webhook validation
- `GITLAB_URL`: Your GitLab instance URL (defaults to <https://gitlab.com>)
- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `DISCORD_WEBHOOK_URL`: (Optional) Discord webhook for notifications

### GitLab CI/CD Variables

Set up these variables in your GitLab project's **Settings** → **CI/CD** → **Variables**:

1. **Authentication** (choose one):
   - `CLAUDE_CODE_OAUTH_TOKEN`: Your Claude OAuth token (Pro/Max users)
   - `ANTHROPIC_API_KEY`: Your Anthropic API key
2. **GitLab Access**:
   - `CLAUDE_CODE_GL_ACCESS_TOKEN`: GitLab personal access token with `api` scope

### Requirements

- GitLab Runner with Docker executor
- Claude authentication (API key or OAuth token)
- Developer or higher permissions in the GitLab project
- Deployed webhook server with network access to GitLab

## Configuration Options

| Variable                  | Description                                                                                           | Required | Default   |
| ------------------------- | ----------------------------------------------------------------------------------------------------- | -------- | --------- |
| `mode`                    | Execution mode. Currently supports 'tag' (default). Future modes: 'review', 'freeform'                | No       | `tag`     |
| `anthropic_api_key`       | Anthropic API key (required for direct API, not needed for Bedrock/Vertex)                            | No\*     | -         |
| `claude_code_oauth_token` | Claude Code OAuth token (alternative to anthropic_api_key)                                            | No\*     | -         |
| `direct_prompt`           | Direct prompt for Claude to execute automatically without needing a trigger (for automated workflows) | No       | -         |
| `override_prompt`         | Complete replacement of Claude's prompt with custom template (supports variable substitution)         | No       | -         |
| `base_branch`             | The base branch to use for creating new branches (e.g., 'main', 'develop')                            | No       | -         |
| `max_turns`               | Maximum number of conversation turns Claude can take (limits back-and-forth exchanges)                | No       | -         |
| `timeout_minutes`         | Timeout in minutes for execution                                                                      | No       | `30`      |
| `gitlab_token`            | GitLab token for Claude to operate with                                                               | No       | -         |
| `model`                   | Model to use (provider-specific format required for Bedrock/Vertex)                                   | No       | -         |
| `fallback_model`          | Enable automatic fallback to specified model when primary model is unavailable                        | No       | -         |
| `use_bedrock`             | Use Amazon Bedrock with OIDC authentication instead of direct Anthropic API                           | No       | `false`   |
| `use_vertex`              | Use Google Vertex AI with OIDC authentication instead of direct Anthropic API                         | No       | `false`   |
| `allowed_tools`           | Additional tools for Claude to use (the base GitLab tools will always be included)                    | No       | ""        |
| `disallowed_tools`        | Tools that Claude should never use                                                                    | No       | ""        |
| `custom_instructions`     | Additional custom instructions to include in the prompt for Claude                                    | No       | ""        |
| `trigger_phrase`          | The trigger phrase to look for in comments, issue/MR bodies, and issue titles                         | No       | `@claude` |
| `branch_prefix`           | The prefix to use for Claude branches (defaults to 'claude/', use 'claude-' for dash format)          | No       | `claude/` |
| `claude_env`              | Custom environment variables to pass to Claude Code execution (YAML format)                           | No       | ""        |
| `settings`                | Claude Code settings as JSON string or path to settings JSON file                                     | No       | ""        |

\*Required when using direct Anthropic API (default and when not using Bedrock or Vertex)

## How the Webhook Architecture Works

1. **Webhook Trigger**: GitLab sends webhook events to your deployed webhook server
2. **Event Processing**: The webhook server validates the trigger phrase (`@claude` by default)
3. **Pipeline Triggering**: The webhook server triggers your GitLab CI/CD pipeline with context
4. **Claude Execution**: The pipeline runs Claude with the provided context
5. **Results**: Claude posts progress and results back to the GitLab issue/MR

This architecture provides:

- **Reliability**: Webhook events are more reliable than polling or scheduled triggers
- **Performance**: Immediate response to user interactions
- **Scalability**: The webhook server can handle multiple projects and repositories
- **Security**: Proper webhook validation and rate limiting

## Examples

### Basic Usage

Add a comment to an MR or issue:

```
@claude What does this function do and how could we improve it?
```

Claude will analyze the code and provide a detailed explanation with suggestions.

### Request Implementation

Ask Claude to implement specific changes:

```
@claude Can you add error handling to this function?
```

### Code Review

Get a thorough review:

```
@claude Please review this MR and suggest improvements
```

### Fix Bugs from Screenshots

Upload a screenshot of a bug and ask Claude to fix it:

```
@claude Here's a screenshot of a bug I'm seeing [upload screenshot]. Can you fix it?
```

Claude can see and analyze images, making it easy to fix visual bugs or UI issues.

## Capabilities and Limitations

### What Claude Can Do

- **Respond in a Single Comment**: Claude operates by updating a single initial comment with progress and results
- **Answer Questions**: Analyze code and provide explanations
- **Implement Code Changes**: Make simple to moderate code changes based on requests
- **Prepare Merge Requests**: Creates commits on a branch and links back to a prefilled MR creation page
- **Perform Code Reviews**: Analyze MR changes and provide detailed feedback
- **Smart Branch Handling**:
  - When triggered on an **issue**: Always creates a new branch for the work
  - When triggered on an **open MR**: Always pushes directly to the existing MR branch
  - When triggered on a **closed MR**: Creates a new branch since the original is no longer active

### What Claude Cannot Do

- **Submit MR Reviews**: Claude cannot submit formal GitLab MR reviews
- **Approve MRs**: For security reasons, Claude cannot approve merge requests
- **Post Multiple Comments**: Claude only acts by updating its initial comment
- **Execute Commands Outside Its Context**: Claude only has access to the repository and MR/issue context it's triggered in
- **Run Arbitrary Bash Commands**: By default, Claude cannot execute Bash commands unless explicitly allowed using the `allowed_tools` configuration
- **Perform Branch Operations**: Cannot merge branches, rebase, or perform other git operations beyond pushing commits

## Security

### Access Control

- **Repository Access**: The action can only be triggered by users with developer access or higher to the GitLab project
- **Token Permissions**: The GitLab token receives only the necessary permissions scoped specifically to the project it's operating in
- **No Cross-Repository Access**: Each action invocation is limited to the repository where it was triggered
- **Limited Scope**: The token cannot access other repositories or perform actions beyond the configured permissions
- **Webhook Validation**: All webhook requests are validated using HMAC signatures
- **Rate Limiting**: Built-in rate limiting prevents abuse

### ⚠️ Authentication Protection

**CRITICAL: Never hardcode your Anthropic API key or OAuth token in GitLab CI files!**

Your authentication credentials must always be stored in GitLab CI/CD variables to prevent unauthorized access:

```yaml
# CORRECT ✅
variables:
  ANTHROPIC_API_KEY: $ANTHROPIC_API_KEY
  # OR
  CLAUDE_CODE_OAUTH_TOKEN: $CLAUDE_CODE_OAUTH_TOKEN

# NEVER DO THIS ❌
variables:
  ANTHROPIC_API_KEY: "sk-ant-api03-..." # Exposed and vulnerable!
```

### Best Practices for Authentication

1. ✅ Always use `$ANTHROPIC_API_KEY` or `$CLAUDE_CODE_OAUTH_TOKEN` in CI files
2. ✅ Never commit API keys or tokens to version control
3. ✅ Regularly rotate your API keys and tokens
4. ✅ Use group-level variables for organization-wide access
5. ✅ Secure your webhook server with proper HTTPS and firewall rules
6. ❌ Never share API keys or tokens in merge requests or issues
7. ❌ Avoid logging variables that might contain keys

## Cloud Providers

You can authenticate with Claude using any of these three methods:

1. Direct Anthropic API (default)
2. Amazon Bedrock with OIDC authentication
3. Google Vertex AI with OIDC authentication

### Model Configuration

Use provider-specific model names based on your chosen provider:

```yaml
# For direct Anthropic API (default)
variables:
  ANTHROPIC_API_KEY: $ANTHROPIC_API_KEY

# For Amazon Bedrock
variables:
  MODEL: "anthropic.claude-3-7-sonnet-20250219-beta:0"
  USE_BEDROCK: "true"

# For Google Vertex AI
variables:
  MODEL: "claude-3-7-sonnet@20250219"
  USE_VERTEX: "true"
```

## 📚 FAQ

Having issues or questions? Check out our [Frequently Asked Questions](./FAQ.md) for solutions to common problems and detailed explanations of Claude's capabilities and limitations.

## 📖 Complete Documentation

For full documentation including all configuration options, advanced features, and troubleshooting:

- 🦊 **[Webhook Server Documentation](./gitlab-app/README.md)** - Complete guide for the webhook server
- 📚 **[GitLab App Setup Guide](./docs/GITLAB_APP_SETUP.md)** - Detailed setup instructions for GitLab
- 🔧 **[GitLab Token Troubleshooting](./docs/GITLAB_TOKEN_TROUBLESHOOTING.md)** - Common authentication issues and solutions
- 🚀 **[Examples and Configuration](./examples/README.md)** - Sample configurations and use cases

## License

This project is licensed under the MIT License—see the LICENSE file for details.
