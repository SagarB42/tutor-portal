"use client";

import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import {
  SessionDialog,
  type SessionStudentOption,
  type SessionTutorOption,
} from "@/components/sessions/session-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CalendarSession } from "@/lib/queries/calendar";
import type { AttendanceStatus } from "@/lib/db-types";
import { OverlapFinderDialog } from "./overlap-finder-dialog";

type AttendanceCounts = Record<AttendanceStatus, number>;

type Props = {
  view: "month" | "week";
  anchorIso: string;
  sessions: CalendarSession[];
  attendanceBySession: Record<string, AttendanceCounts>;
  tutors: SessionTutorOption[];
  students: SessionStudentOption[];
};

const statusColor: Record<string, string> = {
  scheduled: "bg-blue-500/90 hover:bg-blue-500 text-white",
  completed: "bg-emerald-500/90 hover:bg-emerald-500 text-white",
  cancelled_billable: "bg-rose-500/90 hover:bg-rose-500 text-white",
  cancelled_free: "bg-slate-400/90 hover:bg-slate-400 text-white",
};

function tooltipFor(
  s: CalendarSession,
  counts: AttendanceCounts | undefined,
): string {
  const lines: string[] = [
    `${s.topic}`,
    `${format(new Date(s.start_time), "EEE MMM d, HH:mm")} – ${format(new Date(s.end_time), "HH:mm")}`,
  ];
  if (s.tutor_name) lines.push(`Tutor: ${s.tutor_name}`);
  if (s.student_names.length)
    lines.push(`Students: ${s.student_names.join(", ")}`);
  const expected = s.student_names.length;
  if (counts) {
    const parts: string[] = [];
    if (counts.present) parts.push(`${counts.present} present`);
    if (counts.absent) parts.push(`${counts.absent} absent`);
    if (counts.excused) parts.push(`${counts.excused} excused`);
    if (counts.late) parts.push(`${counts.late} late`);
    if (counts.pending) parts.push(`${counts.pending} pending`);
    if (parts.length)
      lines.push(`Attendance (expected ${expected}): ${parts.join(", ")}`);
  }
  return lines.join("\n");
}

