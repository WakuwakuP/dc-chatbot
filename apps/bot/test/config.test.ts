import { describe, expect, it } from "vitest";
import { loadBotConfig } from "../src/index";

describe("loadBotConfig", () => {
  it("refuses to run a local bot without explicit safety rail", () => {
    expect(() => loadBotConfig({})).toThrow("DC_CHATBOT_ALLOW_DEV_BOT");
  });

  it("requires a development DM user allowlist", () => {
    expect(() =>
      loadBotConfig({
        DC_CHATBOT_ALLOW_DEV_BOT: "true",
        DISCORD_DEV_TOKEN: "123",
        DISCORD_DEV_GUILD_ID: "456",
        DC_CHATBOT_API_BASE_URL: "https://api.test",
        CF_ACCESS_CLIENT_ID: "client-id",
        CF_ACCESS_CLIENT_SECRET: "client-secret",
      }),
    ).toThrow("DISCORD_DEV_ALLOWED_USER_IDS");
  });

  it("loads development config with dev token, dev guild, and DM allowlist", () => {
    const config = loadBotConfig({
      DC_CHATBOT_ALLOW_DEV_BOT: "true",
      DISCORD_DEV_TOKEN: "123",
      DISCORD_DEV_GUILD_ID: "456",
      DISCORD_DEV_ALLOWED_USER_IDS: "111, 222,111",
      DC_CHATBOT_API_BASE_URL: "https://api.test",
      CF_ACCESS_CLIENT_ID: "client-id",
      CF_ACCESS_CLIENT_SECRET: "client-secret",
    });

    expect(config.mode).toBe("development");
    expect(config.devGuildId).toBe("456");
    expect(config.devAllowedDiscordUserIds).toEqual(["111", "222"]);
  });

  it("refuses development bypass in production", () => {
    expect(() =>
      loadBotConfig({
        DC_CHATBOT_ENV: "production",
        DC_CHATBOT_ALLOW_DEV_BOT: "true",
        DISCORD_TOKEN: "123",
        DC_CHATBOT_API_BASE_URL: "https://api.test",
        CF_ACCESS_CLIENT_ID: "client-id",
        CF_ACCESS_CLIENT_SECRET: "client-secret",
      }),
    ).toThrow("not allowed in production");
  });
});
