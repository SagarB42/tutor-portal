"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
  deleteNotificationAction,
} from "@/lib/actions/notifications";
import type { NotificationRow, NotificationType } from "@/lib/db-types";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  initialItems: NotificationRow[];
  initialUnread: number;
};

const typeAccent: Record<NotificationType, string> = {
  prepaid_low: "bg-amber-500",
  attendance_absent: "bg-rose-500",
  invoice_overdue: "bg-orange-500",
  generic: "bg-slate-400",
};

export function NotificationBell({ userId, initialItems, initialUnread }: Props) {
  const [items, setItems] = React.useState<NotificationRow[]>(initialItems);
  const [unread, setUnread] = React.useState(initialUnread);
  const [pending, start] = React.useTransition();

  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow;
          setItems((prev) => [row, ...prev].slice(0, 30));
          setUnread((n) => n + 1);
          toast.message(row.title, { description: row.body ?? undefined });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  function handleMarkRead(n: NotificationRow) {
    if (n.read_at) return;
    setItems((prev) =>
      prev.map((i) =>
        i.id === n.id ? { ...i, read_at: new Date().toISOString() } : i,
      ),
    );
    setUnread((u) => Math.max(0, u - 1));
    start(async () => {
      try {
        await markNotificationReadAction(n.id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  function handleMarkAll() {
    setItems((prev) =>
      prev.map((i) =>
        i.read_at ? i : { ...i, read_at: new Date().toISOString() },
      ),
    );
    setUnread(0);
    start(async () => {
      try {
        await markAllNotificationsReadAction();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  function handleDelete(id: string) {
    const removed = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (removed && !removed.read_at) setUnread((u) => Math.max(0, u - 1));
    start(async () => {
      try {
        await deleteNotificationAction(id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={pending}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              You&rsquo;re all caught up.
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => {
                const content = (
                  <div className="flex gap-2">
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        typeAccent[n.type as NotificationType] ??
                          "bg-slate-400",
                        n.read_at && "opacity-30",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm",
                          n.read_at
                            ? "text-muted-foreground"
                            : "font-medium text-foreground",
                        )}
                      >
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="truncate text-xs text-muted-foreground">
                          {n.body}
                        </p>
                      )}
                      <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                        {formatDistanceToNow(new Date(n.created_at!), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id} className="group relative">
                    {n.link ? (
                      <Link
                        href={n.link}
                        onClick={() => handleMarkRead(n)}
                        className="block px-3 py-2 hover:bg-accent"
                      >
                        {content}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(n)}
                        className="block w-full px-3 py-2 text-left hover:bg-accent"
                      >
                        {content}
                      </button>
                    )}
                    <div className="absolute top-1.5 right-1.5 hidden items-center gap-0.5 group-hover:flex">
                      {!n.read_at && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleMarkRead(n);
                          }}
                          className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                          aria-label="Mark read"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(n.id);
                        }}
                        className="rounded p-1 text-muted-foreground hover:bg-background hover:text-rose-600"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
