import type { ParsedGitLabContext } from "../gitlab/context";
import type { ModeName } from "./registry";

export type ModeContext = {
  mode: ModeName;
  gitlabContext: ParsedGitLabContext;
  commentId?: number;
  baseBranch?: string;
  claudeBranch?: string;
};

export type ModeData = {
  commentId?: number;
  baseBranch?: string;
  claudeBranch?: string;
};

/**
 * Mode interface for claude-code execution modes.
 * Each mode defines its own behavior for trigger detection, prompt generation,
 * and tracking comment creation.
 *
 * Future modes might include:
 * - 'review': Optimized for code reviews without tracking comments
 * - 'freeform': For automation with no trigger checking
 */
export type Mode = {
  name: ModeName;
  description: string;

  /**
   * Determines if this mode should trigger based on the GitLab context
   */
  shouldTrigger(context: ParsedGitLabContext): boolean;

  /**
   * Prepares the mode context with any additional data needed for prompt generation
   */
  prepareContext(context: ParsedGitLabContext, data?: ModeData): ModeContext;

  /**
   * Returns additional tools that should be allowed for this mode
   * (base GitLab tools are always included)
   */
  getAllowedTools(): string[];

  /**
   * Returns tools that should be disallowed for this mode
   */
  getDisallowedTools(): string[];

  /**
   * Determines if this mode should create a tracking comment
   */
  shouldCreateTrackingComment(): boolean;
};
