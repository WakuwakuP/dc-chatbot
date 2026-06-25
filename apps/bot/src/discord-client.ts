import { Client, GatewayIntentBits, Partials } from "discord.js";
import { createBotApiClient } from "./api-client";
import type { BotConfig } from "./config";
import { registerDiscordMessageHandlers } from "./message-handler";

export type GracefulShutdownOptions = {
  signals?: readonly NodeJS.Signals[];
  onShutdownComplete?: (signal: NodeJS.Signals) => void;
};

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

  const apiClient = createBotApiClient({
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
  return client;
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
