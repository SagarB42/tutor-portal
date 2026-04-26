import { format } from "date-fns";
import {
  ArrowRight,
  Calendar,
  Clock,
  DollarSign,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOrg } from "@/lib/queries/org";
import { getRecentSessions } from "@/lib/queries/sessions";
import {
  getAnalytics,
  getEarliestActivityDate,
} from "@/lib/queries/analytics";
import { availableFYs, fyRange, parseFYParam } from "@/lib/fy";
import { formatCurrency } from "@/lib/utils";
import {
  RevenueChart,
  SessionsChart,
  StudentsChart,
} from "./_components/analytics-charts";
import { FYSelector } from "./_components/fy-selector";

export const dynamic = "force-dynamic";

const statusStyles: Record<string, string> = {
  completed: "bg-green-50 text-green-700 border-green-200",
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  cancelled_billable: "bg-red-50 text-red-700 border-red-200",
  cancelled_free: "bg-slate-50 text-slate-600 border-slate-200",
};

type PageProps = {
  searchParams: Promise<{ fy?: string | string[] }>;
};

export default async function DashboardPage({ searchParams }: PageProps) {
  await requireOrg();
  const sp = await searchParams;
  const fyStart = parseFYParam(sp.fy);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="animate-slide-up space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 text-white sm:p-8">
        <div className="absolute top-0 right-0 h-64 w-64 -translate-y-1/2 translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-1/2 translate-y-1/2 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-300">
            <Sparkles className="h-4 w-4" />
            <span>Dashboard</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {greeting}
          </h2>
          <p className="mt-1 text-sm text-slate-300 sm:text-base">
            Here&apos;s a snapshot of your tutoring business.
          </p>
        </div>
      </div>

      <Suspense fallback={<FYBarSkeleton />}>
        <FYBar fyStart={fyStart} />
      </Suspense>

      <Suspense fallback={<KPISkeleton />}>
        <KPISection fyStart={fyStart} />
      </Suspense>

      <div className="grid gap-4 lg:grid-cols-2">
        <Suspense fallback={<ChartSkeleton title="Revenue vs Expenses" />}>
          <RevenueCard fyStart={fyStart} />
        </Suspense>
        <Suspense fallback={<ChartSkeleton title="Sessions per month" />}>
          <SessionsCard fyStart={fyStart} />
        </Suspense>
      </div>
      <Suspense fallback={<ChartSkeleton title="Active students" />}>
        <StudentsCard fyStart={fyStart} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-60 w-full rounded-xl" />}>
        <RecentSessionsCard />
      </Suspense>
    </div>
  );
}

async function FYBar({ fyStart }: { fyStart: number }) {
  const earliest = await getEarliestActivityDate();
  const options = availableFYs(earliest);
  if (!options.includes(fyStart)) options.unshift(fyStart);
  const range = fyRange(fyStart);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="text-lg font-semibold">Business health</h3>
        <p className="text-xs text-muted-foreground">
          {range.label} · {format(range.start, "d MMM yyyy")} –{" "}
          {format(new Date(range.end.getTime() - 1), "d MMM yyyy")}
        </p>
      </div>
      <FYSelector current={fyStart} options={options} />
    </div>
  );
}

async function KPISection({ fyStart }: { fyStart: number }) {
  const analytics = await getAnalytics(fyStart);
  const { totals } = analytics;
  const cards = [
    {
      title: "Revenue",
      value: formatCurrency(totals.revenue),
      icon: DollarSign,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/dashboard/finance",
    },
    {
      title: "Expenses",
      value: formatCurrency(totals.expenses),
      icon: TrendingDown,
      color: "text-rose-600",
      bg: "bg-rose-50",
      href: "/dashboard/finance",
    },
    {
      title: "Net",
      value: formatCurrency(totals.net),
      icon: TrendingUp,
      color: totals.net >= 0 ? "text-emerald-600" : "text-rose-600",
      bg: totals.net >= 0 ? "bg-emerald-50" : "bg-rose-50",
      href: "/dashboard/finance",
    },
    {
      title: "Sessions",
      value: `${totals.sessionCount} · ${totals.sessionHours.toFixed(0)}h`,
      icon: Calendar,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      href: "/dashboard/sessions",
    },
    {
      title: "Active students",
      value: totals.activeStudents,
      icon: Users,
      color: "text-violet-600",
      bg: "bg-violet-50",
      href: "/dashboard/students",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => (
        <Link href={c.href} key={c.title}>
          <Card className="card-hover group h-full cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {c.title}
              </CardTitle>
              <div
                className={`rounded-xl p-2 ${c.bg} transition-transform group-hover:scale-110`}
              >
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold sm:text-xl">{c.value}</div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

async function RevenueCard({ fyStart }: { fyStart: number }) {
  const analytics = await getAnalytics(fyStart);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Revenue vs Expenses by month
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RevenueChart data={analytics.revenueByMonth} />
      </CardContent>
    </Card>
  );
}

async function SessionsCard({ fyStart }: { fyStart: number }) {
  const analytics = await getAnalytics(fyStart);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Sessions per month
        </CardTitle>
      </CardHeader>
      <CardContent>
        <SessionsChart data={analytics.sessionsPerMonth} />
      </CardContent>
    </Card>
  );
}

async function StudentsCard({ fyStart }: { fyStart: number }) {
  const analytics = await getAnalytics(fyStart);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Active students over time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <StudentsChart data={analytics.studentGrowth} />
      </CardContent>
    </Card>
  );
}

async function RecentSessionsCard() {
  const recentSessions = await getRecentSessions(5);
  if (!recentSessions.length) return null;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base font-semibold">
            Recent Sessions
          </CardTitle>
        </div>
        <Link
          href="/dashboard/sessions"
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {(
            recentSessions as unknown as Array<{
              id: string;
              topic: string;
              start_time: string;
              end_time: string;
              status: string;
              tutors?: { full_name: string } | null;
            }>
          ).map((s) => (
            <Link
              href={`/dashboard/sessions/${s.id}`}
              key={s.id}
              className="flex items-center justify-between gap-3 px-6 py-3.5 transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {s.topic || "Untitled"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {format(new Date(s.start_time), "MMM d, yyyy · h:mm a")}
                  {s.tutors?.full_name && ` · ${s.tutors.full_name}`}
                </p>
              </div>
              <Badge
                variant="outline"
                className={`shrink-0 text-xs ${statusStyles[s.status] ?? ""}`}
              >
                {s.status.replace(/_/g, " ")}
              </Badge>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FYBarSkeleton() {
  return <Skeleton className="h-10 w-full" />;
}

function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}

function ChartSkeleton({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[260px] w-full" />
      </CardContent>
    </Card>
  );
}
