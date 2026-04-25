"use client";

import * as React from "react";
import { Check, Mail, Plus, X } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type EmailSuggestion = {
  email: string;
  label: string;
};

type Props = {
  value: string[];
  onValueChange: (emails: string[]) => void;
  suggestions: EmailSuggestion[];
  disabled?: boolean;
  placeholder?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Tag-style input for one or many email recipients.
 *
 * Behaviour:
 *   - Selected addresses appear as removable chips.
 *   - Clicking the input opens a dropdown listing every suggestion (parent
 *     + student emails for the picked context). Already-selected entries are
 *     shown with a check; clicking toggles them. The list stays open after a
 *     pick so the user can add more in one go.
 *   - Free-form addresses can be typed and committed with Enter, comma, or
 *     blur — the field validates basic email shape before adding.
 */
export function EmailMultiPicker({
  value,
  onValueChange,
  suggestions,
  disabled,
  placeholder = "Add recipients…",
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const wrapRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click.
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const add = (email: string) => {
    const trimmed = email.trim().replace(/,$/, "");
    if (!trimmed) return;
    if (!EMAIL_RE.test(trimmed)) return;
    if (value.includes(trimmed)) return;
    onValueChange([...value, trimmed]);
    setDraft("");
  };

  const toggleSuggestion = (email: string) => {
    if (value.includes(email)) {
      onValueChange(value.filter((e) => e !== email));
    } else {
      onValueChange([...value, email]);
    }
  };

  const remove = (email: string) => {
    onValueChange(value.filter((e) => e !== email));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      if (draft.trim()) {
        e.preventDefault();
        add(draft);
      }
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      e.preventDefault();
      remove(value[value.length - 1]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 text-left text-sm shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring hover:bg-accent/30 disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        {value.map((email) => (
          <span
            key={email}
            className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-foreground"
          >
            <Mail className="h-3 w-3 opacity-70" />
            {email}
            <span
              role="button"
              tabIndex={0}
              aria-label={`Remove ${email}`}
              onClick={(e) => {
                e.stopPropagation();
                remove(email);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  remove(email);
                }
              }}
              className="cursor-pointer rounded-sm p-0.5 opacity-60 hover:bg-background hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </span>
          </span>
        ))}
        <input
          type="email"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (draft.trim() && EMAIL_RE.test(draft.trim())) add(draft);
          }}
          placeholder={value.length === 0 ? placeholder : ""}
          disabled={disabled}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-muted-foreground"
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
          <Command>
            <CommandInput
              autoFocus
              placeholder="Search or type new email…"
              value={draft}
              onValueChange={(v) => setDraft(v)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && draft && EMAIL_RE.test(draft.trim())) {
                  // If no suggestion is highlighted, add the typed email.
                  // cmdk handles selecting matched items first.
                  const isMatch = suggestions.some(
                    (s) =>
                      s.email.toLowerCase().includes(draft.toLowerCase()) ||
                      s.label.toLowerCase().includes(draft.toLowerCase()),
                  );
                  if (!isMatch) {
                    e.preventDefault();
                    add(draft);
                  }
                }
              }}
            />
            <CommandList className="max-h-60">
              {suggestions.length === 0 ? (
                <CommandEmpty>
                  {EMAIL_RE.test(draft.trim())
                    ? "Press Enter to add this email."
                    : "Type a full email address."}
                </CommandEmpty>
              ) : (
                <>
                  {suggestions.map((s) => {
                    const checked = value.includes(s.email);
                    return (
                      <CommandItem
                        key={s.email}
                        value={`${s.email} ${s.label}`}
                        onSelect={() => toggleSuggestion(s.email)}
                        className="flex items-center gap-2"
                      >
                        <Check
                          className={cn(
                            "h-4 w-4 flex-none",
                            checked ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{s.email}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {s.label}
                          </p>
                        </div>
                        {checked && (
                          <Badge variant="outline" className="text-[10px]">
                            Added
                          </Badge>
                        )}
                      </CommandItem>
                    );
                  })}
                  {draft &&
                    EMAIL_RE.test(draft.trim()) &&
                    !suggestions.some((s) => s.email === draft.trim()) &&
                    !value.includes(draft.trim()) && (
                      <CommandItem
                        value={`__custom__${draft}`}
                        onSelect={() => add(draft)}
                        className="flex items-center gap-2 border-t"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="text-sm">
                          Add <span className="font-medium">{draft.trim()}</span>
                        </span>
                      </CommandItem>
                    )}
                </>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
