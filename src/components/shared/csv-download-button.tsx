"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { CsvFile } from "@/lib/actions/exports";
import type { ActionResult } from "@/lib/actions/result";

type Props = {
  action: () => Promise<ActionResult<CsvFile>>;
  label: string;
};

export function CsvDownloadButton({ action, label }: Props) {
  const [pending, setPending] = useState(false);
  async function handle() {
    setPending(true);
    const res = await action();
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    const { filename, content } = res.data;
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  }
  return (
    <Button
      type="button"
      variant="outline"
      onClick={handle}
      disabled={pending}
    >
      {pending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      {label}
    </Button>
  );
}
