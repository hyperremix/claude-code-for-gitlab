/**
 * Centralized mock implementations for external dependencies
 */

import { mock } from "bun:test";
import {
  createMockApiResponses,
  createMockDiscordResponses,
  createMockErrors,
  createMockGitLabContext,
  createMockRedisResponses,
} from "./fixtures";

// Mock function type for Bun
type MockFunction = ReturnType<typeof mock>;

/**
 * Mock GitLab API client interface
 */
export interface MockGitLabAPI {
  Projects: {
    show: MockFunction;
    create: MockFunction;
    edit: MockFunction;
    remove: MockFunction;
  };
  MergeRequests: {
    show: MockFunction;
    create: MockFunction;
    edit: MockFunction;
    notes: MockFunction;
    editNote: MockFunction;
    removeNote: MockFunction;
    changes: MockFunction;
    commits: MockFunction;
    approve: MockFunction;
    unapprove: MockFunction;
  };
  Issues: {
    show: MockFunction;
    create: MockFunction;
    edit: MockFunction;
    notes: MockFunction;
    editNote: MockFunction;
    removeNote: MockFunction;
  };
  Pipelines: {
    show: MockFunction;
    create: MockFunction;
    cancel: MockFunction;
    retry: MockFunction;
  };
  Branches: {
    show: MockFunction;
    create: MockFunction;
    remove: MockFunction;
  };
  Commits: {
    show: MockFunction;
    create: MockFunction;
  };
  RepositoryFiles: {
    show: MockFunction;
    create: MockFunction;
    edit: MockFunction;
    remove: MockFunction;
  };
  Users: {
    show: MockFunction;
    current: MockFunction;
  };
}

/**
 * Creates a mock GitLab API client with default behaviors
 */
export function createMockGitLabAPI(): MockGitLabAPI {
  const mockResponses = createMockApiResponses();

  return {
    Projects: {
      show: mock(() => Promise.resolve(mockResponses.project)),
      create: mock(() => Promise.resolve(mockResponses.project)),
      edit: mock(() => Promise.resolve(mockResponses.project)),
      remove: mock(() => Promise.resolve({ message: "Project deleted" })),
    },
    MergeRequests: {
      show: mock(() => Promise.resolve(mockResponses.mergeRequest)),
      create: mock(() => Promise.resolve(mockResponses.mergeRequest)),
      edit: mock(() => Promise.resolve(mockResponses.mergeRequest)),
      notes: mock(() => Promise.resolve([{ id: 1, body: "Test note" }])),
      editNote: mock(() => Promise.resolve({ id: 1, body: "Updated note" })),
      removeNote: mock(() => Promise.resolve({ message: "Note deleted" })),
      changes: mock(() =>
        Promise.resolve((mockResponses.mergeRequest as any).changes),
      ),
      commits: mock(() =>
        Promise.resolve([{ id: "abc123", message: "Test commit" }]),
      ),
      approve: mock(() => Promise.resolve({ id: 1, state: "approved" })),
      unapprove: mock(() => Promise.resolve({ id: 1, state: "unapproved" })),
    },
    Issues: {
      show: mock(() => Promise.resolve(mockResponses.issue)),
      create: mock(() => Promise.resolve(mockResponses.issue)),
      edit: mock(() => Promise.resolve(mockResponses.issue)),
      notes: mock(() => Promise.resolve([{ id: 1, body: "Test note" }])),
      editNote: mock(() => Promise.resolve({ id: 1, body: "Updated note" })),
      removeNote: mock(() => Promise.resolve({ message: "Note deleted" })),
    },
    Pipelines: {
      show: mock(() => Promise.resolve(mockResponses.pipeline)),
      create: mock(() => Promise.resolve(mockResponses.pipeline)),
      cancel: mock(() => Promise.resolve({ id: 789, status: "canceled" })),
      retry: mock(() => Promise.resolve({ id: 790, status: "pending" })),
    },
    Branches: {
      show: mock(() =>
        Promise.resolve({ name: "main", commit: { id: "abc123" } }),
      ),
      create: mock(() =>
        Promise.resolve({ name: "feature-branch", commit: { id: "def456" } }),
      ),
      remove: mock(() => Promise.resolve({ message: "Branch deleted" })),
    },
    Commits: {
      show: mock(() =>
        Promise.resolve({ id: "abc123", message: "Test commit" }),
      ),
      create: mock(() =>
        Promise.resolve({ id: "def456", message: "New commit" }),
      ),
    },
    RepositoryFiles: {
      show: mock(() => Promise.resolve(mockResponses.fileContent)),
      create: mock(() =>
        Promise.resolve({ file_path: "test.ts", branch: "main" }),
      ),
      edit: mock(() =>
        Promise.resolve({ file_path: "test.ts", branch: "main" }),
      ),
      remove: mock(() => Promise.resolve({ message: "File deleted" })),
    },
    Users: {
      show: mock(() => Promise.resolve(mockResponses.user)),
      current: mock(() => Promise.resolve(mockResponses.user)),
    },
  };
}

