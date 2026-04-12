"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Calendar,
  DollarSign,
  BookOpen,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/students", label: "Students", icon: Users },
  { href: "/dashboard/tutors", label: "Tutors", icon: Briefcase },
  { href: "/dashboard/sessions", label: "Sessions", icon: Calendar },
  { href: "/dashboard/finance", label: "Finance", icon: DollarSign },
  { href: "/dashboard/resources", label: "Resources", icon: BookOpen },
];

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [businessName, setBusinessName] = useState("My Business");

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("organizations")
      .select("name")
      .eq("owner_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.name) setBusinessName(data.name);
      });
  }, [user?.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 flex-none bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-500 rounded-lg flex items-center justify-center font-bold text-sm shadow-lg shadow-blue-500/25">
                TP
              </div>
              <span className="font-bold text-lg tracking-tight">Tutor Portal</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 rounded hover:bg-slate-700">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-3 mb-6 border border-slate-700/50">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Business</p>
            <p className="text-sm font-semibold truncate mt-0.5">{businessName}</p>
            {user?.email && <p className="text-xs text-slate-400 mt-1 truncate">{user.email}</p>}
          </div>

          <nav className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setSidebarOpen(false)}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive(href)
                      ? "bg-blue-600/90 text-white shadow-md shadow-blue-600/20"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </div>
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-700">
          <Button
            variant="ghost"
            className="w-full justify-start text-red-300 hover:text-red-200 hover:bg-red-900/30"
            onClick={handleLogout}
          >
            <LogOut className="mr-3 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden bg-white/80 backdrop-blur-sm border-b px-4 py-3 flex items-center sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-3 font-semibold">{businessName}</span>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <DashboardShell>{children}</DashboardShell>
    </ProtectedRoute>
  );
}
