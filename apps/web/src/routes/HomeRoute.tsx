import { ownerRoleLabelJa } from "@dc-chatbot/domain";
import { useEffect, useState } from "react";
import {
  dashboardFromOwnerMe,
  isNotFoundProblem,
  ownerApi,
  type DashboardSummary,
} from "../api/ownerApi";
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card";
import { useOwnerLayout } from "./OwnerLayout";
import {
  asOwnerProblem,
  EmptyState,
  LoadingCard,
  ProblemNotice,
  StatusPill,
  UnavailableNotice,
} from "./routeState";

function maxBucketValue(summary: DashboardSummary) {
  return Math.max(
    1,
    ...summary.usage.buckets.map((bucket) => bucket.requestCount),
  );
}

export function HomeRoute() {
  const { owner } = useOwnerLayout();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [error, setError] = useState<ReturnType<typeof asOwnerProblem>>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setIsUnavailable(false);
    setError(null);

    ownerApi
      .getDashboardSummary({ signal: controller.signal })
      .then((nextSummary) => {
        setSummary(nextSummary);
      })
      .catch(async (dashboardError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        if (isNotFoundProblem(dashboardError)) {
          setIsUnavailable(true);
          try {
            const fallbackOwner =
              owner ?? (await ownerApi.getMe({ signal: controller.signal }));
            setSummary(dashboardFromOwnerMe(fallbackOwner));
          } catch (fallbackError) {
            if (!controller.signal.aborted) {
              setError(asOwnerProblem(fallbackError));
            }
          }
          return;
        }

        setError(asOwnerProblem(dashboardError));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [owner]);

  if (isLoading && !summary) {
    return <LoadingCard title="Owner dashboard" />;
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Owner dashboard
        </h2>
        <p className="mt-1 text-sm text-muted">
          Owner scope、usage metadata、recent errors、settings warnings
          の概要です。
        </p>
      </div>

      {isUnavailable ? (
        <UnavailableNotice>
          /api/v1/owner/dashboard が未実装のため、/owner/me
          から取得できる範囲だけ表示しています。
        </UnavailableNotice>
      ) : null}
      {error ? <ProblemNotice error={error} /> : null}

      {summary ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Owner scope</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-foreground">
                  {ownerRoleLabelJa(summary.owner.role)}
                </p>
                <p>Owner Discord User ID: {summary.owner.ownerDiscordUserId}</p>
                <p>
                  管理対象 members:{" "}
                  {summary.owner.managedMemberCount ?? "API 未提供"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Usage metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>{summary.usage.periodLabel}</p>
                <p>requests: {summary.usage.requestCount}</p>
                <p>provider calls: {summary.usage.providerCallCount}</p>
                <p>errors: {summary.usage.errorCount}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Usage graph placeholder</CardTitle>
              </CardHeader>
              <CardContent>
                {summary.usage.buckets.length > 0 ? (
                  <div className="space-y-3">
                    {summary.usage.buckets.map((bucket) => (
                      <div key={bucket.label} className="space-y-1">
                        <div className="flex justify-between text-xs text-muted">
                          <span>{bucket.label}</span>
                          <span>
                            {bucket.requestCount} requests / {bucket.errorCount}{" "}
                            errors
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-background">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{
                              width: `${Math.max(4, (bucket.requestCount / maxBucketValue(summary)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="usage metadata はまだありません"
                    description="API が期間別 metadata を返すまで、グラフ領域だけを表示します。"
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent errors</CardTitle>
              </CardHeader>
              <CardContent>
                {summary.recentErrors.length > 0 ? (
                  <ul className="space-y-3">
                    {summary.recentErrors.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-md border border-border p-3"
                      >
                        <p className="font-medium text-foreground">
                          {item.category}
                        </p>
                        <p>surface: {item.surface}</p>
                        <p>occurred: {item.occurredAt || "API 未提供"}</p>
                        <p>request ID: {item.requestId ?? "API 未提供"}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    title="recent errors はありません"
                    description="metadata-only の error category と request ID だけを表示します。"
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Settings warnings</CardTitle>
            </CardHeader>
            <CardContent>
              {summary.settingsWarnings.length > 0 ? (
                <ul className="space-y-2">
                  {summary.settingsWarnings.map((warning) => (
                    <li
                      key={warning.code}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <StatusPill>{warning.severity}</StatusPill>
                      <span className="text-foreground">{warning.title}</span>
                      <span className="text-muted">({warning.code})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title="settings warnings はありません"
                  description="API が返す警告 metadata がある場合だけ表示します。"
                />
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </section>
  );
}
