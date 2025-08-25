# Testing Guidelines

This document outlines the testing patterns, standards, and best practices for the Claude Code for GitLab project.

## Overview

This project uses Bun's built-in test framework with comprehensive mocking strategies to achieve 90%+ code coverage across all components. The testing infrastructure includes shared fixtures, mocks, and utilities to ensure consistent and reliable testing patterns.

## Test File Organization

### Directory Structure

```
test/
├── test-utils/
│   ├── fixtures.ts          # Shared test data and utilities
│   ├── mocks.ts             # Mock implementations
│   └── setup.ts             # Global test setup (if needed)
├── entrypoints/             # Tests for entrypoint logic
├── gitlab/                  # Tests for GitLab integration
├── gitlab-app/              # Tests for GitLab app components
├── modes/                   # Tests for mode functionality
├── providers/               # Tests for provider implementations
├── utils/                   # Tests for utility functions
└── TESTING_GUIDELINES.md    # This file
```

### File Naming Conventions

- Test files: `*.test.ts`
- Mock files: `*.mock.ts` (if component-specific mocks needed)
- Utility files: `*.util.ts`
- Test data files: `*.fixture.ts` (if component-specific fixtures needed)

## Test Structure and Patterns

### Basic Test Structure

```typescript
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { createMockGitLabContext, setupTestEnvironment, restoreTestEnvironment } from "../test-utils/fixtures";
import { createMockGitLabAPI, mockUtils } from "../test-utils/mocks";

describe("ComponentName", () => {
  let mockAPI: ReturnType<typeof createMockGitLabAPI>;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Setup mocks and environment
    mockAPI = createMockGitLabAPI();
    const testEnv = setupTestEnvironment({ 
      GITLAB_TOKEN: "test-token",
      GITLAB_PROJECT_ID: "123"
    });
    originalEnv = testEnv.originalEnv;
  });

  afterEach(() => {
    // Clean up mocks and environment
    mockUtils.resetMocks(mockAPI);
    restoreTestEnvironment(originalEnv);
  });

  describe("Method/Function Name", () => {
    test("should handle normal case", async () => {
      // Arrange
      const input = { /* test input */ };
      const expected = { /* expected output */ };
      
      // Act
      const result = await functionUnderTest(input);
      
      // Assert
      expect(result).toEqual(expected);
    });

    test("should handle error case", async () => {
      // Arrange
      mockAPI.Projects.show.mockRejectedValueOnce(new Error("API Error"));
      
      // Act & Assert
      expect(async () => {
        await functionUnderTest(input);
      }).toThrow("API Error");
    });
  });
});
```

### Arrange-Act-Assert Pattern

All tests should follow the AAA pattern:

1. **Arrange**: Set up test data, mocks, and preconditions
2. **Act**: Execute the function/method being tested
3. **Assert**: Verify the results and side effects

### Parameterized Tests

Use parameterized tests for testing multiple scenarios:

```typescript
import { createTestCases } from "../test-utils/fixtures";

const testCases = createTestCases([
  {
    description: "should handle valid input",
    input: { valid: true },
    expected: { success: true },
  },
  {
    description: "should handle invalid input",
    input: { valid: false },
    expected: { success: false },
    shouldThrow: true,
  },
]);

testCases.forEach(({ description, input, expected, shouldThrow }) => {
  test(description, async () => {
    if (shouldThrow) {
      expect(() => functionUnderTest(input)).toThrow();
    } else {
      const result = await functionUnderTest(input);
      expect(result).toEqual(expected);
    }
  });
});
```

## Mocking Strategies

### Using Shared Mocks

Import and use the centralized mock implementations:

```typescript
import { createMockGitLabAPI, createMockRedisClient, mockSetups } from "../test-utils/mocks";

// For GitLab provider tests
const mocks = mockSetups.gitlabProvider();

// For GitLab app tests  
const mocks = mockSetups.gitlabApp();

// For utility tests
const mocks = mockSetups.utilities();
```

### Component-Specific Mocks

For component-specific mocking needs:

