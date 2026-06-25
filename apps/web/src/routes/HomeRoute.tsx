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
            <CardContent>
              <EmptyState
                title="usage metadata はまだありません"
                description="Dashboard では現在の API が返す件数 metadata だけを表示します。"
              />
            </CardContent>
          </Card>
        </>
      ) : null}
    </section>
  );
}
