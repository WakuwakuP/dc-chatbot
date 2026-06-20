import { useEffect, useState } from "react";
import {
  isNotFoundProblem,
  ownerApi,
  type ConnectionSummary,
  type OwnerActionResult,
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

function connectionStatusLabel(status: ConnectionSummary["status"]) {
  switch (status) {
    case "connected":
      return "接続済み";
    case "needs_reconnect":
      return "再接続が必要";
    case "revoked":
      return "revoke 済み";
    case "missing":
      return "未接続";
  }
}

export function ConnectionRoute() {
  const { owner } = useOwnerLayout();
  const [connection, setConnection] = useState<ConnectionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [error, setError] = useState<ReturnType<typeof asOwnerProblem>>(null);
  const [actionResult, setActionResult] = useState<OwnerActionResult | null>(
    null,
  );
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setIsUnavailable(false);
    setError(null);

    ownerApi
      .getConnection({ signal: controller.signal })
      .then((nextConnection) => setConnection(nextConnection))
      .catch((connectionError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        if (isNotFoundProblem(connectionError)) {
          setIsUnavailable(true);
          setConnection(
            owner
              ? {
                  ownerDiscordUserId: owner.ownerDiscordUserId,
                  status: owner.connectionStatus,
                  lastCheckedAt: null,
                  needsReconnectReason: null,
                }
              : null,
          );
          return;
        }
        setError(asOwnerProblem(connectionError));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [owner]);

  async function runConnectionAction(kind: "reconnect" | "revoke") {
    setActionResult(null);
    setActionMessage(null);
    setError(null);
    try {
      const result =
        kind === "reconnect"
          ? await ownerApi.startReconnect()
          : await ownerApi.revokeConnection();
      setActionResult(result);
      if (result.redirectUrl) {
        setActionMessage(
          "接続フローの redirect URL が返されました。credential material は UI に保存しません。",
        );
      }
    } catch (actionError) {
      if (isNotFoundProblem(actionError)) {
        setActionMessage(
          kind === "reconnect"
            ? "reconnect API はまだ利用できません。backend 実装後に有効になります。"
            : "revoke API はまだ利用できません。backend 実装後に有効になります。",
        );
        return;
      }
      setError(asOwnerProblem(actionError));
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Connection status
        </h2>
        <p className="mt-1 text-sm text-muted">
          Owner Discord User の ChatGPT Subscription Connection lifecycle
          を管理します。credential material は表示・保存しません。
        </p>
      </div>

      {isUnavailable ? (
        <UnavailableNotice>
          /api/v1/owner/connection はまだ利用できません。/owner/me の status を
          fallback 表示します。
        </UnavailableNotice>
      ) : null}
      {error ? <ProblemNotice error={error} /> : null}
      {actionMessage ? (
        <UnavailableNotice>{actionMessage}</UnavailableNotice>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current connection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? <p>読み込み中です。</p> : null}
            {!isLoading && !connection ? (
              <EmptyState
                title="Connection metadata はありません"
                description="backend route が未実装、または connection が未作成です。"
              />
            ) : null}
            {connection ? (
              <dl className="grid gap-2 text-sm">
                <div className="flex flex-wrap gap-2">
                  <dt className="font-medium text-foreground">status</dt>
                  <dd>
                    <StatusPill>
                      {connectionStatusLabel(connection.status)}
                    </StatusPill>
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">
                    Owner Discord User ID
                  </dt>
                  <dd>{connection.ownerDiscordUserId}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">last checked</dt>
                  <dd>{connection.lastCheckedAt ?? "API 未提供"}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">
                    needs reconnect reason
                  </dt>
                  <dd>{connection.needsReconnectReason ?? "API 未提供"}</dd>
                </div>
              </dl>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reconnect / revoke actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>
              reconnect は API 側の connection 開始 endpoint に委譲します。UI は
              OAuth/state や credential を browser storage に保存しません。
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void runConnectionAction("reconnect")}
              >
                Reconnect を開始
              </Button>
              <Button
                type="button"
                onClick={() => void runConnectionAction("revoke")}
              >
                Connection を revoke
              </Button>
            </div>
            {actionResult ? (
              <div className="rounded-md border border-border bg-background p-3 text-sm">
                <p className="font-medium text-foreground">
                  {actionResult.title}
                </p>
                <p>status: {actionResult.status}</p>
                <p>
                  redirect:{" "}
                  {actionResult.redirectUrl ? "API から返却あり" : "なし"}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