```typescript
import { mock } from "bun:test";

// Mock specific module
const mockClaudeCodeCLI = {
  execute: mock(() => Promise.resolve({ success: true })),
  prepare: mock(() => Promise.resolve()),
};

// Mock module import
mock.module("@anthropic-ai/claude-code", () => mockClaudeCodeCLI);
```

### Error Scenario Testing

Use error mock factories for testing error scenarios:

```typescript
import { errorMockFactories } from "../test-utils/mocks";

test("should handle network errors", async () => {
  const failingAPI = errorMockFactories.createFailingGitLabAPI("networkError");
  
  expect(async () => {
    await functionWithGitLabAPI(failingAPI);
  }).toThrow("Network request failed");
});
```

## Testing Different Component Types

### Testing Entrypoints

Focus on:

- Environment variable handling
- Phase execution flow
- Error propagation
- External dependency integration
- Git operations
- File system operations

```typescript
describe("GitLab Entrypoint", () => {
  test("should execute prepare phase successfully", async () => {
    // Mock environment
    setupTestEnvironment({
      CI_PROJECT_ID: "123",
      CI_MERGE_REQUEST_IID: "45",
      GITLAB_TOKEN: "token"
    });
    
    // Mock file system
    const mockFS = createMockFileSystem();
    mock.module("fs", () => mockFS);
    
    // Execute
    const result = await runPreparePhase();
    
    // Verify
    expect(result.success).toBe(true);
    expect(mockFS.writeFileSync).toHaveBeenCalled();
  });
});
```

### Testing Utilities

Focus on:

- Input validation
- Error handling
- Edge cases
- Performance characteristics

```typescript
describe("Retry Utility", () => {
  test("should retry failed operations", async () => {
    let attempts = 0;
    const failingFunction = mock(() => {
      attempts++;
      if (attempts < 3) {
        throw new Error("Temporary failure");
      }
      return "success";
    });
    
    const result = await retryWithBackoff(failingFunction, { maxRetries: 3 });
    
    expect(result).toBe("success");
    expect(attempts).toBe(3);
  });
});
```

### Testing Providers

Focus on:

- API interaction patterns
- Context management
- Error handling and recovery
- Platform-specific behavior

```typescript
describe("GitLab Provider", () => {
  test("should fetch merge request data", async () => {
    const mockAPI = createMockGitLabAPI();
    const provider = new GitLabProvider({ /* options */ });
    (provider as any).api = mockAPI;
    
    const result = await provider.getPullRequestInfo();
    
    expect(mockAPI.MergeRequests.show).toHaveBeenCalledWith("123", "45");
    expect(result).toMatchObject({
      title: expect.any(String),
      description: expect.any(String),
    });
  });
});
```

### Testing GitLab App Components

Focus on:

- HTTP request/response handling
- Rate limiting behavior
- Discord integration
- Pipeline management
- Redis operations

```typescript
describe("GitLab App Webhook Handler", () => {
  test("should process merge request webhook", async () => {
    const mockPayload = createMockWebhookPayloads().mergeRequestOpened;
    const mockRedis = createMockRedisClient();
    
    const response = await handleWebhook(mockPayload);
    
    expect(response.status).toBe(200);
    expect(mockRedis.zAdd).toHaveBeenCalled();
  });
});
```

## Error Handling Testing

### Error Boundary Testing

Test error propagation and handling:

```typescript
test("should handle and log errors appropriately", async () => {
  const mockConsole = createMockConsole();
  const originalConsole = console;
  global.console = mockConsole as any;
  
  try {
    await functionThatShouldError();
  } catch (error) {
    expect(mockConsole.error).toHaveBeenCalledWith(
      expect.stringContaining("Error message")
    );
  } finally {
    global.console = originalConsole;
  }
});
```

### Network Error Simulation

```typescript
test("should handle network timeouts", async () => {
  const timeoutError = new Error("Request timeout");
  const mockAPI = createMockGitLabAPI();
  mockAPI.Projects.show.mockRejectedValueOnce(timeoutError);
  
  await expect(provider.getProject()).rejects.toThrow("Request timeout");
});
```

## Integration Testing

### Multi-Component Integration

