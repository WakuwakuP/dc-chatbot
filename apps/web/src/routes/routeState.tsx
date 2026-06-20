import type { ReactNode } from "react";
import {
  isOwnerApiProblemError,
  type OwnerApiProblemError,
} from "../api/ownerApi";
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card";

export type ResourceState<T> = {
  data: T | null;
  isLoading: boolean;
  isUnavailable: boolean;
  error: OwnerApiProblemError | null;
};

export function LoadingCard({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>読み込み中です。</CardContent>
    </Card>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-md border border-dashed border-border bg-background px-4 py-6 text-sm text-muted">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1">{description}</p>
    </div>
  );
}

export function ProblemNotice({ error }: { error: OwnerApiProblemError }) {
  return (
    <div className="rounded-md border border-border bg-background px-4 py-3 text-sm">
      <p className="font-medium text-foreground">Owner API エラー</p>
      <p className="mt-1 text-muted">
        {error.problem.title}（{error.problem.status} / {error.problem.code}）
      </p>
      {error.problem.requestId ? (
        <p className="mt-1 text-xs text-muted">
          request ID: {error.problem.requestId}
        </p>
      ) : null}
    </div>
  );
}

export function UnavailableNotice({ children }: { children?: ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-background px-4 py-3 text-sm text-muted">
      {children ??
        "この Owner API route はまだ利用できません。利用可能になるまで空の状態として表示します。"}
    </div>
  );
}

export function asOwnerProblem(error: unknown): OwnerApiProblemError | null {
  return isOwnerApiProblemError(error) ? error : null;
}

export function StatusPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted">
      {children}
    </span>
  );
}
