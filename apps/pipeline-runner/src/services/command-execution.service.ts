/**
 * Command execution service implementation
 * Wraps Bun's $ operator for dependency injection
 */

import { $ } from "bun";
import type { ICommandExecutionService } from "../interfaces";
import type { CommandOptions, CommandResult } from "../types";

export class CommandExecutionService implements ICommandExecutionService {
  /**
   * Executes a shell command with options
   */
  async execute(
    command: string,
    options?: CommandOptions,
  ): Promise<CommandResult> {
    try {
      const proc = $`${command}`;

      if (options?.env) {
        proc.env(options.env);
      }

      if (options?.cwd) {
        proc.cwd(options.cwd);
      }

      const result = await proc;

      return {
        exitCode: result.exitCode,
        stdout: result.stdout?.toString() || "",
        stderr: result.stderr?.toString() || "",
      };
    } catch (error: any) {
      return {
        exitCode: error.exitCode || 1,
        stdout: error.stdout?.toString() || "",
        stderr: error.stderr?.toString() || error.message || "",
      };
    }
  }

  /**
   * Executes a command quietly (suppresses output)
   */
  async executeQuiet(command: string): Promise<CommandResult> {
    try {
      const proc = $`${command}`.quiet();
      const result = await proc;

      return {
        exitCode: result.exitCode,
        stdout: result.stdout?.toString() || "",
        stderr: result.stderr?.toString() || "",
      };
    } catch (error: any) {
      return {
        exitCode: error.exitCode || 1,
        stdout: error.stdout?.toString() || "",
        stderr: error.stderr?.toString() || error.message || "",
      };
    }
  }
}
