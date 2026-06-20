import { useEffect, useState } from "react";
import {
  isNotFoundProblem,
  ownerApi,
  type OwnerSettings,
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

export function SettingsRoute() {
  const { canManageOwnerSettings, ownerStatus } = useOwnerLayout();
  const [settings, setSettings] = useState<OwnerSettings | null>(null);
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
      .getSettings({ signal: controller.signal })
      .then((nextSettings) => setSettings(nextSettings))
      .catch((settingsError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        if (isNotFoundProblem(settingsError)) {
          setIsUnavailable(true);
          setSettings(null);
          return;
        }
        setError(asOwnerProblem(settingsError));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  async function saveSettings() {
    setActionMessage(null);
    setError(null);
    try {
      const nextSettings = await ownerApi.updateSettings({
        model: settings?.model ?? null,
        contextMessageLimit: settings?.contextMessageLimit ?? null,
        ownerNotificationsEnabled: settings?.ownerNotificationsEnabled ?? null,
      });
      setSettings(nextSettings);
      setActionMessage("Settings の保存リクエストを送信しました。");
    } catch (saveError) {
      if (isNotFoundProblem(saveError)) {
        setActionMessage(
          "settings 更新 API はまだ利用できません。backend 実装後に有効になります。",
        );
        return;
      }
      setError(asOwnerProblem(saveError));
    }
  }

  const disabled = !canManageOwnerSettings;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="mt-1 text-sm text-muted">
          model settings と prompt settings metadata を管理します。prompt body
          は表示・保持しません。
        </p>
      </div>

      {ownerStatus === "ready" && disabled ? (
        <UnavailableNotice>
          Regular Owner は owner-level settings
          を変更できません。表示のみ、または disabled 状態です。
        </UnavailableNotice>
      ) : null}
      {isUnavailable ? (
        <UnavailableNotice>
          /api/v1/owner/settings はまだ利用できません。
        </UnavailableNotice>
      ) : null}
      {error ? <ProblemNotice error={error} /> : null}
      {actionMessage ? (
        <UnavailableNotice>{actionMessage}</UnavailableNotice>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Model settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? <p>読み込み中です。</p> : null}
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-foreground">既定 model</span>
              <input
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                value={settings?.model ?? ""}
                onChange={(event) =>
                  setSettings((current) => ({
                    model: event.target.value,
                    contextMessageLimit: current?.contextMessageLimit ?? null,
                    ownerNotificationsEnabled:
                      current?.ownerNotificationsEnabled ?? null,
                    promptSettingsUpdatedAt:
                      current?.promptSettingsUpdatedAt ?? null,
                    warnings: current?.warnings ?? [],
                  }))
                }
                disabled={disabled}
                placeholder="API が返す model metadata"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-foreground">
                Conversation Context message limit
              </span>
              <input
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                type="number"
                value={settings?.contextMessageLimit ?? ""}
                onChange={(event) =>
                  setSettings((current) => ({
                    model: current?.model ?? null,
                    contextMessageLimit: event.target.value
                      ? Number(event.target.value)
                      : null,
                    ownerNotificationsEnabled:
                      current?.ownerNotificationsEnabled ?? null,
                    promptSettingsUpdatedAt:
                      current?.promptSettingsUpdatedAt ?? null,
                    warnings: current?.warnings ?? [],
                  }))
                }
                disabled={disabled}
                placeholder="例: 30"
              />
            </label>
            <Button type="button" onClick={saveSettings} disabled={disabled}>
              Settings を保存
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prompt settings metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              prompt body history は frontend state に保持しません。API
              が返す場合も、ここでは更新日時などの metadata のみ扱います。
            </p>
            <p>
              prompt settings updated:{" "}
              {settings?.promptSettingsUpdatedAt ?? "API 未提供"}
            </p>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={settings?.ownerNotificationsEnabled ?? false}
                onChange={(event) =>
                  setSettings((current) => ({
                    model: current?.model ?? null,
                    contextMessageLimit: current?.contextMessageLimit ?? null,
                    ownerNotificationsEnabled: event.target.checked,
                    promptSettingsUpdatedAt:
                      current?.promptSettingsUpdatedAt ?? null,
                    warnings: current?.warnings ?? [],
                  }))
                }
                disabled={disabled}
              />
              Owner notification を有効化
            </label>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Settings warnings</CardTitle>
        </CardHeader>
        <CardContent>
          {settings?.warnings.length ? (
            <ul className="space-y-2">
              {settings.warnings.map((warning) => (
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
              description="API が警告 metadata を返した場合だけ表示します。"
            />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