/**
 * Mock Redis client interface
 */
export interface MockRedisClient {
  connect: MockFunction;
  disconnect: MockFunction;
  zRemRangeByScore: MockFunction;
  zCard: MockFunction;
  zAdd: MockFunction;
  expire: MockFunction;
  get: MockFunction;
  set: MockFunction;
  del: MockFunction;
  exists: MockFunction;
  ping: MockFunction;
}

/**
 * Creates a mock Redis client with default behaviors
 */
export function createMockRedisClient(): MockRedisClient {
  const mockResponses = createMockRedisResponses();

  return {
    connect: mock(() => mockResponses.connect),
    disconnect: mock(() => mockResponses.disconnect),
    zRemRangeByScore: mock(() =>
      Promise.resolve(mockResponses.zRemRangeByScore),
    ),
    zCard: mock(() => Promise.resolve(mockResponses.zCard)),
    zAdd: mock(() => Promise.resolve(mockResponses.zAdd)),
    expire: mock(() => Promise.resolve(mockResponses.expire)),
    get: mock(() => Promise.resolve("mock-value")),
    set: mock(() => Promise.resolve("OK")),
    del: mock(() => Promise.resolve(1)),
    exists: mock(() => Promise.resolve(1)),
    ping: mock(() => Promise.resolve("PONG")),
  };
}

/**
 * Mock Discord webhook interface
 */
export interface MockDiscordWebhook {
  send: MockFunction;
  edit: MockFunction;
  delete: MockFunction;
}

/**
 * Creates a mock Discord webhook client
 */
export function createMockDiscordWebhook(): MockDiscordWebhook {
  const mockResponses = createMockDiscordResponses();

  return {
    send: mock(() => Promise.resolve(mockResponses.success)),
    edit: mock(() => Promise.resolve(mockResponses.success)),
    delete: mock(() => Promise.resolve({ message: "Message deleted" })),
  };
}

/**
 * Mock file system interface
 */
export interface MockFileSystem {
  readFileSync: MockFunction;
  writeFileSync: MockFunction;
  existsSync: MockFunction;
  mkdirSync: MockFunction;
  rmSync: MockFunction;
  readdirSync: MockFunction;
  statSync: MockFunction;
  promises: {
    readFile: MockFunction;
    writeFile: MockFunction;
    mkdir: MockFunction;
    rm: MockFunction;
    readdir: MockFunction;
    stat: MockFunction;
  };
}

/**
 * Creates a mock file system with default behaviors
 */
export function createMockFileSystem(): MockFileSystem {
  return {
    readFileSync: mock(() => "mock file content"),
    writeFileSync: mock(() => undefined),
    existsSync: mock(() => true),
    mkdirSync: mock(() => undefined),
    rmSync: mock(() => undefined),
    readdirSync: mock(() => ["file1.txt", "file2.ts"]),
    statSync: mock(() => ({
      isFile: () => true,
      isDirectory: () => false,
      size: 1024,
      mtime: new Date(),
    })),
    promises: {
      readFile: mock(() => Promise.resolve("mock file content")),
      writeFile: mock(() => Promise.resolve()),
      mkdir: mock(() => Promise.resolve()),
      rm: mock(() => Promise.resolve()),
      readdir: mock(() => Promise.resolve(["file1.txt", "file2.ts"])),
      stat: mock(() =>
        Promise.resolve({
          isFile: () => true,
          isDirectory: () => false,
          size: 1024,
          mtime: new Date(),
        }),
      ),
    },
  };
}

/**
 * Mock process interface for environment and execution
 */
export interface MockProcess {
  env: Record<string, string>;
  exit: MockFunction;
  cwd: MockFunction;
  chdir: MockFunction;
}

/**
 * Creates a mock process with default behaviors
 */
export function createMockProcess(): MockProcess {
  const mockContext = createMockGitLabContext();

  return {
    env: {
      CI_PROJECT_ID: mockContext.projectId,
      CI_MERGE_REQUEST_IID: mockContext.mrIid || "",
      CI_SERVER_URL: mockContext.host,
      CI_PIPELINE_URL: mockContext.pipelineUrl || "",
      CI_COMMIT_SHA: mockContext.commitSha,
      CI_COMMIT_REF_NAME: mockContext.commitBranch,
      GITLAB_USER_NAME: mockContext.userName,
      GITLAB_USER_EMAIL: mockContext.userEmail,
      GITLAB_TOKEN: "mock-token",
      REDIS_URL: "redis://localhost:6379",
      DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/123/test",
    },
    exit: mock(() => undefined),
    cwd: mock(() => "/mock/current/directory"),
    chdir: mock(() => undefined),
  };
}

