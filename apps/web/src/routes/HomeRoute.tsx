import { ownerRoleLabelJa } from "@dc-chatbot/domain";
import { Button } from "../components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card";

const ownerRole = "admin_owner" as const;

export function HomeRoute() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">
            Private Bot management
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            dc-chatbot Owner UI
          </h1>
          <p className="max-w-2xl text-muted">
            Owner Discord User が ChatGPT Subscription Connection、Registered
            Member、Candidate Discord User、audit metadata を管理するための
            skeleton です。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Owner scope</CardTitle>
            </CardHeader>
            <CardContent>{ownerRoleLabelJa(ownerRole)}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Connection</CardTitle>
            </CardHeader>
            <CardContent>
              ChatGPT Subscription Connection status placeholder
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Audit</CardTitle>
            </CardHeader>
            <CardContent>
              Metadata-only request/provider audit placeholder
            </CardContent>
          </Card>
        </div>

        <div>
          <Button type="button">Open member management</Button>
        </div>
      </section>
    </main>
  );
}
