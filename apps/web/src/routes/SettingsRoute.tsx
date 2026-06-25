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
  UnavailableNotice,
} from "./routeState";

type BotSettingsForm = {
  notificationOwnerDiscordUserId: string;
  automatedTriggerDefaultCooldownSeconds: string;
};

type ModelSettingsForm = {
  contextSelectionModel: string;
  responseDecisionModel: string;
  responseGenerationModel: string;
};

type PromptMetadataForm = {
  promptKey: string;
  promptBodySha256: string;
  promptBodyLength: string;
  label: string;
};

const emptyBotForm: BotSettingsForm = {
  notificationOwnerDiscordUserId: "",
  automatedTriggerDefaultCooldownSeconds: "60",
};

const emptyModelForm: ModelSettingsForm = {
  contextSelectionModel: "",
  responseDecisionModel: "",
  responseGenerationModel: "",
};

const emptyPromptForm: PromptMetadataForm = {
  promptKey: "",
  promptBodySha256: "",
  promptBodyLength: "",
  label: "",
};

function botFormFromSettings(settings: OwnerSettings): BotSettingsForm {
  return {
    notificationOwnerDiscordUserId:
      settings.botSettings.notificationOwnerDiscordUserId ?? "",
    automatedTriggerDefaultCooldownSeconds: String(
      settings.botSettings.automatedTriggerDefaultCooldownSeconds,
    ),
  };
}

function modelFormFromSettings(settings: OwnerSettings): ModelSettingsForm {
  return {
    contextSelectionModel: settings.modelSettings.contextSelectionModel,
    responseDecisionModel: settings.modelSettings.responseDecisionModel,
    responseGenerationModel: settings.modelSettings.responseGenerationModel,
  };
}

function parseOptionalNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }
  return Number(value);
}

