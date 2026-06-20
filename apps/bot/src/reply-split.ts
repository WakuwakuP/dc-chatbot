export const DISCORD_MESSAGE_MAX_LENGTH = 2000;

export function splitDiscordReply(
  text: string,
  maxLength = DISCORD_MESSAGE_MAX_LENGTH,
): string[] {
  if (maxLength < 1) {
    throw new Error("maxLength must be positive");
  }

  const chunks: string[] = [];
  let remaining = text.trim();

  while (remaining.length > maxLength) {
    const splitAt = findSplitPoint(remaining, maxLength);
    chunks.push(remaining.slice(0, splitAt).trimEnd());
    remaining = remaining.slice(splitAt).trimStart();
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
}

function findSplitPoint(text: string, maxLength: number): number {
  const newlineIndex = text.lastIndexOf("\n", maxLength);
  if (newlineIndex > 0) {
    return newlineIndex;
  }

  const spaceIndex = text.lastIndexOf(" ", maxLength);
  if (spaceIndex > 0) {
    return spaceIndex;
  }

  return maxLength;
}