/**
 * Mock HTTP client interface for network requests
 */
export interface MockHTTPClient {
  get: MockFunction;
  post: MockFunction;
  put: MockFunction;
  delete: MockFunction;
  patch: MockFunction;
}

/**
 * Creates a mock HTTP client with default behaviors
 */
export function createMockHTTPClient(): MockHTTPClient {
  return {
    get: mock(() =>
      Promise.resolve({
        status: 200,
        statusText: "OK",
        data: { message: "GET success" },
        headers: { "content-type": "application/json" },
      }),
    ),
    post: mock(() =>
      Promise.resolve({
        status: 201,
        statusText: "Created",
        data: { message: "POST success" },
        headers: { "content-type": "application/json" },
      }),
    ),
    put: mock(() =>
      Promise.resolve({
        status: 200,
        statusText: "OK",
        data: { message: "PUT success" },
        headers: { "content-type": "application/json" },
      }),
    ),
    delete: mock(() =>
      Promise.resolve({
        status: 204,
        statusText: "No Content",
        data: null,
        headers: {},
      }),
    ),
    patch: mock(() =>
      Promise.resolve({
        status: 200,
        statusText: "OK",
        data: { message: "PATCH success" },
        headers: { "content-type": "application/json" },
      }),
    ),
  };
}

/**
 * Mock console interface for logging
 */
export interface MockConsole {
  log: MockFunction;
  error: MockFunction;
  warn: MockFunction;
  info: MockFunction;
  debug: MockFunction;
}

/**
 * Creates a mock console with spy functions
 */
export function createMockConsole(): MockConsole {
  return {
    log: mock(() => undefined),
    error: mock(() => undefined),
    warn: mock(() => undefined),
    info: mock(() => undefined),
    debug: mock(() => undefined),
  };
}

/**
 * Error scenario mock factories
 */
export const errorMockFactories = {
  /**
   * Creates GitLab API mocks that throw errors
   */
  createFailingGitLabAPI: (
    errorType: keyof ReturnType<typeof createMockErrors> = "networkError",
  ) => {
    const errors = createMockErrors();
    const error = errors[errorType];

    return {
      Projects: {
        show: mock(() => Promise.reject(error)),
        create: mock(() => Promise.reject(error)),
        edit: mock(() => Promise.reject(error)),
        remove: mock(() => Promise.reject(error)),
      },
      MergeRequests: {
        show: mock(() => Promise.reject(error)),
        create: mock(() => Promise.reject(error)),
        edit: mock(() => Promise.reject(error)),
        notes: mock(() => Promise.reject(error)),
        editNote: mock(() => Promise.reject(error)),
        removeNote: mock(() => Promise.reject(error)),
        changes: mock(() => Promise.reject(error)),
        commits: mock(() => Promise.reject(error)),
        approve: mock(() => Promise.reject(error)),
        unapprove: mock(() => Promise.reject(error)),
      },
      Issues: {
        show: mock(() => Promise.reject(error)),
        create: mock(() => Promise.reject(error)),
        edit: mock(() => Promise.reject(error)),
        notes: mock(() => Promise.reject(error)),
        editNote: mock(() => Promise.reject(error)),
        removeNote: mock(() => Promise.reject(error)),
      },
      Pipelines: {
        show: mock(() => Promise.reject(error)),
        create: mock(() => Promise.reject(error)),
        cancel: mock(() => Promise.reject(error)),
        retry: mock(() => Promise.reject(error)),
      },
      Branches: {
        show: mock(() => Promise.reject(error)),
        create: mock(() => Promise.reject(error)),
        remove: mock(() => Promise.reject(error)),
      },
      Commits: {
        show: mock(() => Promise.reject(error)),
        create: mock(() => Promise.reject(error)),
      },
      RepositoryFiles: {
        show: mock(() => Promise.reject(error)),
        create: mock(() => Promise.reject(error)),
        edit: mock(() => Promise.reject(error)),
        remove: mock(() => Promise.reject(error)),
      },
      Users: {
        show: mock(() => Promise.reject(error)),
        current: mock(() => Promise.reject(error)),
      },
    };
  },

  /**
   * Creates Redis client mocks that throw errors
   */
  createFailingRedisClient: (
    errorType: keyof ReturnType<typeof createMockErrors> = "networkError",
  ) => {
    const errors = createMockErrors();
    const error = errors[errorType];

    return {
      connect: mock(() => Promise.reject(error)),
      disconnect: mock(() => Promise.reject(error)),
      zRemRangeByScore: mock(() => Promise.reject(error)),
      zCard: mock(() => Promise.reject(error)),
      zAdd: mock(() => Promise.reject(error)),
      expire: mock(() => Promise.reject(error)),
      get: mock(() => Promise.reject(error)),
      set: mock(() => Promise.reject(error)),
      del: mock(() => Promise.reject(error)),
      exists: mock(() => Promise.reject(error)),
      ping: mock(() => Promise.reject(error)),
    };
  },

  /**
   * Creates Discord webhook mocks that throw errors
   */
  createFailingDiscordWebhook: (
    errorType: keyof ReturnType<typeof createMockErrors> = "networkError",
  ) => {
    const errors = createMockErrors();
    const error = errors[errorType];

    return {
      send: mock(() => Promise.reject(error)),
      edit: mock(() => Promise.reject(error)),
      delete: mock(() => Promise.reject(error)),
    };
  },

  /**
   * Creates file system mocks that throw errors
   */
  createFailingFileSystem: (
    errorType: keyof ReturnType<typeof createMockErrors> = "networkError",
  ) => {
    const errors = createMockErrors();
    const error = errors[errorType];

    return {
      readFileSync: mock(() => {
        throw error;
      }),
      writeFileSync: mock(() => {
        throw error;
      }),
      existsSync: mock(() => {
        throw error;
      }),
      mkdirSync: mock(() => {
        throw error;
      }),
      rmSync: mock(() => {
        throw error;
      }),
      readdirSync: mock(() => {
        throw error;
      }),
      statSync: mock(() => {
        throw error;
      }),
      promises: {
        readFile: mock(() => Promise.reject(error)),
        writeFile: mock(() => Promise.reject(error)),
        mkdir: mock(() => Promise.reject(error)),
        rm: mock(() => Promise.reject(error)),
        readdir: mock(() => Promise.reject(error)),
        stat: mock(() => Promise.reject(error)),
      },
    };
  },
};

