"use client";

import * as React from "react";
import { Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { discardDraftAction, markDraftSentAction } from "@/lib/actions/emails";
import type { EmailDraftStatus } from "@/lib/db-types";

type Props = {
  draftId: string;
  status: EmailDraftStatus;
};

export function DraftRowActions({ draftId, status }: Props) {
  const [pending, start] = React.useTransition();

  if (status === "sent") return null;
  if (status === "discarded") return null;

  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              await markDraftSentAction(draftId);
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
              await discardDraftAction(draftId);
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
  );
}
