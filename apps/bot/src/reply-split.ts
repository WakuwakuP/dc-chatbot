export const DISCORD_MESSAGE_MAX_LENGTH = 2000;
export const DISCORD_REPLY_SAFE_MAX_LENGTH = 1900;
export const DISCORD_REPLY_CONTINUATION_PREFIX = "（続き）\n";

const CODE_FENCE_PATTERN = /^```([^`\n]*)/u;
const CODE_FENCE_REPAIR_RESERVE = 96;

export function splitDiscordReply(
  text: string,
  maxLength = DISCORD_REPLY_SAFE_MAX_LENGTH,
): string[] {
  if (maxLength < 1) {
    throw new Error("maxLength must be positive");
  }

  const normalizedText = text.trim();
  if (normalizedText.length === 0) {
    return [];
  }

  const repairBudget =
    maxLength > CODE_FENCE_REPAIR_RESERVE
      ? maxLength - CODE_FENCE_REPAIR_RESERVE
      : maxLength;
  const rawChunks = splitPlainText(normalizedText, repairBudget);
  return repairCodeFences(rawChunks, maxLength);
}

function splitPlainText(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let remaining = text;

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
  const paragraphIndex = text.lastIndexOf("\n\n", maxLength);
  if (paragraphIndex > 0) {
    return paragraphIndex;
  }

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

function repairCodeFences(
  rawChunks: readonly string[],
  maxLength: number,
): string[] {
  const chunks: string[] = [];
  let openFence: string | null = null;

  for (const rawChunk of rawChunks) {
    const continuationPrefix =
      chunks.length > 0 && canFitContinuationPrefix(maxLength)
        ? DISCORD_REPLY_CONTINUATION_PREFIX
        : "";
    const reopenFence = openFence ? `\`\`\`${openFence}\n` : "";
    const fenceStateAfterChunk = scanCodeFenceState(rawChunk, openFence);
    const closeFence = fenceStateAfterChunk ? "\n```" : "";
    const candidate = `${continuationPrefix}${reopenFence}${rawChunk}${closeFence}`;

    if (candidate.length <= maxLength) {
      chunks.push(candidate);
      openFence = fenceStateAfterChunk;
      continue;
    }

    const fallbackChunks = splitPlainText(rawChunk, maxLength);
    for (const fallbackChunk of fallbackChunks) {
      chunks.push(fallbackChunk);
    }
    openFence = scanCodeFenceState(rawChunk, openFence);
  }

  return chunks;
}

function canFitContinuationPrefix(maxLength: number): boolean {
  return maxLength > DISCORD_REPLY_CONTINUATION_PREFIX.length + 1;
}

function scanCodeFenceState(
  text: string,
  initialState: string | null,
): string | null {
  let openFence = initialState;
  for (const line of text.split("\n")) {
    const match = CODE_FENCE_PATTERN.exec(line.trimStart());
    if (!match) {
      continue;
    }

    if (openFence) {
      openFence = null;
    } else {
      openFence = match[1]?.trim() ?? "";
    }
  }
  return openFence;
}