/**
 * Utility functions for setting up and tearing down mocks
 */
export const mockUtils = {
  /**
   * Resets all mocks in a mock object
   */
  resetMocks: (mockObject: Record<string, any>) => {
    const resetRecursive = (obj: any) => {
      for (const key in obj) {
        if (typeof obj[key] === "function" && obj[key].mockReset) {
          obj[key].mockReset();
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
          resetRecursive(obj[key]);
        }
      }
    };
    resetRecursive(mockObject);
  },

  /**
   * Verifies that a mock was called with specific arguments
   */
  verifyMockCall: (mockFn: any, expectedArgs: any[], callIndex = 0) => {
    const calls = mockFn.mock.calls;
    if (calls.length <= callIndex) {
      throw new Error(`Mock was not called at index ${callIndex}`);
    }
    const actualArgs = calls[callIndex];
    if (JSON.stringify(actualArgs) !== JSON.stringify(expectedArgs)) {
      throw new Error(
        `Mock call mismatch at index ${callIndex}:\n` +
          `Expected: ${JSON.stringify(expectedArgs)}\n` +
          `Actual: ${JSON.stringify(actualArgs)}`,
      );
    }
  },

  /**
   * Counts total calls across all methods in a mock object
   */
  getTotalCalls: (mockObject: Record<string, any>): number => {
    let totalCalls = 0;
    const countRecursive = (obj: any) => {
      for (const key in obj) {
        if (typeof obj[key] === "function" && obj[key].mock) {
          totalCalls += obj[key].mock.calls.length;
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
          countRecursive(obj[key]);
        }
      }
    };
    countRecursive(mockObject);
    return totalCalls;
  },
};

/**
 * Common mock setups for different test scenarios
 */
export const mockSetups = {
  /**
   * Complete mock setup for GitLab provider tests
   */
  gitlabProvider: () => ({
    api: createMockGitLabAPI(),
    context: createMockGitLabContext(),
    console: createMockConsole(),
  }),

  /**
   * Complete mock setup for GitLab app tests
   */
  gitlabApp: () => ({
    redis: createMockRedisClient(),
    discord: createMockDiscordWebhook(),
    gitlab: createMockGitLabAPI(),
    http: createMockHTTPClient(),
    console: createMockConsole(),
  }),

  /**
   * Complete mock setup for utility function tests
   */
  utilities: () => ({
    fs: createMockFileSystem(),
    process: createMockProcess(),
    console: createMockConsole(),
  }),

  /**
   * Complete mock setup for entrypoint tests
   */
  entrypoints: () => ({
    fs: createMockFileSystem(),
    process: createMockProcess(),
    gitlab: createMockGitLabAPI(),
    console: createMockConsole(),
  }),
};
