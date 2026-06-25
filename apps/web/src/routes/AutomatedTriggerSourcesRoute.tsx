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

type SourceForm = {
  sourceDiscordUserId: string;
  sourceApplicationId: string;
  assignedOwnerDiscordUserId: string;
  status: AutomatedTriggerSource["status"];
  replyMode: AutomatedTriggerSource["replyMode"];
  cooldownSeconds: string;
};

const emptyCreateForm: SourceForm = {
  sourceDiscordUserId: "",
  sourceApplicationId: "",
  assignedOwnerDiscordUserId: "",
  status: "active",
  replyMode: "reply",
  cooldownSeconds: "60",
};

function statusLabel(status: AutomatedTriggerSource["status"]) {
  return status === "active" ? "有効" : "無効";
}

function replyModeLabel(replyMode: AutomatedTriggerSource["replyMode"]) {
  if (replyMode === "channel_message") {
    return "channel message";
  }
  return replyMode;
}

function formFromSource(source: AutomatedTriggerSource): SourceForm {
  return {
    sourceDiscordUserId: source.sourceDiscordUserId ?? "",
    sourceApplicationId: source.sourceApplicationId ?? "",
    assignedOwnerDiscordUserId: source.assignedOwnerDiscordUserId,
    status: source.status,
    replyMode: source.replyMode,
    cooldownSeconds: String(source.cooldownSeconds),
  };
}

function parseCooldown(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }
  return Number(value);
}

