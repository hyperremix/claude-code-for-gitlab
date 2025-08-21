# Claude Code Base Action

This GitHub Action allows you to run [Claude Code](https://www.anthropic.com/claude-code) within your GitHub Actions workflows. You can use this to build any custom workflow on top of Claude Code.

For simply tagging @claude in issues and PRs out of the box, [check out the Claude Code action and GitHub app](https://github.com/anthropics/claude-code-action).

## Usage

Add the following to your workflow file:

```yaml
# Using a direct prompt
- name: Run Claude Code with direct prompt
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Your prompt here"
    allowed_tools: "Bash(git:*),View,GlobTool,GrepTool,BatchTool"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}

# Or using a prompt from a file
- name: Run Claude Code with prompt file
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt_file: "/path/to/prompt.txt"
    allowed_tools: "Bash(git:*),View,GlobTool,GrepTool,BatchTool"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}

# Or limiting the conversation turns
- name: Run Claude Code with limited turns
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Your prompt here"
    allowed_tools: "Bash(git:*),View,GlobTool,GrepTool,BatchTool"
    max_turns: "5" # Limit conversation to 5 turns
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}

# Using custom system prompts
- name: Run Claude Code with custom system prompt
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Build a REST API"
    system_prompt: "You are a senior backend engineer. Focus on security, performance, and maintainability."
    allowed_tools: "Bash(git:*),View,GlobTool,GrepTool,BatchTool"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}

# Or appending to the default system prompt
- name: Run Claude Code with appended system prompt
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Create a database schema"
    append_system_prompt: "After writing code, be sure to code review yourself."
    allowed_tools: "Bash(git:*),View,GlobTool,GrepTool,BatchTool"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}

# Using custom environment variables
- name: Run Claude Code with custom environment variables
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Deploy to staging environment"
    claude_env: |
      ENVIRONMENT: staging
      API_URL: https://api-staging.example.com
      DEBUG: true
    allowed_tools: "Bash(git:*),View,GlobTool,GrepTool,BatchTool"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}

# Using fallback model for handling API errors
- name: Run Claude Code with fallback model
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Review and fix TypeScript errors"
    model: "claude-opus-4-20250514"
    fallback_model: "claude-sonnet-4-20250514"
    allowed_tools: "Bash(git:*),View,GlobTool,GrepTool,BatchTool"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}

# Using OAuth token instead of API key
- name: Run Claude Code with OAuth token
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Update dependencies"
    allowed_tools: "Bash(git:*),View,GlobTool,GrepTool,BatchTool"
    claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
```

## Inputs

| Input                     | Description                                                                                       | Required | Default                      |
| ------------------------- | ------------------------------------------------------------------------------------------------- | -------- | ---------------------------- |
| `prompt`                  | The prompt to send to Claude Code                                                                 | No\*     | ''                           |
| `prompt_file`             | Path to a file containing the prompt to send to Claude Code                                       | No\*     | ''                           |
| `allowed_tools`           | Comma-separated list of allowed tools for Claude Code to use                                      | No       | ''                           |
| `disallowed_tools`        | Comma-separated list of disallowed tools that Claude Code cannot use                              | No       | ''                           |
| `max_turns`               | Maximum number of conversation turns (default: no limit)                                          | No       | ''                           |
| `mcp_config`              | Path to the MCP configuration JSON file, or MCP configuration JSON string                         | No       | ''                           |
| `settings`                | Path to Claude Code settings JSON file, or settings JSON string                                   | No       | ''                           |
| `system_prompt`           | Override system prompt                                                                            | No       | ''                           |
| `append_system_prompt`    | Append to system prompt                                                                           | No       | ''                           |
| `claude_env`              | Custom environment variables to pass to Claude Code execution (YAML multiline format)             | No       | ''                           |
| `model`                   | Model to use (provider-specific format required for Bedrock/Vertex)                               | No       | 'claude-4-0-sonnet-20250219' |
| `anthropic_model`         | DEPRECATED: Use 'model' instead                                                                   | No       | 'claude-4-0-sonnet-20250219' |
| `fallback_model`          | Enable automatic fallback to specified model when default model is overloaded                     | No       | ''                           |
| `timeout_minutes`         | Timeout in minutes for Claude Code execution                                                      | No       | '10'                         |
| `anthropic_api_key`       | Anthropic API key (required for direct Anthropic API)                                             | No       | ''                           |
| `claude_code_oauth_token` | Claude Code OAuth token (alternative to anthropic_api_key)                                        | No       | ''                           |
| `use_bedrock`             | Use Amazon Bedrock with OIDC authentication instead of direct Anthropic API                       | No       | 'false'                      |
| `use_vertex`              | Use Google Vertex AI with OIDC authentication instead of direct Anthropic API                     | No       | 'false'                      |
| `use_node_cache`          | Whether to use Node.js dependency caching (set to true only for Node.js projects with lock files) | No       | 'false'                      |

\*Either `prompt` or `prompt_file` must be provided, but not both.

## Outputs

| Output           | Description                                                |
| ---------------- | ---------------------------------------------------------- |
| `conclusion`     | Execution status of Claude Code ('success' or 'failure')   |
| `execution_file` | Path to the JSON file containing Claude Code execution log |

## Environment Variables

The following environment variables can be used to configure the action:

| Variable                  | Description                                                                                    | Default |
| ------------------------- | ---------------------------------------------------------------------------------------------- | ------- |
| `NODE_VERSION`            | Node.js version to use (e.g., '18.x', '20.x', '22.x')                                          | '18.x'  |
| `ANTHROPIC_BASE_URL`      | Base URL for Anthropic API or LiteLLM proxy (enables LiteLLM proxy support when non-Anthropic) | ''      |

Example usage:

```yaml
- name: Run Claude Code with Node.js 20
  uses: anthropics/claude-code-base-action@beta
  env:
    NODE_VERSION: "20.x"
  with:
    prompt: "Your prompt here"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

## Custom Environment Variables

You can pass custom environment variables to Claude Code execution using the `claude_env` input. This allows Claude to access environment-specific configuration during its execution.

The `claude_env` input accepts YAML multiline format with key-value pairs:

```yaml
- name: Deploy with custom environment
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Deploy the application to the staging environment"
    claude_env: |
      ENVIRONMENT: staging
      API_BASE_URL: https://api-staging.example.com
      DATABASE_URL: ${{ secrets.STAGING_DB_URL }}
      DEBUG: true
      LOG_LEVEL: debug
    allowed_tools: "Bash(git:*),View,GlobTool,GrepTool,BatchTool"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Features

- **YAML Format**: Use standard YAML key-value syntax (`KEY: value`)
- **Multiline Support**: Define multiple environment variables in a single input
- **Comments**: Lines starting with `#` are ignored
- **GitHub Secrets**: Can reference GitHub secrets using `${{ secrets.SECRET_NAME }}`
- **Runtime Access**: Environment variables are available to Claude during execution

### Example Use Cases

```yaml
# Development configuration
claude_env: |
  NODE_ENV: development
  API_URL: http://localhost:3000
  DEBUG: true

# Production deployment
claude_env: |
  NODE_ENV: production
  API_URL: https://api.example.com
  DATABASE_URL: ${{ secrets.PROD_DB_URL }}
  REDIS_URL: ${{ secrets.REDIS_URL }}

# Feature flags and configuration
claude_env: |
  FEATURE_NEW_UI: enabled
  MAX_RETRIES: 3
  TIMEOUT_MS: 5000
```

## Using Settings Configuration

You can provide Claude Code settings configuration in two ways:

### Option 1: Settings Configuration File

Provide a path to a JSON file containing Claude Code settings:

```yaml
- name: Run Claude Code with settings file
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Your prompt here"
    settings: "path/to/settings.json"
    allowed_tools: "Bash(git:*),View,GlobTool,GrepTool,BatchTool"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Option 2: Inline Settings Configuration

Provide the settings configuration directly as a JSON string:

```yaml
- name: Run Claude Code with inline settings
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Your prompt here"
    settings: |
      {
        "model": "claude-opus-4-20250514",
        "env": {
          "DEBUG": "true",
          "API_URL": "https://api.example.com"
        },
        "permissions": {
          "allow": ["Bash", "Read"],
          "deny": ["WebFetch"]
        },
        "hooks": {
          "PreToolUse": [{
            "matcher": "Bash",
            "hooks": [{
              "type": "command",
              "command": "echo Running bash command..."
            }]
          }]
        }
      }
    allowed_tools: "Bash(git:*),View,GlobTool,GrepTool,BatchTool"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

The settings file supports all Claude Code settings options including:

- `model`: Override the default model
- `env`: Environment variables for the session
- `permissions`: Tool usage permissions
- `hooks`: Pre/post tool execution hooks
- `includeCoAuthoredBy`: Include co-authored-by in git commits
- And more...

**Note**: The `enableAllProjectMcpServers` setting is always set to `true` by this action to ensure MCP servers work correctly.

## Using MCP Config

You can provide MCP configuration in two ways:

### Option 1: MCP Configuration File

Provide a path to a JSON file containing MCP configuration:

```yaml
- name: Run Claude Code with MCP config file
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Your prompt here"
    mcp_config: "path/to/mcp-config.json"
    allowed_tools: "Bash(git:*),View,GlobTool,GrepTool,BatchTool"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Option 2: Inline MCP Configuration

Provide the MCP configuration directly as a JSON string:

```yaml
- name: Run Claude Code with inline MCP config
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Your prompt here"
    mcp_config: |
      {
        "mcpServers": {
          "server-name": {
            "command": "node",
            "args": ["./server.js"],
            "env": {
              "API_KEY": "your-api-key"
            }
          }
        }
      }
    allowed_tools: "Bash(git:*),View,GlobTool,GrepTool,BatchTool"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

The MCP config file should follow this format:

```json
{
  "mcpServers": {
    "server-name": {
      "command": "node",
      "args": ["./server.js"],
      "env": {
        "API_KEY": "your-api-key"
      }
    }
  }
}
```

You can combine MCP config with other inputs like allowed tools:

```yaml
# Using multiple inputs together
- name: Run Claude Code with MCP and custom tools
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Access the custom MCP server and use its tools"
    mcp_config: "mcp-config.json"
    allowed_tools: "Bash(git:*),View,mcp__server-name__custom_tool"
    timeout_minutes: "15"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

## Example: PR Code Review

```yaml
name: Claude Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  code-review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Code Review with Claude
        id: code-review
        uses: anthropics/claude-code-base-action@beta
        with:
          prompt: "Review the PR changes. Focus on code quality, potential bugs, and performance issues. Suggest improvements where appropriate. Write your review as markdown text."
          allowed_tools: "Bash(git diff --name-only HEAD~1),Bash(git diff HEAD~1),View,GlobTool,GrepTool,Write"
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Extract and Comment PR Review
        if: steps.code-review.outputs.conclusion == 'success'
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            const fs = require('fs');
            const executionFile = '${{ steps.code-review.outputs.execution_file }}';
            const executionLog = JSON.parse(fs.readFileSync(executionFile, 'utf8'));

            // Extract the review content from the execution log
            // The execution log contains the full conversation including Claude's responses
            let review = '';

            // Find the last assistant message which should contain the review
            for (let i = executionLog.length - 1; i >= 0; i--) {
              if (executionLog[i].role === 'assistant') {
                review = executionLog[i].content;
                break;
              }
            }

            if (review) {
              github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: "## Claude Code Review\n\n" + review + "\n\n*Generated by Claude Code*"
              });
            }
