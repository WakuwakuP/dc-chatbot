import { describe, expect, it } from "vitest";
import {
  DISCORD_REPLY_CONTINUATION_PREFIX,
  DISCORD_REPLY_SAFE_MAX_LENGTH,
  splitDiscordReply,
} from "../src/index";

describe("splitDiscordReply", () => {
  it("keeps chunks within the safe Discord reply limit by default", () => {
    const chunks = splitDiscordReply("a".repeat(4_501));

    expect(chunks).toHaveLength(3);
    expect(
      chunks.every((chunk) => chunk.length <= DISCORD_REPLY_SAFE_MAX_LENGTH),
    ).toBe(true);
  });

  it("prefers whitespace split points when continuation prefix cannot fit", () => {
    expect(splitDiscordReply("hello world", 7)).toEqual(["hello", "world"]);
  });

  it("marks continuation messages when there is room", () => {
    const chunks = splitDiscordReply("a ".repeat(1_200));

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[1]?.startsWith(DISCORD_REPLY_CONTINUATION_PREFIX)).toBe(true);
    expect(
      chunks.every((chunk) => chunk.length <= DISCORD_REPLY_SAFE_MAX_LENGTH),
    ).toBe(true);
  });

  it("repairs code fences across split boundaries", () => {
    const input = `\`\`\`ts\n${"const x = 1;\n".repeat(220)}\`\`\``;
    const chunks = splitDiscordReply(input);

    expect(chunks.length).toBeGreaterThan(1);
    expect(
      chunks.every((chunk) => chunk.length <= DISCORD_REPLY_SAFE_MAX_LENGTH),
    ).toBe(true);
    expect(chunks[0]?.endsWith("\n```")).toBe(true);
    expect(
      chunks[1]?.startsWith(`${DISCORD_REPLY_CONTINUATION_PREFIX}\`\`\`ts\n`),
    ).toBe(true);
  });
});
