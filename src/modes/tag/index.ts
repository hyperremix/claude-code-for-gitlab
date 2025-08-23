import { parseGitLabWebhookPayload } from "../../gitlab/context";
import { checkContainsTrigger } from "../../gitlab/validation/trigger";
import type { Mode } from "../types";

/**
 * Tag mode implementation.
 *
 * The traditional implementation mode that responds to @claude mentions,
 * issue assignments, or labels. Creates tracking comments showing progress
 * and has full implementation capabilities.
 */
export const tagMode: Mode = {
  name: "tag",
  description: "Traditional implementation mode triggered by @claude mentions",

  shouldTrigger(_context) {
    const payload = parseGitLabWebhookPayload();
    if (!payload) {
      return false;
    }

    return checkContainsTrigger({
      payload,
      triggerPhrase: "@claude", // Default trigger phrase
      directPrompt: process.env.DIRECT_PROMPT,
    });
  },

  prepareContext(context, data) {
    return {
      mode: "tag",
      gitlabContext: context,
      commentId: data?.commentId,
      baseBranch: data?.baseBranch,
      claudeBranch: data?.claudeBranch,
    };
  },

  getAllowedTools() {
    return [];
  },

  getDisallowedTools() {
    return [];
  },

  shouldCreateTrackingComment() {
    return true;
  },
};