```typescript
describe("End-to-End Workflow", () => {
  test("should complete full GitLab workflow", async () => {
    // Setup complete environment
    const mocks = mockSetups.entrypoints();
    setupTestEnvironment({ /* full env */ });
    
    // Execute workflow
    const result = await executeGitLabWorkflow();
    
    // Verify all interactions
    expect(mocks.gitlab.Projects.show).toHaveBeenCalled();
    expect(mocks.fs.writeFileSync).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});
```

## Performance Testing

### Timeout Testing

```typescript
import { asyncTestUtils } from "../test-utils/fixtures";

test("should complete within time limit", async () => {
  const startTime = Date.now();
  
  await asyncTestUtils.waitFor(
    functionUnderTest(),
    2000 // 2 second timeout
  );
  
  const duration = Date.now() - startTime;
  expect(duration).toBeLessThan(2000);
});
```

### Concurrency Testing

```typescript
test("should handle concurrent requests", async () => {
  const promises = Array.from({ length: 10 }, () => 
    functionUnderTest()
  );
  
  const results = await Promise.all(promises);
  
  expect(results).toHaveLength(10);
  expect(results.every(r => r.success)).toBe(true);
});
```

## Coverage Requirements

### Coverage Targets

- **Overall Coverage**: 90%+ across all files
- **Critical Paths**: 100% (entrypoints, providers, core utilities)
- **Error Paths**: 100% of error handling code
- **Edge Cases**: Comprehensive coverage of boundary conditions

### Coverage Exclusions

Only exclude:

- Type-only files
- Configuration files
- Development/build tools
- Obvious error cases that cannot be tested

### Measuring Coverage

```bash
# Run tests with coverage
bun test --coverage

# Generate coverage report
bun test --coverage --coverage-reporter html
```

## Test Data Management

### Using Fixtures

```typescript
import { 
  createMockGitLabContext,
  createMockWebhookPayloads,
  createMockApiResponses 
} from "../test-utils/fixtures";

test("should process webhook data", () => {
  const webhook = createMockWebhookPayloads().mergeRequestOpened;
  const context = createMockGitLabContext({ mrIid: "45" });
  
  const result = processWebhook(webhook, context);
  
  expect(result).toBeDefined();
});
```

### Custom Test Data

For test-specific data needs:

```typescript
const customTestData = {
  complexScenario: {
    input: { /* complex input */ },
    expected: { /* expected result */ },
    intermediateStates: [/* state progression */],
  },
};
```

## Debugging Tests

### Console Output

Use mock console for testing logging:

```typescript
const mockConsole = createMockConsole();
global.console = mockConsole as any;

// Execute function
await functionThatLogs();

// Verify logging
expect(mockConsole.log).toHaveBeenCalledWith("Expected log message");
```

### Test Isolation

Ensure tests don't affect each other:

```typescript
beforeEach(() => {
  // Reset all global state
  mockUtils.resetMocks(mockObject);
  restoreTestEnvironment(originalEnv);
});
```

## Best Practices

1. **Test Naming**: Use descriptive test names that explain the scenario
2. **Test Size**: Keep tests focused and atomic
3. **Setup/Teardown**: Always clean up after tests
4. **Assertions**: Use specific assertions rather than generic ones
5. **Mocking**: Mock at the boundary, not internal implementation
6. **Error Testing**: Test both success and failure paths
7. **Documentation**: Comment complex test scenarios
8. **Performance**: Keep tests fast and efficient

## Common Patterns

### Testing Async Functions

```typescript
test("should handle async operations", async () => {
  const promise = asyncFunction();
  await expect(promise).resolves.toBe(expectedValue);
});
```

### Testing Callbacks

```typescript
test("should call callback with result", (done) => {
  functionWithCallback((error, result) => {
    expect(error).toBeNull();
    expect(result).toBe(expectedValue);
    done();
  });
});
```

### Testing Events

```typescript
test("should emit events", (done) => {
  const emitter = new EventEmitter();
  
  emitter.on('test-event', (data) => {
    expect(data).toBe(expectedData);
    done();
  });
  
  triggerEvent(emitter);
});
```

This comprehensive testing framework ensures consistent, reliable, and maintainable tests across all components of the Claude Code for GitLab project.
