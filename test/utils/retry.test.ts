import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import type { RetryOptions } from "../../src/utils/retry";
import { retryWithBackoff } from "../../src/utils/retry";

// Track delay values for assertions
let lastDelay = 0;
const delayHistory: number[] = [];

// Mock console methods
const mockConsole = {
  log: mock(() => {}),
  error: mock(() => {}),
};

// Mock setTimeout to control timing in tests
const mockSetTimeout = mock((callback: () => void, delay: number) => {
  lastDelay = delay;
  delayHistory.push(delay);
  // Execute callback immediately for test speed
  setImmediate(callback);
  return 1 as any;
});

// Store original functions
const originalConsole = { ...console };
const originalSetTimeout = global.setTimeout;

describe("Retry Utility Functions", () => {
  beforeEach(() => {
    // Reset all mocks and tracking
    mockConsole.log.mockClear();
    mockConsole.error.mockClear();
    mockSetTimeout.mockClear();
    lastDelay = 0;
    delayHistory.length = 0;

    // Replace console methods with mocks
    console.log = mockConsole.log;
    console.error = mockConsole.error;
    global.setTimeout = mockSetTimeout as any;
  });

  afterEach(() => {
    // Restore original functions
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    global.setTimeout = originalSetTimeout;
  });

  describe("retryWithBackoff", () => {
    describe("Successful Operations", () => {
      test("should return result immediately for successful operation", async () => {
        const successValue = "success";
        const operation = mock(() => Promise.resolve(successValue));

        const result = await retryWithBackoff(operation);

        expect(result).toBe(successValue);
        expect(operation).toHaveBeenCalledTimes(1);
        expect(mockConsole.log).toHaveBeenCalledWith("Attempt 1 of 3...");
        expect(mockConsole.error).not.toHaveBeenCalled();
        expect(mockSetTimeout).not.toHaveBeenCalled();
      });

      test("should return complex object for successful operation", async () => {
        const complexValue = {
          id: 123,
          data: [1, 2, 3],
          nested: { key: "value" },
        };
        const operation = mock(() => Promise.resolve(complexValue));

        const result = await retryWithBackoff(operation);

        expect(result).toEqual(complexValue);
        expect(operation).toHaveBeenCalledTimes(1);
      });

      test("should handle successful operation with custom options", async () => {
        const operation = mock(() => Promise.resolve("custom success"));
        const options: RetryOptions = {
          maxAttempts: 5,
          initialDelayMs: 1000,
          maxDelayMs: 10000,
          backoffFactor: 1.5,
        };

        const result = await retryWithBackoff(operation, options);

        expect(result).toBe("custom success");
        expect(mockConsole.log).toHaveBeenCalledWith("Attempt 1 of 5...");
      });
    });

    describe("Retry Scenarios", () => {
      test("should retry once and succeed on second attempt", async () => {
        const operation = mock()
          .mockRejectedValueOnce(new Error("First attempt failed"))
          .mockResolvedValueOnce("Second attempt success");

        const result = await retryWithBackoff(operation);

        expect(result).toBe("Second attempt success");
        expect(operation).toHaveBeenCalledTimes(2);
        expect(mockConsole.log).toHaveBeenCalledWith("Attempt 1 of 3...");
        expect(mockConsole.log).toHaveBeenCalledWith("Attempt 2 of 3...");
        expect(mockConsole.error).toHaveBeenCalledWith(
          "Attempt 1 failed:",
          "First attempt failed",
        );
        expect(mockConsole.log).toHaveBeenCalledWith(
          "Retrying in 5 seconds...",
        );
        expect(mockSetTimeout).toHaveBeenCalledTimes(1);
        expect(lastDelay).toBe(5000);
      });

      test("should retry twice and succeed on third attempt", async () => {
        const operation = mock()
          .mockRejectedValueOnce(new Error("First failed"))
          .mockRejectedValueOnce(new Error("Second failed"))
          .mockResolvedValueOnce("Third success");

        const result = await retryWithBackoff(operation);

        expect(result).toBe("Third success");
        expect(operation).toHaveBeenCalledTimes(3);
        expect(mockConsole.log).toHaveBeenCalledWith("Attempt 1 of 3...");
        expect(mockConsole.log).toHaveBeenCalledWith("Attempt 2 of 3...");
        expect(mockConsole.log).toHaveBeenCalledWith("Attempt 3 of 3...");
        expect(mockSetTimeout).toHaveBeenCalledTimes(2);
      });

      test("should use exponential backoff with default factor", async () => {
        const operation = mock()
          .mockRejectedValueOnce(new Error("First failed"))
          .mockRejectedValueOnce(new Error("Second failed"))
          .mockResolvedValueOnce("Success");

        await retryWithBackoff(operation);

        expect(mockSetTimeout).toHaveBeenCalledTimes(2);
        // First retry: 5000ms
        expect(delayHistory[0]).toBe(5000);
        // Second retry: 5000 * 2 = 10000ms
        expect(delayHistory[1]).toBe(10000);
      });

      test("should respect maxDelayMs limit", async () => {
        const operation = mock()
          .mockRejectedValueOnce(new Error("First failed"))
          .mockRejectedValueOnce(new Error("Second failed"))
          .mockResolvedValueOnce("Success");

        const options: RetryOptions = {
          initialDelayMs: 8000,
          maxDelayMs: 12000,
          backoffFactor: 2,
        };

        await retryWithBackoff(operation, options);

        expect(mockSetTimeout).toHaveBeenCalledTimes(2);
        // First retry: 8000ms
        expect(delayHistory[0]).toBe(8000);
        // Second retry: 8000 * 2 = 16000ms, but capped at 12000ms
        expect(delayHistory[1]).toBe(12000);
      });

      test("should handle custom backoff factor", async () => {
        const operation = mock()
          .mockRejectedValueOnce(new Error("First failed"))
          .mockRejectedValueOnce(new Error("Second failed"))
          .mockResolvedValueOnce("Success");

        const options: RetryOptions = {
          initialDelayMs: 1000,
          backoffFactor: 3,
        };

        await retryWithBackoff(operation, options);

        expect(mockSetTimeout).toHaveBeenCalledTimes(2);
        // First retry: 1000ms
        expect(delayHistory[0]).toBe(1000);
        // Second retry: 1000 * 3 = 3000ms
        expect(delayHistory[1]).toBe(3000);
      });
    });

    describe("Failure Scenarios", () => {
      test("should throw last error after all attempts fail", async () => {
        const finalError = new Error("Final failure");
        const operation = mock()
          .mockRejectedValueOnce(new Error("First failed"))
          .mockRejectedValueOnce(new Error("Second failed"))
          .mockRejectedValueOnce(finalError);

        await expect(retryWithBackoff(operation)).rejects.toThrow(
          "Final failure",
        );

        expect(operation).toHaveBeenCalledTimes(3);
        expect(mockConsole.log).toHaveBeenCalledWith("Attempt 1 of 3...");
        expect(mockConsole.log).toHaveBeenCalledWith("Attempt 2 of 3...");
        expect(mockConsole.log).toHaveBeenCalledWith("Attempt 3 of 3...");
        expect(mockConsole.error).toHaveBeenCalledWith(
          "Attempt 1 failed:",
          "First failed",
        );
        expect(mockConsole.error).toHaveBeenCalledWith(
          "Attempt 2 failed:",
          "Second failed",
        );
        expect(mockConsole.error).toHaveBeenCalledWith(
          "Attempt 3 failed:",
          "Final failure",
        );
        expect(mockConsole.error).toHaveBeenCalledWith(
          "Operation failed after 3 attempts",
        );
        expect(mockSetTimeout).toHaveBeenCalledTimes(2); // No retry after final attempt
      });

      test("should handle custom maxAttempts", async () => {
        const operation = mock(() => Promise.reject(new Error("Always fails")));
        const options: RetryOptions = { maxAttempts: 5 };

        await expect(retryWithBackoff(operation, options)).rejects.toThrow(
          "Always fails",
        );

        expect(operation).toHaveBeenCalledTimes(5);
        expect(mockConsole.log).toHaveBeenCalledWith("Attempt 1 of 5...");
        expect(mockConsole.log).toHaveBeenCalledWith("Attempt 5 of 5...");
        expect(mockConsole.error).toHaveBeenCalledWith(
          "Operation failed after 5 attempts",
        );
        expect(mockSetTimeout).toHaveBeenCalledTimes(4); // 4 retries for 5 attempts
      });

      test("should handle single attempt (no retries)", async () => {
        const operation = mock(() =>
          Promise.reject(new Error("Single failure")),
        );
        const options: RetryOptions = { maxAttempts: 1 };

        await expect(retryWithBackoff(operation, options)).rejects.toThrow(
          "Single failure",
        );

        expect(operation).toHaveBeenCalledTimes(1);
        expect(mockConsole.log).toHaveBeenCalledWith("Attempt 1 of 1...");
        expect(mockConsole.error).toHaveBeenCalledWith(
          "Attempt 1 failed:",
          "Single failure",
        );
        expect(mockConsole.error).toHaveBeenCalledWith(
          "Operation failed after 1 attempts",
        );
        expect(mockSetTimeout).not.toHaveBeenCalled();
      });
    });

    describe("Error Handling", () => {
      test("should convert string errors to Error objects", async () => {
        const operation = mock(() => Promise.reject("String error"));

        await expect(retryWithBackoff(operation)).rejects.toThrow(
          "String error",
        );

        expect(mockConsole.error).toHaveBeenCalledWith(
          "Attempt 1 failed:",
          "String error",
        );
      });

      test("should convert number errors to Error objects", async () => {
        const operation = mock(() => Promise.reject(404));

        await expect(retryWithBackoff(operation)).rejects.toThrow("404");

        expect(mockConsole.error).toHaveBeenCalledWith(
          "Attempt 1 failed:",
          "404",
        );
      });

      test("should convert object errors to Error objects", async () => {
        const errorObj = { code: 500, message: "Server error" };
        const operation = mock(() => Promise.reject(errorObj));

        await expect(retryWithBackoff(operation)).rejects.toThrow(
          "[object Object]",
        );

        expect(mockConsole.error).toHaveBeenCalledWith(
          "Attempt 1 failed:",
          "[object Object]",
        );
      });

      test("should convert null errors to Error objects", async () => {
        const operation = mock(() => Promise.reject(null));

        await expect(retryWithBackoff(operation)).rejects.toThrow("null");

        expect(mockConsole.error).toHaveBeenCalledWith(
          "Attempt 1 failed:",
          "null",
        );
      });

      test("should convert undefined errors to Error objects", async () => {
        const operation = mock(() => Promise.reject(undefined));

        await expect(retryWithBackoff(operation)).rejects.toThrow("undefined");

        expect(mockConsole.error).toHaveBeenCalledWith(
          "Attempt 1 failed:",
          "undefined",
        );
      });

      test("should preserve Error stack traces", async () => {
        const originalError = new Error("Original error");
        const operation = mock(() => Promise.reject(originalError));

        try {
          await retryWithBackoff(operation);
        } catch (error) {
          expect(error).toBe(originalError);
          expect(error).toHaveProperty("stack");
        }
      });
    });

    describe("Configuration Edge Cases", () => {
      test("should handle zero maxAttempts gracefully", async () => {
        const operation = mock(() => Promise.resolve("success"));
        const options: RetryOptions = { maxAttempts: 0 };

        // Even with 0 attempts, the operation should run once
        await expect(retryWithBackoff(operation, options)).rejects.toThrow();
        expect(operation).not.toHaveBeenCalled();
      });

      test("should handle negative maxAttempts gracefully", async () => {
        const operation = mock(() => Promise.resolve("success"));
        const options: RetryOptions = { maxAttempts: -1 };

        await expect(retryWithBackoff(operation, options)).rejects.toThrow();
        expect(operation).not.toHaveBeenCalled();
      });

      test("should handle zero delay times", async () => {
        const operation = mock()
          .mockRejectedValueOnce(new Error("Failed"))
          .mockResolvedValueOnce("Success");

        const options: RetryOptions = {
          initialDelayMs: 0,
          maxDelayMs: 0,
        };

        const result = await retryWithBackoff(operation, options);

        expect(result).toBe("Success");
        expect(delayHistory[0]).toBe(0);
      });

      test("should handle fractional delay times", async () => {
        const operation = mock()
          .mockRejectedValueOnce(new Error("Failed"))
          .mockResolvedValueOnce("Success");

        const options: RetryOptions = {
          initialDelayMs: 1.5,
          backoffFactor: 2.5,
        };

        await retryWithBackoff(operation, options);

        expect(delayHistory[0]).toBe(1.5);
      });

      test("should handle zero backoff factor", async () => {
        const operation = mock()
          .mockRejectedValueOnce(new Error("Failed"))
          .mockRejectedValueOnce(new Error("Failed"))
          .mockResolvedValueOnce("Success");

        const options: RetryOptions = {
          initialDelayMs: 1000,
          backoffFactor: 0,
        };

        await retryWithBackoff(operation, options);

        expect(delayHistory[0]).toBe(1000);
        expect(delayHistory[1]).toBe(0); // 1000 * 0 = 0
      });

      test("should handle very large backoff factor", async () => {
        const operation = mock()
          .mockRejectedValueOnce(new Error("Failed"))
          .mockRejectedValueOnce(new Error("Failed"))
          .mockResolvedValueOnce("Success");

        const options: RetryOptions = {
          initialDelayMs: 100,
          maxDelayMs: 1000,
          backoffFactor: 100,
        };

        await retryWithBackoff(operation, options);

        expect(delayHistory[0]).toBe(100);
        expect(delayHistory[1]).toBe(1000); // Capped at maxDelayMs
      });
    });

    describe("Logging Behavior", () => {
      test("should log attempt numbers correctly", async () => {
        const operation = mock()
          .mockRejectedValueOnce(new Error("First"))
          .mockRejectedValueOnce(new Error("Second"))
          .mockResolvedValueOnce("Success");

        await retryWithBackoff(operation);

        expect(mockConsole.log).toHaveBeenCalledWith("Attempt 1 of 3...");
        expect(mockConsole.log).toHaveBeenCalledWith("Attempt 2 of 3...");
        expect(mockConsole.log).toHaveBeenCalledWith("Attempt 3 of 3...");
      });

      test("should log retry delays correctly", async () => {
        const operation = mock()
          .mockRejectedValueOnce(new Error("Failed"))
          .mockResolvedValueOnce("Success");

        await retryWithBackoff(operation);

        expect(mockConsole.log).toHaveBeenCalledWith(
          "Retrying in 5 seconds...",
        );
      });

      test("should log custom delay times", async () => {
        const operation = mock()
          .mockRejectedValueOnce(new Error("Failed"))
          .mockResolvedValueOnce("Success");

        const options: RetryOptions = { initialDelayMs: 2500 };

        await retryWithBackoff(operation, options);

        expect(mockConsole.log).toHaveBeenCalledWith(
          "Retrying in 2.5 seconds...",
        );
      });

      test("should not log retry message on final attempt", async () => {
        const operation = mock(() => Promise.reject(new Error("Always fails")));

        await expect(retryWithBackoff(operation)).rejects.toThrow();

        // Should log "Retrying in..." for first 2 attempts, but not the final one
        const retryingLogs = mockConsole.log.mock.calls.filter(
          (call: any[]) => {
            return (
              Array.isArray(call) &&
              call.length > 0 &&
              typeof call[0] === "string" &&
              call[0].includes("Retrying in")
            );
          },
        );
        expect(retryingLogs).toHaveLength(2);
      });

      test("should log final failure message", async () => {
        const operation = mock(() => Promise.reject(new Error("Always fails")));
        const options: RetryOptions = { maxAttempts: 4 };

        await expect(retryWithBackoff(operation, options)).rejects.toThrow();

        expect(mockConsole.error).toHaveBeenCalledWith(
          "Operation failed after 4 attempts",
        );
      });
    });

    describe("Type Safety and Generics", () => {
      test("should maintain type safety for string return", async () => {
        const operation = (): Promise<string> =>
          Promise.resolve("typed string");

        const result: string = await retryWithBackoff(operation);

        expect(result).toBe("typed string");
        expect(typeof result).toBe("string");
      });

      test("should maintain type safety for number return", async () => {
        const operation = (): Promise<number> => Promise.resolve(42);

        const result: number = await retryWithBackoff(operation);

        expect(result).toBe(42);
        expect(typeof result).toBe("number");
      });

      test("should maintain type safety for complex object return", async () => {
        interface TestResult {
          id: number;
          name: string;
          active: boolean;
        }

        const operation = (): Promise<TestResult> =>
          Promise.resolve({ id: 1, name: "test", active: true });

        const result: TestResult = await retryWithBackoff(operation);

        expect(result).toEqual({ id: 1, name: "test", active: true });
        expect(result.id).toBe(1);
        expect(result.name).toBe("test");
        expect(result.active).toBe(true);
      });

      test("should handle array return types", async () => {
        const operation = (): Promise<number[]> => Promise.resolve([1, 2, 3]);

        const result: number[] = await retryWithBackoff(operation);

        expect(result).toEqual([1, 2, 3]);
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe("Performance and Edge Cases", () => {
      test("should handle very fast operations", async () => {
        const operation = mock(() => Promise.resolve("immediate"));

        const startTime = Date.now();
        const result = await retryWithBackoff(operation);
        const endTime = Date.now();

        expect(result).toBe("immediate");
        // Should complete very quickly for successful operation
        expect(endTime - startTime).toBeLessThan(50);
      });

      test("should handle operations that throw synchronously", async () => {
        const operation = mock(() => {
          throw new Error("Synchronous error");
        });

        await expect(retryWithBackoff(operation)).rejects.toThrow(
          "Synchronous error",
        );

        expect(operation).toHaveBeenCalledTimes(3);
        expect(mockConsole.error).toHaveBeenCalledWith(
          "Attempt 1 failed:",
          "Synchronous error",
        );
      });

      test("should handle operations that return undefined", async () => {
        const operation = mock(() => Promise.resolve(undefined));

        const result = await retryWithBackoff(operation);

        expect(result).toBeUndefined();
        expect(operation).toHaveBeenCalledTimes(1);
      });

      test("should handle operations that return null", async () => {
        const operation = mock(() => Promise.resolve(null));

        const result = await retryWithBackoff(operation);

        expect(result).toBeNull();
        expect(operation).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Integration Scenarios", () => {
    test("should work correctly in sequence with multiple operations", async () => {
      const operation1 = mock(() => Promise.resolve("first"));
      const operation2 = mock()
        .mockRejectedValueOnce(new Error("Failed"))
        .mockResolvedValueOnce("second");

      const result1 = await retryWithBackoff(operation1);
      const result2 = await retryWithBackoff(operation2);

      expect(result1).toBe("first");
      expect(result2).toBe("second");
      expect(operation1).toHaveBeenCalledTimes(1);
      expect(operation2).toHaveBeenCalledTimes(2);
    });

    test("should handle concurrent operations independently", async () => {
      const operation1 = mock(
        () => new Promise((resolve) => setTimeout(() => resolve("first"), 10)),
      );
      const operation2 = mock(
        () => new Promise((resolve) => setTimeout(() => resolve("second"), 10)),
      );

      const [result1, result2] = await Promise.all([
        retryWithBackoff(operation1),
        retryWithBackoff(operation2),
      ]);

      expect(result1).toBe("first");
      expect(result2).toBe("second");
      expect(operation1).toHaveBeenCalledTimes(1);
      expect(operation2).toHaveBeenCalledTimes(1);
    });
  });
});
