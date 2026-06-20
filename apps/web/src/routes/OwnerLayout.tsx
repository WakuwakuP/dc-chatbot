import { canManageOwnerSettings, ownerRoleLabelJa } from "@dc-chatbot/domain";
import type { OwnerMeResponse } from "@dc-chatbot/shared";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useOutletContext } from "react-router-dom";
import { ownerApi } from "../api/ownerApi";
import { asOwnerProblem, ProblemNotice, StatusPill } from "./routeState";

type OwnerStatus = "loading" | "ready" | "error";

type OwnerLayoutContext = {
  owner: OwnerMeResponse | null;
  ownerStatus: OwnerStatus;
  canManageOwnerSettings: boolean;
};

const navigation = [
  { to: "/", label: "ダッシュボード", adminOnly: false },
  { to: "/members", label: "Registered Members", adminOnly: false },
  { to: "/candidates", label: "Candidate Discord Users", adminOnly: false },
  { to: "/connection", label: "Connection", adminOnly: false },
  { to: "/settings", label: "Settings", adminOnly: true },
  {
    to: "/automated-trigger-sources",
    label: "Automated Trigger Sources",
    adminOnly: true,
  },
] as const;

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-primary text-primary-foreground"
      : "text-muted hover:bg-background hover:text-foreground"
  }`;
}

export function useOwnerLayout() {
  return useOutletContext<OwnerLayoutContext>();
}

export function OwnerLayout() {
  const [owner, setOwner] = useState<OwnerMeResponse | null>(null);
  const [ownerStatus, setOwnerStatus] = useState<OwnerStatus>("loading");
  const [ownerError, setOwnerError] =
    useState<ReturnType<typeof asOwnerProblem>>(null);

  useEffect(() => {
    const controller = new AbortController();
    setOwnerStatus("loading");
    ownerApi
      .getMe({ signal: controller.signal })
      .then((nextOwner) => {
        setOwner(nextOwner);
        setOwnerError(null);
        setOwnerStatus("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setOwner(null);
        setOwnerError(asOwnerProblem(error));
        setOwnerStatus("error");
      });

    return () => controller.abort();
  }, []);

  const ownerScope = owner
    ? {
        ownerDiscordUserId: owner.ownerDiscordUserId,
        role: owner.role,
      }
    : null;
  const canManageSettings = ownerScope
    ? canManageOwnerSettings(ownerScope)
    : false;
  const roleLabel = owner ? ownerRoleLabelJa(owner.role) : "権限確認中";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        <header className="rounded-lg border border-border bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-primary">
                Private Bot management
              </p>
              <h1 className="text-3xl font-bold tracking-tight">
                dc-chatbot Owner UI
              </h1>
              <p className="max-w-3xl text-sm text-muted">
                Owner Discord User が ChatGPT Subscription
                Connection、Registered Member、Candidate Discord
                User、metadata-only audit を管理します。 本 UI は credential
                material、Discord message content、prompt body、response
                text、attachment data、provider raw body を保持しません。
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 text-sm md:items-end">
              <StatusPill>{roleLabel}</StatusPill>
              {owner ? (
                <span className="text-muted">
                  Owner Discord User ID: {owner.ownerDiscordUserId}
                </span>
              ) : (
                <span className="text-muted">/owner/me を確認中</span>
              )}
            </div>
          </div>
          <nav
            className="mt-4 flex flex-wrap gap-2"
            aria-label="Owner management navigation"
          >
            {navigation.map((item) => {
              const disabledForRegular =
                item.adminOnly && owner?.role === "regular_owner";
              if (disabledForRegular) {
                return (
                  <span
                    key={item.to}
                    className="cursor-not-allowed rounded-md border border-border px-3 py-2 text-sm font-medium text-muted opacity-60"
                    aria-disabled="true"
                    title="Regular Owner は owner-level settings を変更できません"
                  >
                    {item.label}
                  </span>
                );
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={navLinkClass}
                  end={item.to === "/"}
                >
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </header>

        {ownerError ? <ProblemNotice error={ownerError} /> : null}

        <Outlet
          context={{
            owner,
            ownerStatus,
            canManageOwnerSettings: canManageSettings,
          }}
        />
      </div>
    </main>
  );
}
