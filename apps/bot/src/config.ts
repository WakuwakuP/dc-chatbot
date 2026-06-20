export type BotRuntimeMode = "development" | "production";

export type BotConfig = {
  mode: BotRuntimeMode;
  discordToken: string;
  apiBaseUrl: string;
  cloudflareAccessClientId: string;
  cloudflareAccessClientSecret: string;
  devGuildId: string | null;
};

function readRequired(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required bot config: ${key}`);
  }
  return value;
}

export function loadBotConfig(env: NodeJS.ProcessEnv = process.env): BotConfig {
  const mode: BotRuntimeMode =
    env.DC_CHATBOT_ENV === "production" ? "production" : "development";

  if (mode === "production") {
    return {
      mode,
      discordToken: readRequired(env, "DISCORD_TOKEN"),
      apiBaseUrl: readRequired(env, "DC_CHATBOT_API_BASE_URL"),
      cloudflareAccessClientId: readRequired(env, "CF_ACCESS_CLIENT_ID"),
      cloudflareAccessClientSecret: readRequired(
        env,
        "CF_ACCESS_CLIENT_SECRET",
      ),
      devGuildId: null,
    };
  }

  if (env.DC_CHATBOT_ALLOW_DEV_BOT !== "true") {
    throw new Error(
      "Set DC_CHATBOT_ALLOW_DEV_BOT=true to run the local Bot Worker.",
    );
  }

  if (
    env.DISCORD_TOKEN &&
    env.DC_CHATBOT_ALLOW_PRODUCTION_BOT_TOKEN !== "true"
  ) {
    throw new Error(
      "Refusing to use DISCORD_TOKEN outside production. Use DISCORD_DEV_TOKEN for local development.",
    );
  }

  return {
    mode,
    discordToken: readRequired(env, "DISCORD_DEV_TOKEN"),
    apiBaseUrl: readRequired(env, "DC_CHATBOT_API_BASE_URL"),
    cloudflareAccessClientId: readRequired(env, "CF_ACCESS_CLIENT_ID"),
    cloudflareAccessClientSecret: readRequired(env, "CF_ACCESS_CLIENT_SECRET"),
    devGuildId: readRequired(env, "DISCORD_DEV_GUILD_ID"),
  };
}
