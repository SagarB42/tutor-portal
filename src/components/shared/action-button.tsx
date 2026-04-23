"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/actions/result";

type ConfirmConfig = {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type Props = Omit<ButtonProps, "onClick"> & {
  action: () => Promise<ActionResult<unknown>>;
  /**
   * If provided, show a shadcn AlertDialog before firing the action.
   * - string → used as the description.
   * - object → fine-grained control over title/description/labels.
   */
  confirm?: string | ConfirmConfig;
  successMessage?: string;
  onSuccess?: () => void;
};

/**
 * Button that invokes a server action on click.
 *
 * - Wraps the call in a transition and shows a loading spinner.
 * - Surfaces `{ ok: false, error }` as a toast.
 * - If `confirm` is set, opens a shadcn AlertDialog for confirmation.
 */
export function ActionButton({
  action,
  confirm,
  successMessage,
  onSuccess,
  children,
  className,
  disabled,
  variant,
  ...rest
}: Props) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const fire = () => {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (successMessage) toast.success(successMessage);
      onSuccess?.();
    });
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm) {
      setOpen(true);
      return;
    }
    fire();
  };

  const button = (
    <Button
      {...rest}
      variant={variant}
      className={cn(className)}
      disabled={disabled || pending}
      onClick={handleClick}
    >
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );

  if (!confirm) return button;

  const cfg: ConfirmConfig =
    typeof confirm === "string" ? { description: confirm } : confirm;

  const isDestructive = variant === "destructive";

  return (
    <>
      {button}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {cfg.title ?? (isDestructive ? "Are you sure?" : "Confirm")}
            </AlertDialogTitle>
            {cfg.description && (
              <AlertDialogDescription>
                {cfg.description}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{cfg.cancelLabel ?? "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              className={
                isDestructive
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined
              }
              onClick={(e) => {
                e.preventDefault();
                setOpen(false);
                fire();
              }}
            >
              {cfg.confirmLabel ?? (isDestructive ? "Delete" : "Confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
