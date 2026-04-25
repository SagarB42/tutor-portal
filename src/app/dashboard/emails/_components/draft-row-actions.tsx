"use client";

import * as React from "react";
import { Check, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { discardDraftAction, markDraftSentAction } from "@/lib/actions/emails";
import type { EmailDraftContext, EmailDraftStatus } from "@/lib/db-types";
import {
  ComposeDialog,
  type ComposeDialogExistingDraft,
} from "./compose-dialog";

type Props = {
  draft: {
    id: string;
    status: EmailDraftStatus;
    context_type: EmailDraftContext;
    context_id: string | null;
    student_id: string | null;
    to_email: string;
    subject: string;
    body: string;
  };
};

export function DraftRowActions({ draft }: Props) {
  const [pending, start] = React.useTransition();
  const [editing, setEditing] = React.useState(false);

  if (draft.status === "sent") return null;
  if (draft.status === "discarded") return null;

  const existing: ComposeDialogExistingDraft = {
    id: draft.id,
    contextType: draft.context_type,
    contextId: draft.context_id,
    studentId: draft.student_id,
    toEmail: draft.to_email,
    subject: draft.subject,
    body: draft.body,
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => setEditing(true)}
          title="Edit draft"
        >
          <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() =>
            start(async () => {
              try {
                await markDraftSentAction(draft.id);
                toast.success("Marked as sent");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed");
              }
            })
          }
          title="Mark as sent"
        >
          <Check className="mr-1 h-3.5 w-3.5" /> Mark sent
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() =>
            start(async () => {
              try {
                await discardDraftAction(draft.id);
                toast.success("Draft deleted");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed");
              }
            })
          }
          title="Delete draft"
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
        </Button>
      </div>
      {editing && (
        <ComposeDialog
          open={editing}
          onOpenChange={setEditing}
          existingDraft={existing}
          lockContextType
        />
      )}
    </>
  );
}
