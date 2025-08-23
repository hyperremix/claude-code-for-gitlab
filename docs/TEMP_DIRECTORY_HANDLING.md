# Temporary Directory Handling

## Overview

This project uses a centralized approach for handling temporary directories in GitLab CI environments, providing consistent directory management for Claude Code execution.

## GitLab CI Implementation

- `CI_BUILDS_DIR` is the main workspace directory
- We create `.claude-temp` subdirectory within `CI_BUILDS_DIR`
- Falls back to `/tmp` if `CI_BUILDS_DIR` is not available
- Provides consistent paths for Claude prompts and execution output

## TypeScript Utility

The main utility is located at `src/utils/temp-directory.ts` and provides:

```typescript
// Get the platform-appropriate temp directory
const tempDir = getTempDirectory();

// Get specific subdirectories (auto-created)
const promptsDir = getClaudePromptsDirectory();
const outputPath = getClaudeExecutionOutputPath();
```

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

## Files Updated

The following files have been updated to use the centralized temp directory:

### TypeScript

- `src/utils/temp-directory.ts` - Main utility
- `src/entrypoints/prepare.ts` - Uses utility
- `src/entrypoints/gitlab_entrypoint.ts` - Uses utility

### Shell Scripts

- `scripts/setup-network-restrictions-unified.sh` - Uses inline temp directory logic

## Best Practices

1. **Always use the utility** instead of hardcoding paths
2. **Create subdirectories** using the utility functions
3. **Check platform** when behavior needs to differ
4. **Document dependencies** if a specific temp structure is required
5. **Clean up** sensitive files after use (temp dirs may persist in GitLab)
