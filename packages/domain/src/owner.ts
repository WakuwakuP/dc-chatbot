import type { OwnerRole } from "@dc-chatbot/shared";

export type OwnerScope = {
  ownerDiscordUserId: string;
  role: OwnerRole;
};

export function canManageOwnerSettings(scope: OwnerScope): boolean {
  return scope.role === "admin_owner";
}

export function canManageRegisteredMember(
  scope: OwnerScope,
  memberAssignedOwnerDiscordUserId: string,
): boolean {
  return (
    scope.role === "admin_owner" ||
    scope.ownerDiscordUserId === memberAssignedOwnerDiscordUserId
  );
}

export function ownerRoleLabelJa(role: OwnerRole): string {
  return role === "admin_owner" ? "Admin Owner" : "Regular Owner";
}
