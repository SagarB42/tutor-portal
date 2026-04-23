"use client";

import * as React from "react";
import { Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { discardDraftAction } from "@/lib/actions/emails";
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
      {status === "failed" && (
        <Button size="sm" variant="ghost" disabled>
          <RefreshCw className="mr-1 h-3.5 w-3.5" /> Retry
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              await discardDraftAction(draftId);
              toast.success("Draft discarded");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Failed");
            }
          })
        }
      >
        <Trash2 className="mr-1 h-3.5 w-3.5" /> Discard
      </Button>
    </div>
  );
}
