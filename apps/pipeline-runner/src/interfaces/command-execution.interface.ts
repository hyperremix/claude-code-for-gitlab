import type { CommandOptions, CommandResult } from "../types";

export interface ICommandExecutionService {
  execute(command: string, options?: CommandOptions): Promise<CommandResult>;
  executeQuiet(command: string): Promise<CommandResult>;
}
