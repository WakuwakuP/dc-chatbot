import { Client, GatewayIntentBits, Partials } from "discord.js";
import { createBotApiClient, type BotApiClient } from "./api-client";
import type { BotConfig } from "./config";
import { registerDiscordMessageHandlers } from "./message-handler";
import {
  deliverPendingOwnerNotifications,
  type OwnerNotificationDeliverySummary,
} from "./owner-notification-delivery";

export type GracefulShutdownOptions = {
  signals?: readonly NodeJS.Signals[];
  onShutdownComplete?: (signal: NodeJS.Signals) => void;
};

export type BotLifecycleLogger = {
  info(message: string, metadata: Record<string, unknown>): void;
};

export type StartBotOptions = {
  apiClient?: BotApiClient;
  ownerNotificationPollIntervalMs?: number;
  deliverOwnerNotifications?: typeof deliverPendingOwnerNotifications;
  logger?: BotLifecycleLogger;
};

const OWNER_NOTIFICATION_POLL_INTERVAL_MS = 30_000;

export function createDiscordClient(): Client {
  return new Client({
    intents: [
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.Guilds,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel],
  });
}

export async function startBot(
  config: BotConfig,
  client = createDiscordClient(),
  options: StartBotOptions = {},
): Promise<Client> {
  if (config.mode === "development" && !config.devGuildId) {
    throw new Error("Development Bot Worker requires a dev guild safety rail.");
  }
  if (
    config.mode === "development" &&
    config.devAllowedDiscordUserIds.length === 0
  ) {
    throw new Error("Development Bot Worker requires a dev DM safety rail.");
  }

  const apiClient =
    options.apiClient ??
    createBotApiClient({
      apiBaseUrl: config.apiBaseUrl,
      cloudflareAccessClientId: config.cloudflareAccessClientId,
      cloudflareAccessClientSecret: config.cloudflareAccessClientSecret,
      localAuthBypassSecret: config.localAuthBypassSecret,
    });

  await apiClient.checkHealth().catch(() => {
    throw new Error(
      "Bot API health check failed; refusing to connect Discord Gateway.",
    );
  });

  registerDiscordMessageHandlers(client, config, apiClient);

  await client.login(config.discordToken);
  const stopOwnerNotificationPolling = startOwnerNotificationDeliveryPolling(
    client,
    apiClient,
    options,
  );
  installClientDestroyCleanup(client, stopOwnerNotificationPolling);
  return client;
}

function startOwnerNotificationDeliveryPolling(
  client: Client,
  apiClient: BotApiClient,
  options: StartBotOptions,
): () => void {
  const deliver =
    options.deliverOwnerNotifications ?? deliverPendingOwnerNotifications;
  const pollIntervalMs =
    options.ownerNotificationPollIntervalMs ??
    OWNER_NOTIFICATION_POLL_INTERVAL_MS;
  let isPolling = false;
  let isStopped = false;

  async function pollOnce(): Promise<void> {
    if (isPolling || isStopped) {
      return;
    }
    isPolling = true;
    try {
      const deliveryOptions = options.logger
        ? { logger: options.logger }
        : {};
      const summary: OwnerNotificationDeliverySummary = await deliver(
        client,
        apiClient,
        deliveryOptions,
      );
      options.logger?.info("dc-chatbot owner notification delivery polled", {
        eventType: "owner_notification_delivery_polled",
        fetchedCount: summary.fetchedCount,
        deliveredCount: summary.deliveredCount,
        failedCount: summary.failedCount,
      });
    } catch {
      options.logger?.info("dc-chatbot owner notification delivery poll failed", {
        eventType: "owner_notification_delivery_poll_failed",
        safeErrorCategory: "owner_notification_poll_failed",
      });
    } finally {
      isPolling = false;
    }
  }

  void pollOnce();
  const interval = setInterval(() => {
    void pollOnce();
  }, pollIntervalMs);
  interval.unref?.();

  return () => {
    isStopped = true;
    clearInterval(interval);
  };
}

function installClientDestroyCleanup(client: Client, cleanup: () => void): void {
  const originalDestroy = client.destroy.bind(client);
  let isCleanedUp = false;
  client.destroy = (() => {
    if (!isCleanedUp) {
      isCleanedUp = true;
      cleanup();
    }
    return originalDestroy();
  }) as Client["destroy"];
}

export function installGracefulShutdown(
  client: Client,
  options: GracefulShutdownOptions = {},
): () => void {
  const signals = options.signals ?? ["SIGINT", "SIGTERM"];
  let isShuttingDown = false;

  const shutdown = (signal: NodeJS.Signals) => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;
    client.destroy();
    options.onShutdownComplete?.(signal);
  };

  for (const signal of signals) {
    process.once(signal, shutdown);
  }

  return () => {
    for (const signal of signals) {
      process.off(signal, shutdown);
    }
  };
}
