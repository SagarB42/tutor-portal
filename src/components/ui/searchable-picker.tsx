"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type SearchablePickerItem = {
  id: string;
  label: string;
  sublabel?: string;
  status?: string;
  meta?: string;
};

type Props = {
  items: SearchablePickerItem[];
  value: string;
  onValueChange: (id: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loading?: boolean;
  disabled?: boolean;
};

/**
 * Inline combobox: behaves like a Select but with type-to-search and
 * structured row rendering (label, sublabel, status badge, meta line).
 * Toggles between a button trigger and an inline Command panel.
 */
export function SearchablePicker({
  items,
  value,
  onValueChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No matches.",
  loading,
  disabled,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const selected = items.find((i) => i.id === value) ?? null;

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-auto min-h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-left text-sm shadow-sm transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        {loading ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </span>
        ) : selected ? (
          <PickerRow item={selected} compact />
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronsUpDown className="h-4 w-4 flex-none opacity-50" />
      </button>
    );
  }

  return (
    <Command className="rounded-md border shadow-sm">
      <CommandInput
        placeholder={searchPlaceholder}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
          }
        }}
      />
      <CommandList className="max-h-72">
        <CommandEmpty>{emptyText}</CommandEmpty>
        {items.map((item) => {
          const haystack = [item.label, item.sublabel, item.status, item.meta]
            .filter(Boolean)
            .join(" ");
          return (
            <CommandItem
              key={item.id}
              value={haystack}
              onSelect={() => {
                onValueChange(item.id);
                setOpen(false);
              }}
              className="flex items-start gap-2 px-2 py-2"
            >
              <Check
                className={cn(
                  "mt-1 h-4 w-4 flex-none",
                  value === item.id ? "opacity-100" : "opacity-0",
                )}
              />
              <PickerRow item={item} />
            </CommandItem>
          );
        })}
      </CommandList>
    </Command>
  );
}

function PickerRow({
  item,
  compact,
}: {
  item: SearchablePickerItem;
  compact?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {item.label}
          </span>
          {item.status && (
            <Badge
              variant="outline"
              className="flex-none px-1.5 py-0 text-[10px] capitalize"
            >
              {item.status}
            </Badge>
          )}
        </div>
        {item.sublabel && (
          <p
            className={cn(
              "truncate text-xs text-muted-foreground",
              compact && "leading-tight",
            )}
          >
            {item.sublabel}
          </p>
        )}
        {item.meta && !compact && (
          <p className="truncate text-[11px] text-muted-foreground/80">
            {item.meta}
          </p>
        )}
        {item.meta && compact && (
          <p className="truncate text-[11px] leading-tight text-muted-foreground/80">
            {item.meta}
          </p>
        )}
      </div>
    </div>
  );
}
