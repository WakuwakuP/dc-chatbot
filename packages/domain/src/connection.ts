export type ChatGPTSubscriptionConnectionRef = {
  id: string;
  ownerDiscordUserId: string;
  status: "active" | "needs_reconnect" | "revoked";
};

export type EffectiveConnectionInput = {
  directConnection: ChatGPTSubscriptionConnectionRef | null;
  assignedOwnerConnection: ChatGPTSubscriptionConnectionRef | null;
};

export type EffectiveConnectionResolution = {
  connection: ChatGPTSubscriptionConnectionRef | null;
  source: "direct" | "assigned_owner" | "none";
};

function isUsableConnection(
  connection: ChatGPTSubscriptionConnectionRef | null,
): connection is ChatGPTSubscriptionConnectionRef {
  return connection?.status === "active";
}

export function resolveEffectiveChatGPTSubscriptionConnection(
  input: EffectiveConnectionInput,
): EffectiveConnectionResolution {
  if (isUsableConnection(input.directConnection)) {
    return { connection: input.directConnection, source: "direct" };
  }

  if (isUsableConnection(input.assignedOwnerConnection)) {
    return {
      connection: input.assignedOwnerConnection,
      source: "assigned_owner",
    };
  }

  return { connection: null, source: "none" };
}
