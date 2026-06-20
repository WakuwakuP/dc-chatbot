import { describe, expect, it } from "vitest";
import { loadBotConfig } from "../src/index";

describe("loadBotConfig", () => {
  it("refuses to run a local bot without explicit safety rail", () => {
    expect(() => loadBotConfig({})).toThrow("DC_CHATBOT_ALLOW_DEV_BOT");
  });

  it("loads development config with dev token and dev guild", () => {
    const config = loadBotConfig({
      DC_CHATBOT_ALLOW_DEV_BOT: "true",
      DISCORD_DEV_TOKEN: "dev-token",
      DISCORD_DEV_GUILD_ID: "guild-id",
      DC_CHATBOT_API_BASE_URL: "https://api.test",
      CF_ACCESS_CLIENT_ID: "client-id",
      CF_ACCESS_CLIENT_SECRET: "client-secret",
    });

    expect(config.mode).toBe("development");
    expect(config.devGuildId).toBe("guild-id");
  });
});