```

Check out additional examples in [`./examples`](./examples).

## Using Cloud Providers

You can authenticate with Claude using any of these methods:

1. Direct Anthropic API (default) - requires API key or OAuth token
2. Amazon Bedrock - requires OIDC authentication and automatically uses cross-region inference profiles
3. Google Vertex AI - requires OIDC authentication

**Note**:

- Bedrock and Vertex use OIDC authentication exclusively
- AWS Bedrock automatically uses cross-region inference profiles for certain models
- For cross-region inference profile models, you need to request and be granted access to the Claude models in all regions that the inference profile uses
- The Bedrock API endpoint URL is automatically constructed using the AWS_REGION environment variable (e.g., `https://bedrock-runtime.us-west-2.amazonaws.com`)
- You can override the Bedrock API endpoint URL by setting the `ANTHROPIC_BEDROCK_BASE_URL` environment variable

### Model Configuration

Use provider-specific model names based on your chosen provider:

```yaml
# For direct Anthropic API (default)
- name: Run Claude Code with Anthropic API
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Your prompt here"
    model: "claude-3-7-sonnet-20250219"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}

# For Amazon Bedrock (requires OIDC authentication)
- name: Configure AWS Credentials (OIDC)
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}
    aws-region: us-west-2

- name: Run Claude Code with Bedrock
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Your prompt here"
    model: "anthropic.claude-3-7-sonnet-20250219-v1:0"
    use_bedrock: "true"

# For Google Vertex AI (requires OIDC authentication)
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
    service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}

- name: Run Claude Code with Vertex AI
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Your prompt here"
    model: "claude-3-7-sonnet@20250219"
    use_vertex: "true"
```

