import { loadBotConfig } from "./config";
import { startBot } from "./discord-client";

const config = loadBotConfig();
const client = await startBot(config);

console.info("dc-chatbot Bot Worker started", {
  mode: config.mode,
  hasDevGuildSafetyRail: config.devGuildId !== null,
  readyAt: client.readyAt?.toISOString() ?? null,
});
