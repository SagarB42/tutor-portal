"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, Briefcase, Calendar, DollarSign, Loader2,
  ArrowRight, Clock, TrendingUp, Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency, getSessionHours } from "@/lib/utils";

type Stats = {
  students: number;
  tutors: number;
  sessions: number;
  revenue: number;
};

const statusStyles: Record<string, string> = {
  completed: "bg-green-50 text-green-700 border-green-200",
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  cancelled_billable: "bg-red-50 text-red-700 border-red-200",
  cancelled_free: "bg-slate-50 text-slate-600 border-slate-200",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ students: 0, tutors: 0, sessions: 0, revenue: 0 });
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [studentsRes, tutorsRes, sessionsRes, sessionStudentsRes, recentRes] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("tutors").select("id", { count: "exact", head: true }),
        supabase.from("sessions").select("id", { count: "exact", head: true }),
        supabase.from("session_students").select("rate, sessions(start_time, end_time, status)"),
        supabase
          .from("sessions")
          .select("id, topic, start_time, end_time, status, tutors(full_name)")
          .order("start_time", { ascending: false })
          .limit(5),
      ]);

      let revenue = 0;
      (sessionStudentsRes.data || []).forEach((ss: any) => {
        if (ss.sessions && ["completed", "cancelled_billable"].includes(ss.sessions.status)) {
          revenue += Number(ss.rate) * getSessionHours(ss.sessions.start_time, ss.sessions.end_time);
        }
      });

      setStats({
        students: studentsRes.count || 0,
        tutors: tutorsRes.count || 0,
        sessions: sessionsRes.count || 0,
        revenue,
      });
      setRecentSessions(recentRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading dashboard...
      </div>
    );
  }

  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";

  const cards = [
    { title: "Students", value: stats.students, icon: Users, color: "text-blue-600", bg: "bg-blue-50", href: "/dashboard/students" },
    { title: "Tutors", value: stats.tutors, icon: Briefcase, color: "text-violet-600", bg: "bg-violet-50", href: "/dashboard/tutors" },
    { title: "Sessions", value: stats.sessions, icon: Calendar, color: "text-emerald-600", bg: "bg-emerald-50", href: "/dashboard/sessions" },
    { title: "Total Billed", value: formatCurrency(stats.revenue), icon: DollarSign, color: "text-amber-600", bg: "bg-amber-50", href: "/dashboard/finance" },
  ];

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Welcome */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 sm:p-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-blue-300 text-sm font-medium mb-2">
            <Sparkles className="h-4 w-4" />
            <span>Dashboard</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{greeting}</h2>
          <p className="text-slate-300 mt-1 text-sm sm:text-base">
            Here&apos;s a snapshot of your tutoring business.
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link href={c.href} key={c.title}>
            <Card className="card-hover cursor-pointer group">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
                <div className={`p-2 rounded-xl ${c.bg} transition-transform group-hover:scale-110`}>
                  <c.icon className={`h-4 w-4 ${c.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{c.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base font-semibold">Recent Sessions</CardTitle>
            </div>
            <Link href="/dashboard/sessions" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {recentSessions.map((s) => (
                <Link href={`/dashboard/sessions/${s.id}`} key={s.id} className="flex items-center justify-between gap-3 px-6 py-3.5 hover:bg-muted/40 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{s.topic || "Untitled"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(s.start_time), "MMM d, yyyy · h:mm a")}
                      {s.tutors?.full_name && ` · ${s.tutors.full_name}`}
                    </p>
                  </div>
                  <Badge variant="outline" className={`shrink-0 text-xs ${statusStyles[s.status] || ""}`}>
                    {s.status.replace(/_/g, " ")}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
