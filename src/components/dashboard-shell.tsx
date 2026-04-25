"use client";

import {
  BookOpen,
  Briefcase,
  Calendar,
  CalendarDays,
  DollarSign,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { CommandPalette, openCommandPalette } from "@/components/command-palette";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/notification-bell";
import type { NotificationRow } from "@/lib/db-types";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/students", label: "Students", icon: Users },
  { href: "/dashboard/tutors", label: "Tutors", icon: Briefcase },
  { href: "/dashboard/sessions", label: "Sessions", icon: Calendar },
  { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/dashboard/finance", label: "Finance", icon: DollarSign },
  { href: "/dashboard/resources", label: "Resources", icon: BookOpen },
  { href: "/dashboard/emails", label: "Emails", icon: Mail },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

type Props = {
  children: React.ReactNode;
  userEmail: string | null;
  businessName: string;
  userId?: string;
  notifications?: { items: NotificationRow[]; unread: number };
};

function initialsFor(businessName: string, email: string | null) {
  const source = businessName || email || "";
  const parts = source
    .replace(/@.*$/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return letters.toUpperCase() || "T";
}

export function DashboardShell({ children, userEmail, businessName, userId, notifications }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = React.useState(false);

  const currentItem = navItems.find((item) =>
    item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href)
  );

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/auth/login");
    router.refresh();
  };

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <>
      <CommandPalette />
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed left-0 top-0 z-40 flex h-screen w-64 flex-none flex-col border-r bg-card/60 backdrop-blur transition-transform duration-300 md:sticky md:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center justify-between px-5 py-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5"
              onClick={() => setSidebarOpen(false)}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet-500 text-sm font-bold text-primary-foreground shadow-sm">
                TP
              </div>
              <span className="text-sm font-semibold tracking-tight">Tutor Portal</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent md:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <Separator />

          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                data-active={isActive(href)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  "data-[active=true]:bg-primary/10 data-[active=true]:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>

          <Separator />

          <div className="px-3 py-3 text-[11px] text-muted-foreground">
            <button
              onClick={openCommandPalette}
              className="w-full rounded-md px-2 py-1 text-left hover:bg-accent hover:text-accent-foreground"
            >
              Quick search…
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-2 text-muted-foreground hover:bg-accent md:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex flex-1 items-center gap-2 text-sm">
              <span className="font-semibold text-muted-foreground">{businessName}</span>
              {currentItem && (
                <>
                  <span className="text-muted-foreground/60">/</span>
                  <span className="font-medium text-foreground">{currentItem.label}</span>
                </>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="hidden h-8 gap-2 text-muted-foreground sm:inline-flex"
              onClick={openCommandPalette}
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search…</span>
            </Button>

            {userId && notifications && (
              <NotificationBell
                userId={userId}
                initialItems={notifications.items}
                initialUnread={notifications.unread}
              />
            )}

            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  aria-label="Open user menu"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{initialsFor(businessName, userEmail)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                <DropdownMenuLabel className="space-y-0.5">
                  <p className="truncate text-sm font-medium text-foreground">{businessName}</p>
                  {userEmail && (
                    <p className="truncate text-xs font-normal text-muted-foreground">
                      {userEmail}
                    </p>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setChangePasswordOpen(true)}>
                  <KeyRound className="mr-2 h-4 w-4" /> Change password
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="mx-auto max-w-7xl p-4 sm:p-6 md:p-8">{children}</div>
          </main>
        </div>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>

      <ChangePasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
        email={userEmail}
      />
    </>
  );
}
