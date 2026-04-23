import {
  addMonths,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { getSessionsInRange } from "@/lib/queries/calendar";
import { getAttendanceCountsInRange } from "@/lib/queries/attendance";
import { getTutors } from "@/lib/queries/tutors";
import { getStudents } from "@/lib/queries/students";
import { CalendarClient } from "./_components/calendar-client";

type SearchParams = Promise<{ view?: string; anchor?: string }>;

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const view = params.view === "week" ? "week" : "month";
  const anchor = params.anchor ? new Date(params.anchor) : new Date();

  const range =
    view === "week"
      ? {
          from: startOfWeek(anchor, { weekStartsOn: 0 }),
          to: endOfWeek(anchor, { weekStartsOn: 0 }),
        }
      : {
          // month grid also shows leading/trailing weeks
          from: startOfWeek(startOfMonth(anchor), { weekStartsOn: 0 }),
          to: endOfWeek(endOfMonth(anchor), { weekStartsOn: 0 }),
        };

  const [sessions, tutors, students, attendanceCounts] = await Promise.all([
    getSessionsInRange(
      range.from.toISOString(),
      addMonths(range.to, 0).toISOString(),
    ),
    getTutors(),
    getStudents(),
    getAttendanceCountsInRange(
      range.from.toISOString(),
      addMonths(range.to, 0).toISOString(),
    ),
  ]);

  const attendanceMap = Object.fromEntries(
    attendanceCounts.map((a) => [a.session_id, a.counts]),
  );

  return (
    <CalendarClient
      view={view}
      anchorIso={anchor.toISOString()}
      sessions={sessions}
      attendanceBySession={attendanceMap}
      tutors={tutors.map((t) => ({
        id: t.id as string,
        full_name: t.full_name as string,
        pay_rate: (t.pay_rate ?? null) as number | null,
        archived_at: (t.archived_at ?? null) as string | null,
      }))}
      students={students.map((s) => ({
        id: s.id as string,
        full_name: s.full_name as string,
        default_rate: (s.default_rate ?? null) as number | null,
        archived_at: (s.archived_at ?? null) as string | null,
      }))}
    />
  );
}
