import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const withBot = process.argv.includes("--with-bot");
const dotenvPath = new URL("../.env", import.meta.url);
const children = new Set();
let isShuttingDown = false;

function parseDotEnvValue(rawValue) {
  const value = rawValue.trim();
  const quote = value[0];
  if (
    (quote === '"' || quote === "'") &&
    value.length >= 2 &&
    value[value.length - 1] === quote
  ) {
    const unquoted = value.slice(1, -1);
    if (quote === '"') {
      return unquoted
        .replaceAll("\\n", "\n")
        .replaceAll("\\r", "\r")
        .replaceAll("\\t", "\t")
        .replaceAll('\\"', '"')
        .replaceAll("\\\\", "\\");
    }
    return unquoted;
  }

  const commentIndex = value.search(/\s#/u);
  return (commentIndex === -1 ? value : value.slice(0, commentIndex)).trim();
}

function loadDotEnv(env) {
  let content;
  try {
    content = readFileSync(dotenvPath, "utf8");
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return;
    }
    throw error;
  }

  for (const [index, line] of content.split(/\r?\n/u).entries()) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }

    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/u.exec(
      trimmed,
    );
    if (!match) {
      console.warn(`[dev] Ignoring invalid .env line ${index + 1}`);
      continue;
    }

    const [, key, rawValue] = match;
    if (env[key] === undefined) {
      env[key] = parseDotEnvValue(rawValue);
    }
  }
}

loadDotEnv(process.env);

function runPnpm(args, options = {}) {
  const child = spawn("pnpm", args, {
    env: process.env,
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (options.track !== false) {
    children.add(child);
    child.once("exit", () => {
      children.delete(child);
    });
  }

  return child;
}

function runPnpmToCompletion(args) {
  return new Promise((resolve, reject) => {
    const child = runPnpm(args, { track: false });
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `pnpm ${args.join(" ")} failed${
            signal
              ? ` with signal ${signal}`
              : ` with exit code ${code ?? "unknown"}`
          }`,
        ),
      );
    });
    child.once("error", reject);
  });
}

function startService(name, args) {
  const child = runPnpm(args);
  child.once("exit", (code, signal) => {
    if (isShuttingDown) {
      return;
    }
    console.error(
      `[dev] ${name} exited${
        signal
          ? ` with signal ${signal}`
          : ` with exit code ${code ?? "unknown"}`
      }`,
    );
    shutdown(code && code > 0 ? code : 1);
  });
  child.once("error", (error) => {
    if (!isShuttingDown) {
      console.error(`[dev] ${name} failed to start: ${error.message}`);
      shutdown(1);
    }
  });
}

async function waitForApi() {
  const url = "http://127.0.0.1:8787/health";
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.info("[dev] API is healthy; starting Bot Worker");
        return;
      }
    } catch {
      // API is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`API did not become healthy: ${url}`);
}

function shutdown(exitCode = 0) {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  for (const child of children) {
    child.kill("SIGTERM");
  }

  setTimeout(() => {
    for (const child of children) {
      child.kill("SIGKILL");
    }
    process.exit(exitCode);
  }, 5_000).unref();

  if (children.size === 0) {
    process.exit(exitCode);
  }
}

process.once("SIGINT", () => shutdown(0));
process.once("SIGTERM", () => shutdown(0));

try {
  await runPnpmToCompletion(["--filter", "@dc-chatbot/api", "dev:prepare"]);
  startService("API", ["--filter", "@dc-chatbot/api", "dev"]);
  startService("Web", ["--filter", "@dc-chatbot/web", "dev"]);

  if (withBot) {
    await waitForApi();
    startService("Bot", ["--filter", "@dc-chatbot/bot", "dev"]);
  }
} catch (error) {
  console.error(
    `[dev] ${error instanceof Error ? error.message : String(error)}`,
  );
  shutdown(1);
}
