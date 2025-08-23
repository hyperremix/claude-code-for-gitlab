# Claude Code for GitLab Examples

This directory contains documentation for setting up and using claude-code-for-gitlab with the webhook server architecture.

## Webhook-Only Architecture

Claude Code for GitLab now uses a **webhook-only architecture** that provides a streamlined and reliable integration approach:

### How It Works

1. **Deploy the Webhook Server** - The `gitlab-app/` directory contains a standalone Node.js webhook server
2. **Configure GitLab Webhooks** - Set up webhooks in your GitLab project to send events to the webhook server
3. **Trigger with Comments** - Comment `@claude` on issues or merge requests to trigger Claude
4. **Automatic Pipeline Execution** - The webhook server automatically triggers your CI/CD pipeline with the necessary context

### Key Benefits

- **Simplified Setup** - Single webhook server handles all GitLab integration
- **Reliable Triggering** - Direct webhook events ensure consistent operation
- **Rate Limiting** - Built-in rate limiting (3 triggers per user per resource per 15 minutes)
- **Branch Management** - Automatic branch creation for issues
- **Discord Integration** - Optional Discord notifications for results

## Setup Instructions

### 1. Deploy the Webhook Server

Follow the detailed setup instructions in [`gitlab-app/README.md`](../gitlab-app/README.md) to deploy the webhook server.

### 2. Configure Your GitLab CI/CD Pipeline

Use `gitlab-claude-unified.yml` as your GitLab CI/CD configuration. This file contains the pipeline that will be triggered by the webhook server:

```yaml
# Copy gitlab-claude-unified.yml to your project's .gitlab-ci.yml
# The webhook server will trigger this pipeline with all necessary context
```

### 3. Set Up GitLab Webhooks

Configure your GitLab project to send webhook events to your deployed webhook server:

1. Go to your GitLab project's **Settings > Webhooks**
2. Add your webhook server URL
3. Configure events: **Issues events**, **Merge request events**, **Note events**
4. Set your webhook secret (same as configured in the webhook server)

### 4. Start Using Claude

Once everything is set up:

1. Create an issue or merge request in your GitLab project
2. Comment `@claude` with your request
3. The webhook server will automatically:
   - Validate the trigger
   - Create a branch (for issues)
   - Trigger your CI/CD pipeline
   - Provide all necessary context to Claude

## Webhook Server Features

- **Trigger Validation** - Only responds to `@claude` mentions
- **Rate Limiting** - Prevents abuse with configurable limits
- **Pipeline Management** - Cancels old pipelines and starts new ones
- **Branch Creation** - Automatically creates branches for issues
- **Environment Variables** - Passes all necessary context to CI/CD jobs
- **Discord Integration** - Optional notifications for results
- **Error Handling** - Comprehensive error handling and logging

## Migration from Direct CI/CD Integration

If you were previously using direct CI/CD integration approaches, migrating to the webhook architecture provides:

- **Reduced Complexity** - No need for complex CI/CD job orchestration
- **Better Reliability** - Webhook events are more reliable than CI/CD triggers
- **Improved Performance** - Faster setup and execution times
- **Enhanced Features** - Access to all webhook server features

For migration assistance, see the webhook server documentation in [`gitlab-app/README.md`](../gitlab-app/README.md).
