"use client";

import * as React from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComposeDialog } from "@/app/dashboard/emails/_components/compose-dialog";
import type { EmailDraftContext } from "@/lib/db-types";

type Props = {
  contextType: EmailDraftContext;
  contextId?: string | null;
  studentId?: string | null;
  toEmail?: string | null;
  subject?: string;
  body?: string;
  instructions?: string;
  label?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?:
    | "default"
    | "outline"
    | "ghost"
    | "secondary"
    | "destructive"
    | "link";
};

export function DraftEmailButton({
  contextType,
  contextId,
  studentId,
  toEmail,
  subject,
  body,
  instructions,
  label = "Draft email",
  size = "sm",
  variant = "outline",
}: Props) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        onClick={() => setOpen(true)}
      >
        <Mail className="mr-2 h-4 w-4" /> {label}
      </Button>
      <ComposeDialog
        open={open}
        onOpenChange={setOpen}
        defaultContextType={contextType}
        contextId={contextId}
        studentId={studentId}
        prefillToEmail={toEmail ?? undefined}
        prefillSubject={subject}
        prefillBody={body}
        prefillInstructions={instructions}
        lockContextType
      />
    </>
  );
}
