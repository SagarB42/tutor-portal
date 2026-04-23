"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComposeDialog } from "./compose-dialog";

export function NewEmailButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" /> New email
      </Button>
      <ComposeDialog open={open} onOpenChange={setOpen} defaultContextType="custom" />
    </>
  );
}
