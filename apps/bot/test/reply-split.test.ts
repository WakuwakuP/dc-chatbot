import { describe, expect, it } from "vitest";
import { splitDiscordReply } from "../src/index";

describe("splitDiscordReply", () => {
  it("keeps chunks within the Discord message limit", () => {
    const chunks = splitDiscordReply("a".repeat(4501), 2000);

    expect(chunks).toHaveLength(3);
    expect(chunks.every((chunk) => chunk.length <= 2000)).toBe(true);
  });

  it("prefers whitespace split points", () => {
    expect(splitDiscordReply("hello world", 7)).toEqual(["hello", "world"]);
  });
});
