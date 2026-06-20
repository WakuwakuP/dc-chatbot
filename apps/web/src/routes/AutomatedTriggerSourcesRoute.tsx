import { useEffect, useState } from "react";
import {
  isNotFoundProblem,
  ownerApi,
  type AutomatedTriggerSource,
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

function statusLabel(status: AutomatedTriggerSource["status"]) {
  return status === "active" ? "有効" : "無効";
}

export function AutomatedTriggerSourcesRoute() {
  const { canManageOwnerSettings, ownerStatus } = useOwnerLayout();
  const [sources, setSources] = useState<AutomatedTriggerSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [error, setError] = useState<ReturnType<typeof asOwnerProblem>>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setIsUnavailable(false);
    setError(null);

    ownerApi
      .listAutomatedTriggerSources({ signal: controller.signal })
      .then((nextSources) => setSources(nextSources))
      .catch((sourcesError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        if (isNotFoundProblem(sourcesError)) {
          setIsUnavailable(true);
          setSources([]);
          return;
        }
        setError(asOwnerProblem(sourcesError));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  const disabled = !canManageOwnerSettings;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Automated Trigger Sources
        </h2>
        <p className="mt-1 text-sm text-muted">
          明示的に許可された Discord bot / webhook source の trigger-only 設定
          metadata を管理します。
        </p>
      </div>

      {ownerStatus === "ready" && disabled ? (
        <UnavailableNotice>
          Regular Owner は Automated Trigger Source settings を変更できません。
        </UnavailableNotice>
      ) : null}
      {isUnavailable ? (
        <UnavailableNotice>
          /api/v1/owner/automated-trigger-sources はまだ利用できません。
        </UnavailableNotice>
      ) : null}
      {error ? <ProblemNotice error={error} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Source registration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p>
            MVP では Automated Trigger Source は Admin Owner
            が許可します。cooldown、reply mode、assigned Owner Discord User を
            metadata として扱います。
          </p>
          <Button type="button" disabled={disabled}>
            Automated Trigger Source を追加（skeleton）
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Allowed sources</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <p>読み込み中です。</p> : null}
          {!isLoading && sources.length === 0 ? (
            <EmptyState
              title="Automated Trigger Source はありません"
              description="backend route が未実装、または許可済み source がない状態です。"
            />
          ) : null}
          {sources.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs text-muted">
                  <tr>
                    <th className="py-2 pr-3">source ID</th>
                    <th className="py-2 pr-3">表示名 snapshot</th>
                    <th className="py-2 pr-3">status</th>
                    <th className="py-2 pr-3">reply mode</th>
                    <th className="py-2 pr-3">cooldown</th>
                    <th className="py-2 pr-3">assigned owner</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((source) => (
                    <tr key={source.id} className="border-t border-border">
                      <td className="py-2 pr-3 text-foreground">{source.id}</td>
                      <td className="py-2 pr-3">
                        {source.displayNameSnapshot ?? "未提供"}
                      </td>
                      <td className="py-2 pr-3">
                        <StatusPill>{statusLabel(source.status)}</StatusPill>
                      </td>
                      <td className="py-2 pr-3">
                        {source.replyMode ?? "API 未提供"}
                      </td>
                      <td className="py-2 pr-3">
                        {source.cooldownSeconds === null
                          ? "API 未提供"
                          : `${source.cooldownSeconds}s`}
                      </td>
                      <td className="py-2 pr-3">
                        {source.assignedOwnerDiscordUserId ?? "API 未提供"}
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