export function CalendarClient({
  view,
  anchorIso,
  sessions,
  attendanceBySession,
  tutors,
  students,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const anchor = useMemo(() => new Date(anchorIso), [anchorIso]);
  const [finderOpen, setFinderOpen] = useState(false);

  function navigate(nextAnchor: Date, nextView: "month" | "week" = view) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", nextView);
    params.set("anchor", nextAnchor.toISOString());
    router.push(`/dashboard/calendar?${params.toString()}`);
  }

  function shift(delta: number) {
    navigate(
      view === "week" ? addWeeks(anchor, delta) : addMonths(anchor, delta),
    );
  }

  const rangeStart =
    view === "week"
      ? startOfWeek(anchor, { weekStartsOn: 0 })
      : startOfWeek(startOfMonth(anchor), { weekStartsOn: 0 });
  const rangeEnd =
    view === "week"
      ? endOfWeek(anchor, { weekStartsOn: 0 })
      : endOfWeek(endOfMonth(anchor), { weekStartsOn: 0 });

  // Build an array of days for the grid.
  const days: Date[] = [];
  {
    let d = rangeStart;
    while (d <= rangeEnd) {
      days.push(d);
      d = addDays(d, 1);
    }
  }

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, CalendarSession[]>();
    for (const s of sessions) {
      const key = format(new Date(s.start_time), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return map;
  }, [sessions]);

  const title =
    view === "week"
      ? `Week of ${format(rangeStart, "MMM d")} – ${format(rangeEnd, "MMM d, yyyy")}`
      : format(anchor, "MMMM yyyy");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Monthly and weekly view of scheduled sessions."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setFinderOpen(true)}>
              <Search className="mr-2 h-4 w-4" />
              Find Slot
            </Button>
            <SessionDialog students={students} tutors={tutors} />
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={() => shift(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => navigate(new Date())}>
            Today
          </Button>
          <Button size="icon" variant="outline" onClick={() => shift(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="ml-2 text-lg font-semibold">{title}</h2>
        </div>
        <div className="flex rounded-md border p-0.5">
          {(["month", "week"] as const).map((v) => (
            <button
              key={v}
              onClick={() => navigate(anchor, v)}
              className={cn(
                "px-3 py-1 text-sm font-medium capitalize rounded",
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "month" ? (
        <MonthGrid
          anchor={anchor}
          days={days}
          sessionsByDay={sessionsByDay}
          attendanceBySession={attendanceBySession}
        />
      ) : (
        <WeekGrid
          days={days}
          sessionsByDay={sessionsByDay}
          attendanceBySession={attendanceBySession}
        />
      )}

      <OverlapFinderDialog
        open={finderOpen}
        onOpenChange={setFinderOpen}
        tutors={tutors}
        students={students}
      />
    </div>
  );
}

function MonthGrid({
  anchor,
  days,
  sessionsByDay,
  attendanceBySession,
}: {
  anchor: Date;
  days: Date[];
  sessionsByDay: Map<string, CalendarSession[]>;
  attendanceBySession: Record<string, AttendanceCounts>;
}) {
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <div className="rounded-lg border bg-card">
      <div className="grid grid-cols-7 border-b text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {weekdayLabels.map((l) => (
          <div key={l} className="px-2 py-2">
            {l}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const list = sessionsByDay.get(key) ?? [];
          const inMonth = isSameMonth(d, anchor);
          const today = isSameDay(d, new Date());
          return (
            <div
              key={key}
              className={cn(
                "min-h-[108px] border-b border-r p-1.5 last:border-r-0",
                !inMonth && "bg-muted/30 text-muted-foreground",
              )}
            >
              <div
                className={cn(
                  "mb-1 text-xs font-medium",
                  today &&
                    "inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground",
                )}
              >
                {format(d, "d")}
              </div>
              <div className="space-y-0.5">
                {list.slice(0, 3).map((s) => (
                  <Link
                    key={s.id}
                    href={`/dashboard/sessions/${s.id}`}
                    title={tooltipFor(s, attendanceBySession[s.id])}
                    className={cn(
                      "block truncate rounded px-1.5 py-0.5 text-xs",
                      statusColor[s.status] ??
                        "bg-slate-400 text-white",
                    )}
                  >
                    {format(new Date(s.start_time), "HH:mm")} {s.topic}
                  </Link>
                ))}
                {list.length > 3 && (
                  <div className="px-1.5 text-[11px] text-muted-foreground">
                    +{list.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({
  days,
  sessionsByDay,
  attendanceBySession,
}: {
  days: Date[];
  sessionsByDay: Map<string, CalendarSession[]>;
  attendanceBySession: Record<string, AttendanceCounts>;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
      {days.map((d) => {
        const key = format(d, "yyyy-MM-dd");
        const list = sessionsByDay.get(key) ?? [];
        const today = isSameDay(d, new Date());
        return (
          <div
            key={key}
            className={cn(
              "rounded-lg border bg-card p-3",
              today && "ring-1 ring-primary",
            )}
          >
            <div className="mb-2">
              <div className="text-xs font-medium uppercase text-muted-foreground">
                {format(d, "EEE")}
              </div>
              <div className="text-lg font-semibold">{format(d, "d")}</div>
            </div>
            <div className="space-y-1.5">
              {list.length === 0 ? (
                <p className="text-xs text-muted-foreground">No sessions</p>
              ) : (
                list.map((s) => (
                  <Link
                    key={s.id}
                    href={`/dashboard/sessions/${s.id}`}
                    title={tooltipFor(s, attendanceBySession[s.id])}
                    className={cn(
                      "block rounded px-2 py-1.5 text-xs",
                      statusColor[s.status] ?? "bg-slate-400 text-white",
                    )}
                  >
                    <div className="font-medium">
                      {format(new Date(s.start_time), "HH:mm")} –{" "}
                      {format(new Date(s.end_time), "HH:mm")}
                    </div>
                    <div className="truncate">{s.topic}</div>
                    {s.tutor_name && (
                      <div className="truncate opacity-80">
                        {s.tutor_name}
                      </div>
                    )}
                  </Link>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
