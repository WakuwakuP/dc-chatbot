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

function formatPeriod(start: string, end: string): string {
  if (!start || !end) {
    return "";
  }
  return `${start.slice(0, 10)} - ${end.slice(0, 10)}`;
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
          Dashboard summary を取得できないため、/owner/me
          から取得できる Owner scope だけ表示しています。
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
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Registered Members</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>active: {summary.registeredMemberCounts.active}</p>
                <p>disabled: {summary.registeredMemberCounts.disabled}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Candidate Discord Users</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>visible records: {summary.candidateDiscordUserCount}</p>
                <p>
                  pending owner notifications:{" "}
                  {summary.pendingOwnerNotificationCount}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Automated Trigger Sources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>active: {summary.automatedTriggerSourceCounts.active}</p>
                <p>disabled: {summary.automatedTriggerSourceCounts.disabled}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Usage metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill>{summary.usage.periodLabel}</StatusPill>
                <span>{formatPeriod(summary.usage.periodStart, summary.usage.periodEnd)}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase text-muted">requests</p>
                  <p className="text-xl font-semibold text-foreground">
                    {summary.usage.requestCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted">provider calls</p>
                  <p className="text-xl font-semibold text-foreground">
                    {summary.usage.providerCallCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted">errors</p>
                  <p className="text-xl font-semibold text-foreground">
                    {summary.usage.errorCount}
                  </p>
                </div>
              </div>
              {summary.usage.buckets.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-xs uppercase text-muted">
                      <tr>
                        <th className="py-2 pr-4 font-medium">bucket</th>
                        <th className="py-2 pr-4 font-medium">requests</th>
                        <th className="py-2 pr-4 font-medium">provider</th>
                        <th className="py-2 pr-4 font-medium">errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.usage.buckets.map((bucket) => (
                        <tr
                          className="border-t border-border"
                          key={bucket.label}
                        >
                          <td className="py-2 pr-4 text-foreground">
                            {bucket.label}
                          </td>
                          <td className="py-2 pr-4">{bucket.requestCount}</td>
                          <td className="py-2 pr-4">
                            {bucket.providerCallCount}
                          </td>
                          <td className="py-2 pr-4">{bucket.errorCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="usage metadata はまだありません"
                  description="表示できる usage bucket metadata がありません。"
                />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent errors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary.recentErrors.length > 0 ? (
                  summary.recentErrors.map((error) => (
                    <div
                      className="rounded-md border border-border px-3 py-2"
                      key={`${error.surface}-${error.id}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill>{error.surface}</StatusPill>
                        <span className="font-medium text-foreground">
                          {error.category}
                        </span>
                      </div>
                      <p className="mt-1 text-xs">
                        {error.occurredAt} / request ID:{" "}
                        {error.requestId ?? "none"}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="recent error metadata はありません"
                    description="対象期間に表示できる safe error category はありません。"
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Settings warnings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary.settingsWarnings.length > 0 ? (
                  summary.settingsWarnings.map((warning) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                      key={warning.code}
                    >
                      <span className="text-foreground">{warning.title}</span>
                      <StatusPill>{warning.severity}</StatusPill>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="settings warning はありません"
                    description="Dashboard に表示する設定 warning metadata はありません。"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </section>
  );
}
