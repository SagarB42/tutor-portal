"use client";

import {
  BookOpen,
  Briefcase,
  Calendar,
  CalendarDays,
  DollarSign,
  LayoutDashboard,
  Mail,
  Moon,
  Settings,
  Sparkles,
  Sun,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import * as React from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { openAskPanel } from "@/components/ai/ask-panel";

export const COMMAND_PALETTE_EVENT = "command-palette:toggle";

export function openCommandPalette() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_EVENT));
  }
}

const navItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Students", href: "/dashboard/students", icon: Users },
  { label: "Tutors", href: "/dashboard/tutors", icon: Briefcase },
  { label: "Sessions", href: "/dashboard/sessions", icon: Calendar },
  { label: "Calendar", href: "/dashboard/calendar", icon: CalendarDays },
  { label: "Finance", href: "/dashboard/finance", icon: DollarSign },
  { label: "Resources", href: "/dashboard/resources", icon: BookOpen },
  { label: "Emails", href: "/dashboard/emails", icon: Mail },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    function onToggle() {
      setOpen((prev) => !prev);
    }
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener(COMMAND_PALETTE_EVENT, onToggle);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(COMMAND_PALETTE_EVENT, onToggle);
    };
  }, []);

  function run(fn: () => void) {
    setOpen(false);
    fn();
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search or jump to…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => run(() => openAskPanel())}>
            <Sparkles className="mr-2 h-4 w-4 text-primary" />
            Ask AI
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navigate">
          {navItems.map(({ label, href, icon: Icon }) => (
            <CommandItem key={href} onSelect={() => run(() => router.push(href))}>
              <Icon className="mr-2 h-4 w-4" />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Theme">
          <CommandItem onSelect={() => run(() => setTheme("light"))}>
            <Sun className="mr-2 h-4 w-4" /> Light mode
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTheme("dark"))}>
            <Moon className="mr-2 h-4 w-4" /> Dark mode
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
