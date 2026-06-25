import type {
  OwnerNotificationDeliverySafeErrorCategory,
  OwnerNotificationItem,
} from "@dc-chatbot/shared";
import type { Client, User } from "discord.js";
import type { BotApiClient } from "./api-client";

export type OwnerNotificationDeliveryLogger = {
  info(message: string, metadata: Record<string, unknown>): void;
};

export type DeliverPendingOwnerNotificationsOptions = {
  limit?: number;
  now?: () => Date;
  logger?: OwnerNotificationDeliveryLogger;
};

export type OwnerNotificationDeliverySummary = {
  fetchedCount: number;
  deliveredCount: number;
  failedCount: number;
};

const DEFAULT_FETCH_LIMIT = 10;

export function buildOwnerNotificationDmText(
  notification: OwnerNotificationItem,
): string {
  const candidateDiscordUserId = notification.candidateDiscordUserId ?? "不明";
  const triggerKind = notification.triggerKind ?? "不明";
  const requestId = notification.requestId ?? "不明";

  return [
    "未許可のDiscord UserからPrivate BotへのDM利用がありました。",
    `Candidate Discord User ID: ${candidateDiscordUserId}`,
    `Response Trigger: ${triggerKind}`,
    `Request ID: ${requestId}`,
    `Owner Notification ID: ${notification.ownerNotificationId}`,
  ].join("\n");
}

export async function deliverPendingOwnerNotifications(
  client: Client,
  apiClient: BotApiClient,
  options: DeliverPendingOwnerNotificationsOptions = {},
): Promise<OwnerNotificationDeliverySummary> {
  const list = await apiClient.fetchPendingOwnerNotifications(
    options.limit ?? DEFAULT_FETCH_LIMIT,
  );
  let deliveredCount = 0;
  let failedCount = 0;

  for (const notification of list.ownerNotifications) {
    try {
      const user = await client.users.fetch(
        notification.notificationOwnerDiscordUserId,
      );
      await sendOwnerNotification(user, notification);
      try {
        await apiClient.updateOwnerNotificationDelivery({
          ownerNotificationId: notification.ownerNotificationId,
          status: "delivered",
          deliveredAt: (options.now?.() ?? new Date()).toISOString(),
        });
      } catch {
        options.logger?.info(
          "dc-chatbot owner notification status update failed",
          {
            eventType: "owner_notification_status_update_failed",
            ownerNotificationId: notification.ownerNotificationId,
            safeErrorCategory: "bot_api_status_update_failed",
          },
        );
      }
      deliveredCount += 1;
    } catch (error) {
      failedCount += 1;
      const safeErrorCategory = safeOwnerNotificationDeliveryError(error);
      try {
        await apiClient.updateOwnerNotificationDelivery({
          ownerNotificationId: notification.ownerNotificationId,
          status: "failed",
          safeErrorCategory,
        });
      } catch {
        options.logger?.info(
          "dc-chatbot owner notification status update failed",
          {
            eventType: "owner_notification_status_update_failed",
            ownerNotificationId: notification.ownerNotificationId,
            safeErrorCategory: "bot_api_status_update_failed",
          },
        );
      }
    }
  }

  return {
    fetchedCount: list.ownerNotifications.length,
    deliveredCount,
    failedCount,
  };
}

async function sendOwnerNotification(
  user: Pick<User, "send">,
  notification: OwnerNotificationItem,
): Promise<void> {
  await user.send(buildOwnerNotificationDmText(notification));
}

function safeOwnerNotificationDeliveryError(
  error: unknown,
): OwnerNotificationDeliverySafeErrorCategory {
  if (error instanceof Error && error.name === "DiscordAPIError") {
    return "discord_api_error";
  }
  return "discord_delivery_failed";
}
