import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { createServiceContainer } from "../../../src/services";
import { EnvVar } from "../../../src/types";
import { DiscordService, LimiterService } from "./services";
import { LoggerService } from "./services/logger.service";
import { RedisAdapterFactory } from "./services/redis.factory";
import type { WebhookPayload } from "./types";
import { WebhookOrchestrator } from "./webhook-orchestrator";

// Create service container with real implementations
const services = createServiceContainer();
const logger = new LoggerService(services.environment);
const discord = new DiscordService(
  logger,
  services.environment,
  services.httpClient,
);
const redisAdapterFactory = new RedisAdapterFactory(services.environment);
const limiter = new LimiterService(redisAdapterFactory, services.environment);

// Create webhook orchestrator with injected services
const webhookOrchestrator = new WebhookOrchestrator(
  services.environment,
  services.logger,
  services.httpClient,
  services.gitLabAdapter,
  discord,
  limiter,
);

const app = new Hono();

// Log all requests
app.use("*", async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  services.logger.info(`${method} ${path}`, {
    method,
    path,
    headers: services.logger.maskSensitive(
      Object.fromEntries(c.req.raw.headers),
    ),
  });

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  services.logger.info(`${method} ${path} ${status} ${duration}ms`, {
    method,
    path,
    status,
    duration,
  });
});

app.get("/health", (c) => c.text("ok"));

// Optional admin endpoint to disable bot
app.get(
  "/admin/disable",
  bearerAuth({ token: services.environment.get(EnvVar.ADMIN_TOKEN) || "" }),
  (c) => {
    services.environment.set(EnvVar.CLAUDE_ENABLED, "true");
    services.logger.warn("Bot disabled via admin endpoint");
    return c.text("disabled");
  },
);

app.get(
  "/admin/enable",
  bearerAuth({ token: services.environment.get(EnvVar.ADMIN_TOKEN) || "" }),
  (c) => {
    services.environment.set(EnvVar.CLAUDE_ENABLED, "false");
    services.logger.info("Bot enabled via admin endpoint");
    return c.text("enabled");
  },
);

// Single webhook endpoint for all projects
app.post("/webhook", async (c) => {
  const gitlabEvent = c.req.header("x-gitlab-event");
  const gitlabToken = c.req.header("x-gitlab-token");

  services.logger.debug("Webhook received", {
    event: gitlabEvent,
    hasToken: !!gitlabToken,
  });

  const body = await c.req.json<WebhookPayload>();

  // Process webhook using orchestrator
  const result = await webhookOrchestrator.processWebhook(
    gitlabEvent,
    gitlabToken,
    body,
  );

  // Handle result
  switch (result.status) {
    case "ignored":
    case "disabled":
      return c.text(result.message || result.status);
    case "rate-limited":
      return c.text(
        result.message || result.status,
        (result.errorCode || 429) as any,
      );
    case "started":
      return c.json({
        status: result.status,
        pipelineId: result.pipelineId,
        branch: result.branch,
      });
    case "error":
      return result.errorCode
        ? c.text(result.message || "error", result.errorCode as any)
        : c.json(
            { error: result.message || "Failed to trigger pipeline" },
            500,
          );
    default:
      return c.json({ error: "Unknown status" }, 500);
  }
});

const port = Number(services.environment.get(EnvVar.PORT)) || 3000;
services.logger.info(`GitLab Claude Webhook Server starting on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
