import { AlertTriangle, CheckCircle2, Mail } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getOrgEmailConfig } from "@/lib/queries/emails";
import { env } from "@/lib/env";
import { EmailSettingsForm } from "./_components/email-settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const config = await getOrgEmailConfig();
  const sendingConfigured = !!env.RESEND_API_KEY;
  const usingSandbox =
    !sendingConfigured ||
    !config.sender_from_email ||
    config.sender_domain_status !== "verified";

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure how the app sends email on your behalf.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-primary" /> Email sending
          </CardTitle>
          <CardDescription>
            Set the display name parents see in the inbox and where their
            replies should land.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!sendingConfigured && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">
                  Sending isn&apos;t configured yet.
                </p>
                <p className="mt-0.5 leading-relaxed">
                  Add a <code className="font-mono">RESEND_API_KEY</code> to your
                  environment to enable in-app sending. Until then,
                  &ldquo;Open in mail app&rdquo; still works.
                </p>
              </div>
            </div>
          )}

          {sendingConfigured && usingSandbox && (
            <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Sandbox sender in use.</p>
                <p className="mt-0.5 leading-relaxed">
                  Emails are sent from{" "}
                  <code className="font-mono">{env.EMAIL_FROM_FALLBACK}</code>.
                  Resend&apos;s sandbox only delivers to the address your Resend
                  account was created with. To send to anyone, verify a custom
                  domain in Resend and we&apos;ll switch to it automatically.
                </p>
              </div>
            </div>
          )}

          {sendingConfigured && !usingSandbox && (
            <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Custom domain active.</p>
                <p className="mt-0.5 leading-relaxed">
                  Emails go out from{" "}
                  <code className="font-mono">{config.sender_from_email}</code>.
                </p>
              </div>
            </div>
          )}

          <EmailSettingsForm
            initial={{
              businessName: config.business_name ?? "",
              replyToEmail: config.reply_to_email ?? "",
              orgName: config.name,
              senderFromEmail: config.sender_from_email ?? null,
              senderDomainStatus: config.sender_domain_status ?? null,
            }}
            sandboxFrom={env.EMAIL_FROM_FALLBACK}
          />
        </CardContent>
      </Card>
    </div>
  );
}
