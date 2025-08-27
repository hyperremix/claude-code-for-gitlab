export type CommandOptions = {
  env?: Record<string, string>;
  cwd?: string;
};

export type CommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};
