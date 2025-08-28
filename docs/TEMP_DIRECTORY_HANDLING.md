# Temporary Directory Handling

## Overview

This project uses a centralized approach for handling temporary directories in webhook-triggered GitLab CI environments, providing consistent directory management for Claude Code execution.

## Webhook-Triggered CI Implementation

In the webhook-only architecture, temporary directories are managed within GitLab CI pipelines that are triggered by the webhook server:

- `CI_BUILDS_DIR` is the main workspace directory in GitLab CI
- We create `.claude-temp` subdirectory within `CI_BUILDS_DIR`
- Falls back to `/tmp` if `CI_BUILDS_DIR` is not available
- Provides consistent paths for Claude prompts and execution output
- Works seamlessly with webhook-triggered pipeline execution

## TypeScript Utility

The main utility is located at `src/utils/temp-directory.ts` and provides:

```typescript
// Get the platform-appropriate temp directory
const tempDir = getTempDirectory();

// Get specific subdirectories (auto-created)
const promptsDir = getClaudePromptsDirectory();
const outputPath = getClaudeExecutionOutputPath();
```

## Webhook Integration

When the webhook server triggers a GitLab CI pipeline, the unified entrypoint handles temporary directory setup:

1. **Webhook Trigger**: GitLab webhook event processed by webhook server
2. **Pipeline Execution**: GitLab CI pipeline starts with webhook context
3. **Temp Directory Setup**: Utility functions create consistent temp directories
4. **Claude Execution**: Prompts and outputs stored in managed temp directories
5. **Cleanup**: Temporary files handled according to GitLab CI cleanup policies

## Migration Guide

### TypeScript Files

Replace direct `RUNNER_TEMP` usage:

```typescript
// Before
const path = `${process.env.RUNNER_TEMP}/claude-prompts`;

// After
import { getClaudePromptsDirectory } from "../utils/temp-directory";
const path = getClaudePromptsDirectory();
```

## Directory Structure

The following directories are created under the temp directory:

- `/claude-prompts/` - Stores Claude prompt files
- `/.claude-temp/` - GitLab-specific subdirectory within CI_BUILDS_DIR

## Current Usage

The temporary directory utility is currently used by:

### Core Components

- `src/utils/temp-directory.ts` - Main utility providing cross-platform temp directory management
- Webhook-triggered GitLab CI pipelines using the unified entrypoint approach

## Best Practices

1. **Always use the utility** instead of hardcoding paths
2. **Create subdirectories** using the utility functions
3. **Check platform** when behavior needs to differ between local and GitLab CI environments
4. **Document dependencies** if a specific temp structure is required
5. **Clean up** sensitive files after use (temp dirs may persist in GitLab CI)
6. **Consider webhook context** when designing temp directory usage patterns

## Security Considerations

In webhook-triggered environments:

- Temporary directories may contain sensitive prompt data
- GitLab CI cleanup policies apply to temp directories
- Consider the persistence requirements for debugging vs security
- Webhook-triggered pipelines should handle temp directory permissions appropriately