export function AutomatedTriggerSourcesRoute() {
  const { canManageOwnerSettings, ownerStatus, owner } = useOwnerLayout();
  const [sources, setSources] = useState<AutomatedTriggerSource[]>([]);
  const [createForm, setCreateForm] = useState<SourceForm>(emptyCreateForm);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<SourceForm>(emptyCreateForm);
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

  useEffect(() => {
    if (!owner) {
      return;
    }
    setCreateForm((current) => ({
      ...current,
      assignedOwnerDiscordUserId:
        current.assignedOwnerDiscordUserId || owner.ownerDiscordUserId,
    }));
  }, [owner]);

  async function createSource() {
    setActionMessage(null);
    setError(null);
    try {
      const source = await ownerApi.createAutomatedTriggerSource({
        ...(createForm.sourceDiscordUserId.trim()
          ? { sourceDiscordUserId: createForm.sourceDiscordUserId.trim() }
          : {}),
        ...(createForm.sourceApplicationId.trim()
          ? { sourceApplicationId: createForm.sourceApplicationId.trim() }
          : {}),
        assignedOwnerDiscordUserId:
          createForm.assignedOwnerDiscordUserId.trim(),
        replyMode: createForm.replyMode,
        cooldownSeconds: parseCooldown(createForm.cooldownSeconds),
      });
      setSources((current) => [source, ...current]);
      setCreateForm({
        ...emptyCreateForm,
        assignedOwnerDiscordUserId: owner?.ownerDiscordUserId ?? "",
      });
      setActionMessage("Automated Trigger Source を追加しました。");
    } catch (createError) {
      setError(asOwnerProblem(createError));
    }
  }

  function startEdit(source: AutomatedTriggerSource) {
    setEditingSourceId(source.automatedTriggerSourceId);
    setEditForm(formFromSource(source));
    setActionMessage(null);
    setError(null);
  }

  async function updateSource() {
    if (!editingSourceId) {
      return;
    }
    setActionMessage(null);
    setError(null);
    try {
      const source = await ownerApi.updateAutomatedTriggerSource(
        editingSourceId,
        {
          assignedOwnerDiscordUserId:
            editForm.assignedOwnerDiscordUserId.trim(),
          status: editForm.status,
          replyMode: editForm.replyMode,
          cooldownSeconds: parseCooldown(editForm.cooldownSeconds),
        },
      );
      setSources((current) =>
        current.map((item) =>
          item.automatedTriggerSourceId === source.automatedTriggerSourceId
            ? source
            : item,
        ),
      );
      setEditingSourceId(null);
      setActionMessage("Automated Trigger Source を更新しました。");
    } catch (updateError) {
      setError(asOwnerProblem(updateError));
    }
  }

  const disabled = !canManageOwnerSettings;
  const canCreate =
    !disabled &&
    Boolean(createForm.assignedOwnerDiscordUserId.trim()) &&
    Boolean(
      createForm.sourceDiscordUserId.trim() ||
      createForm.sourceApplicationId.trim(),
    );

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
          表示のみです。
        </UnavailableNotice>
      ) : null}
      {isUnavailable ? (
        <UnavailableNotice>
          Automated Trigger Source list を取得できませんでした。
        </UnavailableNotice>
      ) : null}
      {error ? <ProblemNotice error={error} /> : null}
      {actionMessage ? (
        <UnavailableNotice>{actionMessage}</UnavailableNotice>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Source registration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Admin Owner が source Discord User ID または application ID
            を登録します。MVP では trigger-only metadata として扱います。
          </p>
          <div className="grid gap-3 lg:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-foreground">
                Source Discord User ID
              </span>
              <input
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                value={createForm.sourceDiscordUserId}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    sourceDiscordUserId: event.target.value,
                  }))
                }
                disabled={disabled}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-foreground">
                Source application ID
              </span>
              <input
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                value={createForm.sourceApplicationId}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    sourceApplicationId: event.target.value,
                  }))
                }
                disabled={disabled}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-foreground">
                Assigned Owner Discord User ID
              </span>
              <input
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                value={createForm.assignedOwnerDiscordUserId}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    assignedOwnerDiscordUserId: event.target.value,
                  }))
                }
                disabled={disabled}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-foreground">Reply mode</span>
              <select
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                value={createForm.replyMode}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    replyMode: event.target
                      .value as AutomatedTriggerSource["replyMode"],
                  }))
                }
                disabled={disabled}
              >
                <option value="reply">reply</option>
                <option value="channel_message">channel message</option>
                <option value="none">none</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-foreground">
                Cooldown seconds
              </span>
              <input
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                type="number"
                min={10}
                max={3600}
                value={createForm.cooldownSeconds}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    cooldownSeconds: event.target.value,
                  }))
                }
                disabled={disabled}
              />
            </label>
          </div>
          <Button type="button" onClick={createSource} disabled={!canCreate}>
            Automated Trigger Source を追加
          </Button>
        </CardContent>
      </Card>

      {editingSourceId ? (
        <Card>
          <CardHeader>
            <CardTitle>Source update</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>source ID: {editingSourceId}</p>
            <div className="grid gap-3 lg:grid-cols-3">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-foreground">
                  Assigned Owner Discord User ID
                </span>
                <input
                  className="w-full rounded-md border border-border bg-white px-3 py-2 text-foreground"
                  value={editForm.assignedOwnerDiscordUserId}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      assignedOwnerDiscordUserId: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-foreground">Status</span>
                <select
                  className="w-full rounded-md border border-border bg-white px-3 py-2 text-foreground"
                  value={editForm.status}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      status: event.target
                        .value as AutomatedTriggerSource["status"],
                    }))
                  }
                >
                  <option value="active">active</option>
                  <option value="disabled">disabled</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-foreground">Reply mode</span>
                <select
                  className="w-full rounded-md border border-border bg-white px-3 py-2 text-foreground"
                  value={editForm.replyMode}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      replyMode: event.target
                        .value as AutomatedTriggerSource["replyMode"],
                    }))
                  }
                >
                  <option value="reply">reply</option>
                  <option value="channel_message">channel message</option>
                  <option value="none">none</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-foreground">
                  Cooldown seconds
                </span>
                <input
                  className="w-full rounded-md border border-border bg-white px-3 py-2 text-foreground"
                  type="number"
                  min={10}
                  max={3600}
                  value={editForm.cooldownSeconds}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      cooldownSeconds: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={updateSource}
                disabled={!editForm.assignedOwnerDiscordUserId.trim()}
              >
                更新
              </Button>
              <Button type="button" onClick={() => setEditingSourceId(null)}>
                キャンセル
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Allowed sources</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <p>読み込み中です。</p> : null}
          {!isLoading && sources.length === 0 ? (
            <EmptyState
              title="Automated Trigger Source はありません"
              description="表示可能な Automated Trigger Source metadata はありません。"
            />
          ) : null}
          {sources.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="text-xs text-muted">
                  <tr>
                    <th className="py-2 pr-3">source ID</th>
                    <th className="py-2 pr-3">source user</th>
                    <th className="py-2 pr-3">application</th>
                    <th className="py-2 pr-3">status</th>
                    <th className="py-2 pr-3">reply mode</th>
                    <th className="py-2 pr-3">cooldown</th>
                    <th className="py-2 pr-3">assigned owner</th>
                    <th className="py-2 pr-3">last triggered</th>
                    <th className="py-2 pr-3">updated</th>
                    <th className="py-2 pr-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((source) => (
                    <tr
                      key={source.automatedTriggerSourceId}
                      className="border-t border-border"
                    >
                      <td className="py-2 pr-3 text-foreground">
                        {source.automatedTriggerSourceId}
                      </td>
                      <td className="py-2 pr-3">
                        {source.sourceDiscordUserId ?? "未提供"}
                      </td>
                      <td className="py-2 pr-3">
                        {source.sourceApplicationId ?? "未提供"}
                      </td>
                      <td className="py-2 pr-3">
                        <StatusPill>{statusLabel(source.status)}</StatusPill>
                      </td>
                      <td className="py-2 pr-3">
                        {replyModeLabel(source.replyMode)}
                      </td>
                      <td className="py-2 pr-3">{source.cooldownSeconds}s</td>
                      <td className="py-2 pr-3">
                        {source.assignedOwnerDiscordUserId}
                      </td>
                      <td className="py-2 pr-3">
                        {source.lastTriggeredAt ?? "未提供"}
                      </td>
                      <td className="py-2 pr-3">
                        {source.updatedAt || "未提供"}
                      </td>
                      <td className="py-2 pr-3">
                        <Button
                          type="button"
                          className="px-3 py-1"
                          onClick={() => startEdit(source)}
                          disabled={disabled}
                        >
                          編集
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
