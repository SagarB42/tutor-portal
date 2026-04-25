"use client";

import * as React from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateOrgEmailConfigAction } from "@/lib/actions/emails";

export type EmailSettingsInitial = {
  businessName: string;
  replyToEmail: string;
  orgName: string;
  senderFromEmail: string | null;
  senderDomainStatus: "pending" | "verified" | "failed" | null;
};

export function EmailSettingsForm({
  initial,
  sandboxFrom,
}: {
  initial: EmailSettingsInitial;
  sandboxFrom: string;
}) {
  const [businessName, setBusinessName] = React.useState(initial.businessName);
  const [replyToEmail, setReplyToEmail] = React.useState(initial.replyToEmail);
  const [pending, start] = React.useTransition();

  const previewName =
    businessName.trim() || initial.orgName || "Tutor Portal";
  const previewFrom =
    initial.senderDomainStatus === "verified" && initial.senderFromEmail
      ? initial.senderFromEmail
      : sandboxFrom;

  const onSave = () => {
    start(async () => {
      try {
        await updateOrgEmailConfigAction({
          businessName: businessName.trim() || null,
          replyToEmail: replyToEmail.trim() || null,
        });
        toast.success("Email settings saved");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="business-name">Display name</Label>
          <Input
            id="business-name"
            placeholder={initial.orgName}
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            disabled={pending}
            maxLength={120}
          />
          <p className="text-xs text-muted-foreground">
            Shown in the &ldquo;From&rdquo; field of every email. Defaults to your
            organization name.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reply-to">Reply-to email</Label>
          <Input
            id="reply-to"
            type="email"
            placeholder="you@yourdomain.com"
            value={replyToEmail}
            onChange={(e) => setReplyToEmail(e.target.value)}
            disabled={pending}
          />
          <p className="text-xs text-muted-foreground">
            Where parents&apos; replies land. Leave blank to use your login email.
          </p>
        </div>
      </div>

      <div className="rounded-md border bg-muted/30 p-3 text-xs">
        <p className="font-medium text-muted-foreground">Preview</p>
        <p className="mt-1 font-mono text-foreground">
          {previewName} &lt;{previewFrom}&gt;
        </p>
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={onSave} disabled={pending}>
          {pending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save changes
        </Button>
      </div>
    </div>
  );
}
