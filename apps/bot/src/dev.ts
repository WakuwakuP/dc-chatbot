import { loadBotConfig } from "./config";
import { installGracefulShutdown, startBot } from "./discord-client";

const config = loadBotConfig();
const client = await startBot(config);

installGracefulShutdown(client, {
  onShutdownComplete(signal) {
    console.info("dc-chatbot Bot Worker stopped", {
      signal,
      mode: config.mode,
    });
  },
});

console.info("dc-chatbot Bot Worker started", {
  mode: config.mode,
  hasDevGuildSafetyRail: config.devGuildId !== null,
  hasDevDmSafetyRail: config.devAllowedDiscordUserIds.length > 0,
  readyAt: client.readyAt?.toISOString() ?? null,
});
