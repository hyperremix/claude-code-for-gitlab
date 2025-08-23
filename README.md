![Claude Code responding to a comment](./docs/assets/claude-code-response.png)

# 🦊 Claude Code for GitLab

A GitLab-specific implementation of [Claude Code](https://claude.ai/code) that brings AI-powered assistance to GitLab merge requests and issues. This project enables Claude to respond to mentions in GitLab comments, implement code changes, and provide intelligent code assistance directly within your GitLab workflow.

## Key Features

- 🤖 **Interactive Code Assistant**: Claude can answer questions about code, architecture, and programming
- 🔍 **Code Review**: Analyzes MR changes and suggests improvements
- ✨ **Code Implementation**: Can implement simple fixes, refactoring, and even new features
- 💬 **MR/Issue Integration**: Works seamlessly with GitLab comments and merge request reviews
- 🛠️ **Flexible Tool Access**: Access to GitLab APIs and file operations
- 📋 **Progress Tracking**: Real-time updates in GitLab comments as Claude completes tasks
- 🏃 **Runs on Your Infrastructure**: Executes entirely in your GitLab runners
- 🏢 **Enterprise Ready**: Full support for self-hosted GitLab instances with custom domains

## GitLab Quick Start

### Step 1: Deploy Webhook Service

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

Then configure webhooks in your GitLab project settings. See the [GitLab App Setup Guide](./docs/GITLAB_APP_SETUP.md) for detailed instructions.

### Step 2: Configure GitLab CI/CD

Add to your `.gitlab-ci.yml`:

```yaml
include:
  - remote: "https://raw.githubusercontent.com/hyperremix/claude-code-for-gitlab/main/gitlab-claude-unified.yml"

variables:
  CLAUDE_CODE_OAUTH_TOKEN: $CLAUDE_CODE_OAUTH_TOKEN
  # Or use: ANTHROPIC_API_KEY: $ANTHROPIC_API_KEY
```

**Requirements**:

- GitLab Runner with Docker executor
- Claude authentication (API key or OAuth token)
- Developer or higher permissions in the GitLab project

## Detailed Setup Instructions

### Setting Up GitLab Variables

1. **Navigate to your GitLab project**
2. Go to **Settings** → **CI/CD** → **Variables**
3. Add the following variables:
   - `CLAUDE_CODE_OAUTH_TOKEN`: Your Claude OAuth token (Pro/Max users can generate this by running `claude setup-token` locally)
   - OR `ANTHROPIC_API_KEY`: Your Anthropic API key
   - `CLAUDE_CODE_GL_ACCESS_TOKEN`: GitLab personal access token with `api` scope (for posting comments)

### Webhook Service Configuration

For the webhook service, you'll also need:

- `GITLAB_TOKEN`: Personal access token with `api` scope
- `WEBHOOK_SECRET`: A random secret for webhook validation
- `GITLAB_URL`: Your GitLab instance URL (defaults to <https://gitlab.com>)

See the [GitLab App Setup Guide](./docs/GITLAB_APP_SETUP.md) for complete setup instructions including:

- Creating GitLab OAuth applications
- Configuring webhooks
- Setting up for self-hosted GitLab instances
- Docker deployment options

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
| `mcp_config`              | Additional MCP configuration (JSON string) that merges with the built-in GitLab MCP servers           | No       | ""        |
| `assignee_trigger`        | The assignee username that triggers the action (e.g. @claude). Only used for issue assignment         | No       | -         |
| `label_trigger`           | The label name that triggers the action when applied to an issue (e.g. "claude")                      | No       | -         |
| `trigger_phrase`          | The trigger phrase to look for in comments, issue/MR bodies, and issue titles                         | No       | `@claude` |
| `branch_prefix`           | The prefix to use for Claude branches (defaults to 'claude/', use 'claude-' for dash format)          | No       | `claude/` |
| `claude_env`              | Custom environment variables to pass to Claude Code execution (YAML format)                           | No       | ""        |
| `settings`                | Claude Code settings as JSON string or path to settings JSON file                                     | No       | ""        |

\*Required when using direct Anthropic API (default and when not using Bedrock or Vertex)

## Examples

### Ways to Tag @claude

These examples show how to interact with Claude using comments in MRs and issues. By default, Claude will be triggered anytime you mention `@claude`, but you can customize the exact trigger phrase using the `trigger_phrase` configuration.

Claude will see the full MR context, including any comments.

#### Ask Questions

Add a comment to an MR or issue:

```
@claude What does this function do and how could we improve it?
```

Claude will analyze the code and provide a detailed explanation with suggestions.

#### Request Fixes

Ask Claude to implement specific changes:

```
@claude Can you add error handling to this function?
```

#### Code Review

Get a thorough review:

```
@claude Please review this MR and suggest improvements
```

Claude will analyze the changes and provide feedback.

#### Fix Bugs from Screenshots

Upload a screenshot of a bug and ask Claude to fix it:

```
@claude Here's a screenshot of a bug I'm seeing [upload screenshot]. Can you fix it?
```

Claude can see and analyze images, making it easy to fix visual bugs or UI issues.

### Custom Automations

These examples show how to configure Claude to act automatically based on GitLab events, without requiring manual @mentions.

#### Automated Documentation Updates

Automatically update documentation when specific files change:

```yaml
variables:
  DIRECT_PROMPT: |
    Update the API documentation in README.md to reflect
    the changes made to the API endpoints in this MR.

rules:
  - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    changes:
      - "src/api/**/*.ts"
```

When API files are modified, Claude automatically updates your README with the latest endpoint documentation and pushes the changes back to the MR.

#### Author-Specific Code Reviews

Automatically review MRs from specific authors or external contributors:

```yaml
variables:
  DIRECT_PROMPT: |
    Please provide a thorough review of this merge request.
    Pay extra attention to coding standards, security practices,
    and test coverage since this is from an external contributor.

rules:
  - if: "$CI_MERGE_REQUEST_SOURCE_PROJECT_ID != $CI_PROJECT_ID"
```

Perfect for automatically reviewing MRs from external contributors or when you need extra guidance.

#### Custom Prompt Templates

Use `override_prompt` for complete control over Claude's behavior with variable substitution:

```yaml
variables:
  OVERRIDE_PROMPT: |
    Analyze MR !$CI_MERGE_REQUEST_IID in $CI_PROJECT_PATH for security vulnerabilities.

    Changed files:
    $CHANGED_FILES

    Focus on:
    - SQL injection risks
    - XSS vulnerabilities
    - Authentication bypasses
    - Exposed secrets or credentials

    Provide severity ratings (Critical/High/Medium/Low) for any issues found.
```

## How It Works

1. **Trigger Detection**: Listens for comments containing the trigger phrase (default: `@claude`) or issue assignment to a specific user
2. **Context Gathering**: Analyzes the MR/issue, comments, code changes
3. **Smart Responses**: Either answers questions or implements changes
4. **Branch Management**: Creates new MRs for human authors, pushes directly for Claude's own MRs
5. **Communication**: Posts updates at every step to keep you informed

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

## Advanced Configuration

### Custom Environment Variables

You can pass custom environment variables to Claude Code execution using the `claude_env` configuration:

```yaml
variables:
  CLAUDE_ENV: |
    NODE_ENV: test
    CI: true
    DATABASE_URL: postgres://test:test@localhost:5432/test_db
```

The `claude_env` input accepts YAML format where each line defines a key-value pair. These environment variables will be available to Claude Code during execution.

### Limiting Conversation Turns

You can use the `max_turns` parameter to limit the number of back-and-forth exchanges Claude can have during task execution:

```yaml
variables:
  MAX_TURNS: "5" # Limit to 5 conversation turns
```

When the turn limit is reached, Claude will stop execution gracefully.

### Custom Tools

By default, Claude only has access to:

- File operations (reading, committing, editing files, read-only git commands)
- Comment management (creating/updating comments)
- Basic GitLab operations

Claude does **not** have access to execute arbitrary Bash commands by default. If you want Claude to run specific commands (e.g., npm install, npm test), you must explicitly allow them using the `allowed_tools` configuration:

```yaml
variables:
  ALLOWED_TOOLS: |
    Bash(npm install)
    Bash(npm run test)
    Edit
    Replace
  DISALLOWED_TOOLS: |
    TaskOutput
    KillTask
```

### Custom Model

Use a specific Claude model:

```yaml
variables:
  MODEL: "claude-3-5-sonnet-20241022"
```

### Network Restrictions

For enhanced security, you can restrict Claude's network access to specific domains only:

```yaml
variables:
  EXPERIMENTAL_ALLOWED_DOMAINS: |
    .anthropic.com
    .gitlab.com
    .gitlab.company.com
```

### Claude Code Settings

You can provide Claude Code settings to customize behavior such as model selection, environment variables, permissions, and hooks:

```yaml
variables:
  SETTINGS: |
    {
      "model": "claude-opus-4-20250514",
      "env": {
        "DEBUG": "true",
        "API_URL": "https://api.example.com"
      },
      "permissions": {
        "allow": ["Bash", "Read"],
        "deny": ["WebFetch"]
      }
    }
```

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

## Security

### Access Control

- **Repository Access**: The action can only be triggered by users with developer access or higher to the GitLab project
- **Token Permissions**: The GitLab token receives only the necessary permissions scoped specifically to the project it's operating in
- **No Cross-Repository Access**: Each action invocation is limited to the repository where it was triggered
- **Limited Scope**: The token cannot access other repositories or perform actions beyond the configured permissions

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

### Setting Up GitLab CI/CD Variables

1. Go to your GitLab project's Settings
2. Click on "CI/CD"
3. Expand "Variables"
4. Click "Add variable"
5. For authentication, choose one:
   - API Key: Key: `ANTHROPIC_API_KEY`, Value: Your Anthropic API key (starting with `sk-ant-`)
   - OAuth Token: Key: `CLAUDE_CODE_OAUTH_TOKEN`, Value: Your Claude Code OAuth token
6. Make sure to mark the variable as "Protected" and "Masked" for security
7. Click "Add variable"

### Best Practices for Authentication

1. ✅ Always use `$ANTHROPIC_API_KEY` or `$CLAUDE_CODE_OAUTH_TOKEN` in CI files
2. ✅ Never commit API keys or tokens to version control
3. ✅ Regularly rotate your API keys and tokens
4. ✅ Use group-level variables for organization-wide access
5. ❌ Never share API keys or tokens in merge requests or issues
6. ❌ Avoid logging variables that might contain keys

## 📚 FAQ

Having issues or questions? Check out our [Frequently Asked Questions](./FAQ.md) for solutions to common problems and detailed explanations of Claude's capabilities and limitations.

## 📖 Complete Documentation

For full documentation including all configuration options, advanced features, and troubleshooting:

- 🦊 **[GitLab Webhook Service Documentation](./gitlab-app/README.md)** - Complete guide for the webhook service
- 📚 **[GitLab App Setup Guide](./docs/GITLAB_APP_SETUP.md)** - Detailed setup instructions for GitLab
- 🔧 **[GitLab Token Troubleshooting](./docs/GITLAB_TOKEN_TROUBLESHOOTING.md)** - Common authentication issues and solutions
- 🚀 **[GitLab Examples](./examples/gitlab/)** - Sample configurations and use cases

## License

This project is licensed under the MIT License—see the LICENSE file for details.