export function SettingsRoute() {
  const { canManageOwnerSettings, ownerStatus } = useOwnerLayout();
  const [settings, setSettings] = useState<OwnerSettings | null>(null);
  const [botForm, setBotForm] = useState<BotSettingsForm>(emptyBotForm);
  const [modelForm, setModelForm] = useState<ModelSettingsForm>(emptyModelForm);
  const [promptForm, setPromptForm] =
    useState<PromptMetadataForm>(emptyPromptForm);
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
      .then((nextSettings) => {
        setSettings(nextSettings);
        setBotForm(botFormFromSettings(nextSettings));
        setModelForm(modelFormFromSettings(nextSettings));
      })
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

  async function saveBotSettings() {
    setActionMessage(null);
    setError(null);
    try {
      const nextSettings = await ownerApi.updateBotSettings({
        notificationOwnerDiscordUserId:
          botForm.notificationOwnerDiscordUserId.trim() || null,
        automatedTriggerDefaultCooldownSeconds: parseOptionalNumber(
          botForm.automatedTriggerDefaultCooldownSeconds,
        ),
      });
      setSettings(nextSettings);
      setBotForm(botFormFromSettings(nextSettings));
      setActionMessage("Bot settings metadata を保存しました。");
    } catch (saveError) {
      setError(asOwnerProblem(saveError));
    }
  }

  async function saveModelSettings() {
    setActionMessage(null);
    setError(null);
    try {
      const nextSettings = await ownerApi.updateModelSettings({
        contextSelectionModel: modelForm.contextSelectionModel.trim(),
        responseDecisionModel: modelForm.responseDecisionModel.trim(),
        responseGenerationModel: modelForm.responseGenerationModel.trim(),
      });
      setSettings(nextSettings);
      setModelForm(modelFormFromSettings(nextSettings));
      setActionMessage("Model settings metadata を保存しました。");
    } catch (saveError) {
      setError(asOwnerProblem(saveError));
    }
  }

  async function savePromptMetadata() {
    setActionMessage(null);
    setError(null);
    try {
      const nextSettings = await ownerApi.updatePromptSettingsMetadata({
        promptKey: promptForm.promptKey.trim(),
        promptBodySha256: promptForm.promptBodySha256.trim(),
        promptBodyLength: Number(promptForm.promptBodyLength),
        ...(promptForm.label.trim() ? { label: promptForm.label.trim() } : {}),
      });
      setSettings(nextSettings);
      setPromptForm(emptyPromptForm);
      setActionMessage("Prompt settings metadata を保存しました。");
    } catch (saveError) {
      setError(asOwnerProblem(saveError));
    }
  }

  const disabled = !canManageOwnerSettings;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="mt-1 text-sm text-muted">
          bot settings、model settings、prompt settings metadata を管理します。
          prompt body は表示・保持しません。
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
          Settings metadata を取得できませんでした。
        </UnavailableNotice>
      ) : null}
      {error ? <ProblemNotice error={error} /> : null}
      {actionMessage ? (
        <UnavailableNotice>{actionMessage}</UnavailableNotice>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bot settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? <p>読み込み中です。</p> : null}
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-foreground">
                Notification Owner Discord User ID
              </span>
              <input
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                value={botForm.notificationOwnerDiscordUserId}
                onChange={(event) =>
                  setBotForm((current) => ({
                    ...current,
                    notificationOwnerDiscordUserId: event.target.value,
                  }))
                }
                disabled={disabled}
                placeholder="未設定なら空欄"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-foreground">
                Automated Trigger default cooldown seconds
              </span>
              <input
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                type="number"
                min={10}
                max={3600}
                value={botForm.automatedTriggerDefaultCooldownSeconds}
                onChange={(event) =>
                  setBotForm((current) => ({
                    ...current,
                    automatedTriggerDefaultCooldownSeconds: event.target.value,
                  }))
                }
                disabled={disabled}
              />
            </label>
            <p>updated: {settings?.botSettings.updatedAt || "未提供"}</p>
            <Button type="button" onClick={saveBotSettings} disabled={disabled}>
              Bot settings を保存
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Model settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-foreground">
                Context Selection model
              </span>
              <input
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                value={modelForm.contextSelectionModel}
                onChange={(event) =>
                  setModelForm((current) => ({
                    ...current,
                    contextSelectionModel: event.target.value,
                  }))
                }
                disabled={disabled}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-foreground">
                Response Decision model
              </span>
              <input
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                value={modelForm.responseDecisionModel}
                onChange={(event) =>
                  setModelForm((current) => ({
                    ...current,
                    responseDecisionModel: event.target.value,
                  }))
                }
                disabled={disabled}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-foreground">
                Response Generation model
              </span>
              <input
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                value={modelForm.responseGenerationModel}
                onChange={(event) =>
                  setModelForm((current) => ({
                    ...current,
                    responseGenerationModel: event.target.value,
                  }))
                }
                disabled={disabled}
              />
            </label>
            <Button
              type="button"
              onClick={saveModelSettings}
              disabled={
                disabled ||
                !modelForm.contextSelectionModel ||
                !modelForm.responseDecisionModel ||
                !modelForm.responseGenerationModel
              }
            >
              Model settings を保存
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prompt settings metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            prompt body は frontend state に保持しません。sha256、body length、
            version ID などの metadata のみ扱います。
          </p>
          <div className="grid gap-3 lg:grid-cols-4">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-foreground">Prompt key</span>
              <input
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                value={promptForm.promptKey}
                onChange={(event) =>
                  setPromptForm((current) => ({
                    ...current,
                    promptKey: event.target.value,
                  }))
                }
                disabled={disabled}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-foreground">
                Prompt body sha256
              </span>
              <input
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                value={promptForm.promptBodySha256}
                onChange={(event) =>
                  setPromptForm((current) => ({
                    ...current,
                    promptBodySha256: event.target.value,
                  }))
                }
                disabled={disabled}
                placeholder="64 hex chars"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-foreground">
                Prompt body length
              </span>
              <input
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                type="number"
                min={0}
                value={promptForm.promptBodyLength}
                onChange={(event) =>
                  setPromptForm((current) => ({
                    ...current,
                    promptBodyLength: event.target.value,
                  }))
                }
                disabled={disabled}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-foreground">Label</span>
              <input
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                value={promptForm.label}
                onChange={(event) =>
                  setPromptForm((current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
                disabled={disabled}
              />
            </label>
          </div>
          <Button
            type="button"
            onClick={savePromptMetadata}
            disabled={
              disabled ||
              !promptForm.promptKey ||
              !promptForm.promptBodySha256 ||
              !promptForm.promptBodyLength
            }
          >
            Prompt metadata を保存
          </Button>

          {settings?.promptSettings.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs text-muted">
                  <tr>
                    <th className="py-2 pr-3">prompt key</th>
                    <th className="py-2 pr-3">active version</th>
                    <th className="py-2 pr-3">sha256</th>
                    <th className="py-2 pr-3">length</th>
                    <th className="py-2 pr-3">updated</th>
                  </tr>
                </thead>
                <tbody>
                  {settings.promptSettings.map((promptSetting) => (
                    <tr
                      key={promptSetting.promptSettingId}
                      className="border-t border-border"
                    >
                      <td className="py-2 pr-3 text-foreground">
                        {promptSetting.promptKey}
                      </td>
                      <td className="py-2 pr-3">
                        {promptSetting.activeVersionId ?? "未提供"}
                      </td>
                      <td className="py-2 pr-3">
                        {promptSetting.activePromptBodySha256 ?? "未提供"}
                      </td>
                      <td className="py-2 pr-3">
                        {promptSetting.activePromptBodyLength ?? "未提供"}
                      </td>
                      <td className="py-2 pr-3">
                        {promptSetting.updatedAt || "未提供"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Prompt settings metadata はありません"
              description="登録済み prompt metadata がない状態です。"
            />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