## Example: Using OIDC Authentication for AWS Bedrock

This example shows how to use OIDC authentication with AWS Bedrock:

```yaml
- name: Configure AWS Credentials (OIDC)
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}
    aws-region: us-west-2

- name: Run Claude Code with AWS OIDC
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Your prompt here"
    use_bedrock: "true"
    model: "anthropic.claude-3-7-sonnet-20250219-v1:0"
    allowed_tools: "Bash(git:*),View,GlobTool,GrepTool,BatchTool"
```

## Example: Using OIDC Authentication for GCP Vertex AI

This example shows how to use OIDC authentication with GCP Vertex AI:

```yaml
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
    service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}

- name: Run Claude Code with GCP OIDC
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Your prompt here"
    use_vertex: "true"
    model: "claude-3-7-sonnet@20250219"
    allowed_tools: "Bash(git:*),View,GlobTool,GrepTool,BatchTool"
```

## LiteLLM Proxy Support

Claude Code Base Action now supports transparent routing through LiteLLM proxy servers, enabling access to alternative model providers while maintaining full compatibility with the existing Anthropic API integration.

### What is LiteLLM Proxy?

[LiteLLM](https://github.com/BerriAI/litellm) is a proxy server that provides a unified interface to 100+ LLMs, including OpenAI, Azure OpenAI, AWS Bedrock, Google Vertex AI, Anthropic, and more. It translates incoming requests to the format expected by each provider while maintaining a consistent API interface.

### Enabling LiteLLM Proxy Support

To use LiteLLM proxy with Claude Code, simply set the `ANTHROPIC_BASE_URL` environment variable to your LiteLLM proxy endpoint. The action automatically detects LiteLLM proxy usage when the base URL points to a non-Anthropic domain.

```yaml
- name: Run Claude Code with LiteLLM Proxy
  uses: anthropics/claude-code-base-action@beta
  env:
    ANTHROPIC_BASE_URL: "http://localhost:4000" # Your LiteLLM proxy URL
  with:
    prompt: "Analyze this codebase and suggest improvements"
    model: "claude-3-5-sonnet-20241022" # Primary model
    allowed_tools: "Bash(git:*),View,GlobTool,GrepTool,BatchTool"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }} # Still required for authentication
```

### Configuration Options

When using LiteLLM proxy, you have access to these additional configuration options:

| Environment Variable      | Description                                                       | Example                 |
| ------------------------- | ----------------------------------------------------------------- | ----------------------- |
| `ANTHROPIC_BASE_URL`      | LiteLLM proxy server URL (automatically enables proxy mode)       | `http://localhost:4000` |

### Authentication

Even when using LiteLLM proxy, you still need to provide authentication via `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN`. The LiteLLM proxy server handles the translation to the target provider's authentication format.

### Example: Multi-Provider Setup

```yaml
# Example: Using different providers through LiteLLM proxy
- name: Run Claude Code with OpenAI via LiteLLM
  uses: anthropics/claude-code-base-action@beta
  env:
    ANTHROPIC_BASE_URL: "https://your-litellm-server.com"
  with:
    prompt: "Review this pull request for security issues"
    model: "gpt-4o"
    fallback_model: "claude-3-5-sonnet-20241022"
    allowed_tools: "Bash(git:*),View,GlobTool,GrepTool,BatchTool"
    anthropic_api_key: ${{ secrets.LITELLM_API_KEY }}

# Example: Using Azure OpenAI via LiteLLM
- name: Run Claude Code with Azure OpenAI via LiteLLM
  uses: anthropics/claude-code-base-action@beta
  env:
    ANTHROPIC_BASE_URL: "https://your-litellm-server.com"
  with:
    prompt: "Generate unit tests for the new features"
    model: "azure/gpt-4o"
    allowed_tools: "Bash(git:*),View,GlobTool,GrepTool,Write"
    anthropic_api_key: ${{ secrets.LITELLM_API_KEY }}
```

### Model Selection Best Practices

When using LiteLLM proxy, consider these model selection strategies:

1. **Primary Model**: Use for main reasoning and complex tasks

   - `claude-3-5-sonnet-20241022` - Excellent for code analysis
   - `gpt-4o` - Strong general reasoning capabilities
   - `azure/gpt-4o` - Enterprise-grade OpenAI access

2. **Fallback Model**: Use for quick operations

   - `gpt-4o-mini` - Fast and cost-effective for simple tasks
   - `claude-3-haiku-20240307` - Quick responses for basic operations

### Setting Up LiteLLM Proxy Server

Here's a minimal example of setting up a LiteLLM proxy server:

```yaml
# docker-compose.yml for LiteLLM proxy
version: "3.8"
services:
  litellm:
    image: ghcr.io/berriai/litellm:main-latest
    ports:
      - "4000:4000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - AZURE_API_KEY=${AZURE_API_KEY}
      - AZURE_API_BASE=${AZURE_API_BASE}
    volumes:
      - ./litellm-config.yaml:/app/config.yaml
    command:
      ["--config", "/app/config.yaml", "--port", "4000", "--num_workers", "8"]
```

```yaml
# litellm-config.yaml
model_list:
  - model_name: claude-3-5-sonnet-20241022
    litellm_params:
      model: claude-3-5-sonnet-20241022
      api_key: os.environ/ANTHROPIC_API_KEY

  - model_name: gpt-4o
    litellm_params:
      model: gpt-4o
      api_key: os.environ/OPENAI_API_KEY

  - model_name: azure/gpt-4o
    litellm_params:
      model: azure/gpt-4o
      api_key: os.environ/AZURE_API_KEY
      api_base: os.environ/AZURE_API_BASE

general_settings:
  master_key: your-master-key
```

### Benefits of LiteLLM Proxy Integration

1. **Multi-Provider Access**: Use different AI providers through a single interface
2. **Cost Optimization**: Route requests to most cost-effective models
3. **Reliability**: Automatic failover between providers
4. **Rate Limiting**: Built-in request throttling and queueing
5. **Monitoring**: Centralized logging and metrics
6. **Backwards Compatibility**: No changes needed to existing workflows

### Troubleshooting

Common issues and solutions:

1. **Authentication Errors**: Ensure your LiteLLM proxy is configured with correct API keys for target providers
2. **Model Not Found**: Verify the model name matches your LiteLLM proxy configuration
3. **Connection Timeout**: Check network connectivity to your LiteLLM proxy server
4. **Rate Limiting**: Configure appropriate rate limits in your LiteLLM proxy setup

For more information about LiteLLM configuration, visit the [official LiteLLM documentation](https://docs.litellm.ai/).

## Security Best Practices

**⚠️ IMPORTANT: Never commit API keys directly to your repository! Always use GitHub Actions secrets.**

To securely use your Anthropic API key:

1. Add your API key as a repository secret:

   - Go to your repository's Settings
   - Navigate to "Secrets and variables" → "Actions"
   - Click "New repository secret"
   - Name it `ANTHROPIC_API_KEY`
   - Paste your API key as the value

2. Reference the secret in your workflow:

   ```yaml
   anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
   ```

**Never do this:**

```yaml
# ❌ WRONG - Exposes your API key
anthropic_api_key: "sk-ant-..."
```

**Always do this:**

```yaml
# ✅ CORRECT - Uses GitHub secrets
anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

This applies to all sensitive values including API keys, access tokens, and credentials.
We also recommend that you always use short-lived tokens when possible

## License

This project is licensed under the MIT License—see the LICENSE file for details.
