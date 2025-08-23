# Frequently Asked Questions (FAQ)

This FAQ addresses common questions and gotchas when using the Claude Code webhook server with GitLab.

## Getting Started

### How do I deploy the webhook server?

For quick setup, follow our [📚 Quick Start Guide](docs/QUICK_START.md). For advanced deployment options, see the [🚀 Webhook Deployment Guide](docs/WEBHOOK_DEPLOYMENT.md).

### Why doesn't @claude respond when I mention it?

This is usually a configuration issue. Check our [🔧 Troubleshooting Guide](docs/TROUBLESHOOTING.md) for detailed debugging steps, or try these quick checks:

1. **Webhook Configuration**: Ensure webhook points to your server at `/webhook`
2. **Secret Token**: Verify webhook secret matches your server configuration
3. **Server Running**: Check that your webhook server is accessible
4. **Permissions**: Ensure the user has Developer+ permissions
5. **Rate Limiting**: Check if you've hit the rate limit (3 per 15 minutes)

### How do I handle authentication errors?

Authentication issues are covered comprehensively in our [🔐 Authentication Guide](docs/AUTHENTICATION_GUIDE.md). For quick troubleshooting, see the [🔧 Troubleshooting Guide](docs/TROUBLESHOOTING.md#authentication-issues).

## Claude's Capabilities and Limitations

### What can Claude actually do?

Claude can analyze code, implement changes, create merge requests, and provide code reviews. For a complete list of capabilities and limitations, see the [Capabilities section](README.md#capabilities-and-limitations) in the main README.

### Why won't Claude update GitLab CI/CD files when I ask it to?

For security reasons, Claude may be configured to avoid modifying CI/CD configurations that could potentially create unintended consequences. This is a configurable safety feature.

### Can Claude see my GitLab CI/CD results?

Yes! When triggered via webhook, Claude executes in a pipeline context and can access CI/CD pipeline runs, job logs, and test results. Claude can analyze CI failures and help debug pipeline issues.

### Why does Claude only update one comment instead of creating new ones?

Claude updates a single comment to avoid cluttering discussions. All responses, including progress updates and final results, appear in the same comment with checkboxes showing task progress.

### What happens when Claude is triggered from an issue vs merge request?

- **Issues**: Automatically creates a new branch for Claude's work
- **Merge Requests**: Works on the existing MR branch
- **Branch Protection**: Never executes on protected branches like main/master

## Configuration and Advanced Features

### How does the webhook server pass information to Claude?

The webhook server sets environment variables for the triggered pipeline. For a complete list, see the [GitLab Claude Execution Guide](docs/GITLAB_CLAUDE_EXECUTION_GUIDE.md).

### Can I customize the trigger phrase?

Yes! Set the `TRIGGER_PHRASE` environment variable in your webhook server deployment. For configuration details, see the [🚀 Webhook Deployment Guide](docs/WEBHOOK_DEPLOYMENT.md).

### Can Claude work across multiple repositories?

Yes, one webhook server can handle multiple projects. Each project needs its own pipeline configuration. See the [🚀 Webhook Deployment Guide](docs/WEBHOOK_DEPLOYMENT.md#multi-project-setup) for details.

### What GitLab features does Claude support?

The webhook server integrates with GitLab for:

- Issue and MR comment triggers
- Automatic branch creation
- Pipeline triggering with context
- Rate limiting and security

For complete details, see the [🦊 Webhook Server Documentation](gitlab-app/README.md).

## Troubleshooting

### Common Issues

For detailed troubleshooting of specific issues, see our comprehensive [🔧 Troubleshooting Guide](docs/TROUBLESHOOTING.md).

**Quick fixes for common problems:**

- **Webhook not triggering**: Check server logs and GitLab webhook delivery
- **Authentication errors**: See [🔐 Authentication Guide](docs/AUTHENTICATION_GUIDE.md)
- **Pipeline failures**: Check environment variables and token scopes
- **Rate limiting**: Wait 15 minutes or adjust limits in webhook server

### Why can't I trigger Claude with `@claude-mention` or `claude!`?

The trigger uses word boundaries, so `@claude` must be a complete word. Variations like `@claude-bot` won't work unless you customize the `TRIGGER_PHRASE` environment variable.

### Self-Hosted GitLab Configuration

For self-hosted GitLab:

1. Set `GITLAB_URL` environment variable to your instance URL
2. Use a personal access token from your GitLab instance
3. Ensure network connectivity between GitLab and webhook server

For detailed self-hosted setup, see the [🔧 Troubleshooting Guide](docs/TROUBLESHOOTING.md#self-hosted-gitlab).

## Best Practices

1. **Security**: Store secrets in GitLab CI/CD variables, never in code
2. **Reliability**: Use proper hosting with health checks for webhook server
3. **Monitoring**: Set up Discord notifications and log monitoring
4. **Testing**: Test in development before production deployment
5. **Access Control**: Use minimal token permissions and branch protection

For comprehensive best practices, see the [🔐 Authentication Guide](docs/AUTHENTICATION_GUIDE.md#security-best-practices).

## Getting Help

**Documentation Resources:**

- [🔧 Troubleshooting Guide](docs/TROUBLESHOOTING.md) - Comprehensive issue resolution
- [🔐 Authentication Guide](docs/AUTHENTICATION_GUIDE.md) - Complete authentication setup
- [🚀 Webhook Deployment Guide](docs/WEBHOOK_DEPLOYMENT.md) - Advanced deployment options
- [🦊 Webhook Server Documentation](gitlab-app/README.md) - Server-specific details

**Support Channels:**

- [GitHub Issues](https://github.com/hyperremix/claude-code-for-gitlab/issues) - Bug reports and feature requests
- GitLab webhook delivery logs in your project settings
- Webhook server logs: `docker logs gitlab-claude-webhook`
