import { useEffect, useState } from "react";
import {
  isNotFoundProblem,
  ownerApi,
  type CandidateDiscordUser,
} from "../api/ownerApi";
import { Button } from "../components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card";
import { useOwnerLayout } from "./OwnerLayout";
import {
  asOwnerProblem,
  EmptyState,
  ProblemNotice,
  UnavailableNotice,
} from "./routeState";

export function CandidatesRoute() {
  const { owner } = useOwnerLayout();
  const [candidates, setCandidates] = useState<CandidateDiscordUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [error, setError] = useState<ReturnType<typeof asOwnerProblem>>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setIsUnavailable(false);
    setError(null);

    ownerApi
      .listCandidates({ signal: controller.signal })
      .then((nextCandidates) => setCandidates(nextCandidates))
      .catch((listError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        if (isNotFoundProblem(listError)) {
          setIsUnavailable(true);
          setCandidates([]);
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

  async function promoteCandidate(candidate: CandidateDiscordUser) {
    setActionMessage(null);
    setError(null);
    try {
      await ownerApi.promoteCandidate({
        candidateDiscordUserId: candidate.candidateDiscordUserId,
        ...(owner?.role === "regular_owner"
          ? { assignedOwnerDiscordUserId: owner.ownerDiscordUserId }
          : {}),
      });
      setActionMessage(
        `${candidate.candidateDiscordUserId} の promote リクエストを送信しました。`,
      );
    } catch (promoteError) {
      if (isNotFoundProblem(promoteError)) {
        setActionMessage(
          "Promote 対象の Candidate Discord User が見つかりませんでした。",
        );
        return;
      }
      setError(asOwnerProblem(promoteError));
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Candidate Discord Users
        </h2>
        <p className="mt-1 text-sm text-muted">
          non-allowed Discord User の観測 metadata だけを表示し、必要に応じて
          Registered Member へ promote します。
        </p>
      </div>

      {isUnavailable ? (
        <UnavailableNotice>
          Candidate Discord User list を取得できませんでした。
        </UnavailableNotice>
      ) : null}
      {error ? <ProblemNotice error={error} /> : null}
      {actionMessage ? (
        <UnavailableNotice>{actionMessage}</UnavailableNotice>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Candidate list</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <p>読み込み中です。</p> : null}
          {!isLoading && candidates.length === 0 ? (
            <EmptyState
              title="Candidate Discord User はありません"
              description="最近観測された non-allowed user metadata はありません。"
            />
          ) : null}
          {candidates.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="text-xs text-muted">
                  <tr>
                    <th className="py-2 pr-3">Candidate Discord User ID</th>
                    <th className="py-2 pr-3">表示名 snapshot</th>
                    <th className="py-2 pr-3">first observed</th>
                    <th className="py-2 pr-3">last observed</th>
                    <th className="py-2 pr-3">expires</th>
                    <th className="py-2 pr-3">guild</th>
                    <th className="py-2 pr-3">channel</th>
                    <th className="py-2 pr-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((candidate) => (
                    <tr
                      key={candidate.candidateDiscordUserId}
                      className="border-t border-border"
                    >
                      <td className="py-2 pr-3 text-foreground">
                        {candidate.candidateDiscordUserId}
                      </td>
                      <td className="py-2 pr-3">
                        {candidate.displayNameSnapshot ?? "未提供"}
                      </td>
                      <td className="py-2 pr-3">
                        {candidate.firstObservedAt || "未提供"}
                      </td>
                      <td className="py-2 pr-3">
                        {candidate.lastObservedAt || "未提供"}
                      </td>
                      <td className="py-2 pr-3">
                        {candidate.expiresAt || "未提供"}
                      </td>
                      <td className="py-2 pr-3">
                        {candidate.observedInGuildId ?? "DM / 未提供"}
                      </td>
                      <td className="py-2 pr-3">
                        {candidate.observedInChannelId ?? "未提供"}
                      </td>
                      <td className="py-2 pr-3">
                        <Button
                          type="button"
                          className="px-3 py-1"
                          onClick={() => void promoteCandidate(candidate)}
                        >
                          Promote
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
