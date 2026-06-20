import { Client, GatewayIntentBits, Partials } from "discord.js";
import type { BotConfig } from "./config";

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

  await client.login(config.discordToken);
  return client;
}
