import { useEffect, useState } from "react";
import {
  isNotFoundProblem,
  ownerApi,
  type RegisteredMember,
} from "../api/ownerApi";
import { Button } from "../components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card";
import { useOwnerLayout } from "./OwnerLayout";
import {
  asOwnerProblem,
  EmptyState,
  ProblemNotice,
  StatusPill,
  UnavailableNotice,
} from "./routeState";

function memberStatusLabel(status: RegisteredMember["status"]) {
  return status === "active" ? "有効" : "無効";
}

export function MembersRoute() {
  const { owner } = useOwnerLayout();
  const [members, setMembers] = useState<RegisteredMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [error, setError] = useState<ReturnType<typeof asOwnerProblem>>(null);
  const [discordUserId, setDiscordUserId] = useState("");
  const [displayNameSnapshot, setDisplayNameSnapshot] = useState("");
  const [assignedOwnerDiscordUserId, setAssignedOwnerDiscordUserId] =
    useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setIsUnavailable(false);
    setError(null);

    ownerApi
      .listRegisteredMembers({ signal: controller.signal })
      .then((nextMembers) => setMembers(nextMembers))
      .catch((listError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        if (isNotFoundProblem(listError)) {
          setIsUnavailable(true);
          setMembers([]);
          return;
        }
        setError(asOwnerProblem(listError));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  const regularOwner = owner?.role === "regular_owner";
  const resolvedAssignedOwner = regularOwner
    ? owner?.ownerDiscordUserId
    : assignedOwnerDiscordUserId || undefined;

  async function createMember() {
    setActionMessage(null);
    setError(null);
    try {
      await ownerApi.createRegisteredMember({
        discordUserId,
        ...(displayNameSnapshot ? { displayNameSnapshot } : {}),
        ...(resolvedAssignedOwner
          ? { assignedOwnerDiscordUserId: resolvedAssignedOwner }
          : {}),
      });
      setActionMessage("Registered Member の追加リクエストを送信しました。");
      setDiscordUserId("");
      setDisplayNameSnapshot("");
      setAssignedOwnerDiscordUserId("");
    } catch (createError) {
      if (isNotFoundProblem(createError)) {
        setActionMessage(
          "追加 API はまだ利用できません。backend 実装後に有効になります。",
        );
        return;
      }
      setError(asOwnerProblem(createError));
    }
  }

  async function disableMember(member: RegisteredMember) {
    setActionMessage(null);
    setError(null);
    try {
      await ownerApi.disableRegisteredMember(member.discordUserId);
      setActionMessage(
        `${member.discordUserId} の無効化リクエストを送信しました。`,
      );
    } catch (disableError) {
      if (isNotFoundProblem(disableError)) {
        setActionMessage(
          "無効化 API はまだ利用できません。backend 実装後に有効になります。",
        );
        return;
      }
      setError(asOwnerProblem(disableError));
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Registered Members
        </h2>
        <p className="mt-1 text-sm text-muted">
          Allowed Discord User として扱う Registered Member を metadata-only
          で管理します。
        </p>
      </div>

      {isUnavailable ? (
        <UnavailableNotice>
          /api/v1/owner/members はまだ利用できません。
        </UnavailableNotice>
      ) : null}
      {error ? <ProblemNotice error={error} /> : null}
      {actionMessage ? (
        <UnavailableNotice>{actionMessage}</UnavailableNotice>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Member registration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-foreground">
                Discord User ID
              </span>
              <input
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-foreground"
                value={discordUserId}
                onChange={(event) => setDiscordUserId(event.target.value)}
                placeholder="123456789012345678"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-foreground">
                表示名 snapshot（任意）
              </span>
              <input
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-foreground"
                value={displayNameSnapshot}
                onChange={(event) => setDisplayNameSnapshot(event.target.value)}
                placeholder="Discord display name"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-foreground">
                Assigned Owner Discord User ID
              </span>
              <input
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                value={
                  regularOwner
                    ? (owner?.ownerDiscordUserId ?? "")
                    : assignedOwnerDiscordUserId
                }
                onChange={(event) =>
                  setAssignedOwnerDiscordUserId(event.target.value)
                }
                disabled={regularOwner}
                placeholder={
                  regularOwner
                    ? "Regular Owner は自分に固定"
                    : "Admin Owner のみ指定"
                }
              />
            </label>
          </div>
          <Button
            type="button"
            onClick={createMember}
            disabled={!discordUserId}
          >
            Registered Member を追加
          </Button>
          {regularOwner ? (
            <p className="text-xs text-muted">
              Regular Owner が追加した member は、自分に割り当てられます。
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Member list</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <p>読み込み中です。</p> : null}
          {!isLoading && members.length === 0 ? (
            <EmptyState
              title="Registered Member はまだありません"
              description="backend route が未実装、または表示可能な member がない状態です。"
            />
          ) : null}
          {members.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs text-muted">
                  <tr>
                    <th className="py-2 pr-3">Discord User ID</th>
                    <th className="py-2 pr-3">表示名 snapshot</th>
                    <th className="py-2 pr-3">status</th>
                    <th className="py-2 pr-3">assigned owner</th>
                    <th className="py-2 pr-3">updated</th>
                    <th className="py-2 pr-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr
                      key={member.discordUserId}
                      className="border-t border-border"
                    >
                      <td className="py-2 pr-3 text-foreground">
                        {member.discordUserId}
                      </td>
                      <td className="py-2 pr-3">
                        {member.displayNameSnapshot ?? "未提供"}
                      </td>
                      <td className="py-2 pr-3">
                        <StatusPill>
                          {memberStatusLabel(member.status)}
                        </StatusPill>
                      </td>
                      <td className="py-2 pr-3">
                        {member.assignedOwnerDiscordUserId}
                      </td>
                      <td className="py-2 pr-3">
                        {member.updatedAt ?? "未提供"}
                      </td>
                      <td className="py-2 pr-3">
                        <Button
                          type="button"
                          className="px-3 py-1"
                          onClick={() => void disableMember(member)}
                          disabled={member.status === "disabled"}
                        >
                          無効化
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
