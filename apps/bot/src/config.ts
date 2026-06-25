export type BotRuntimeMode = "development" | "production";

export type BotConfig = {
  mode: BotRuntimeMode;
  discordToken: string;
  apiBaseUrl: string;
  cloudflareAccessClientId: string;
  cloudflareAccessClientSecret: string;
  localAuthBypassSecret: string | null;
  devGuildId: string | null;
  devAllowedDiscordUserIds: readonly string[];
  defaultModel: string;
};

const DISCORD_SNOWFLAKE_PATTERN = /^\d{1,32}$/u;

function readRequired(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required bot config: ${key}`);
  }
  return value;
}

function readDiscordUserIdList(env: NodeJS.ProcessEnv, key: string): string[] {
  const rawValue = readRequired(env, key);
  const values = rawValue
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (values.length === 0) {
    throw new Error(`Missing required bot config: ${key}`);
  }

  for (const value of values) {
    if (!DISCORD_SNOWFLAKE_PATTERN.test(value)) {
      throw new Error(`${key} must contain only Discord snowflake IDs.`);
    }
  }

  return [...new Set(values)];
}

export function loadBotConfig(env: NodeJS.ProcessEnv = process.env): BotConfig {
  const mode: BotRuntimeMode =
    env.DC_CHATBOT_ENV === "production" ? "production" : "development";

  if (mode === "production") {
    if (env.DC_CHATBOT_ALLOW_DEV_BOT === "true") {
      throw new Error(
        "Development Bot Worker bypass is not allowed in production.",
      );
    }

    return {
      mode,
      discordToken: readRequired(env, "DISCORD_TOKEN"),
      apiBaseUrl: readRequired(env, "DC_CHATBOT_API_BASE_URL"),
      cloudflareAccessClientId: readRequired(env, "CF_ACCESS_CLIENT_ID"),
      cloudflareAccessClientSecret: readRequired(
        env,
        "CF_ACCESS_CLIENT_SECRET",
      ),
      localAuthBypassSecret: null,
      devGuildId: null,
      devAllowedDiscordUserIds: [],
      defaultModel: env.DC_CHATBOT_MODEL ?? "fake-model",
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
    localAuthBypassSecret: readRequired(env, "LOCAL_AUTH_BYPASS_SECRET"),
    devGuildId: readRequired(env, "DISCORD_DEV_GUILD_ID"),
    devAllowedDiscordUserIds: readDiscordUserIdList(
      env,
      "DISCORD_DEV_ALLOWED_USER_IDS",
    ),
    defaultModel: env.DC_CHATBOT_MODEL ?? "fake-model",
  };
}
