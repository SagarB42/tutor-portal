import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/lib/db-types";
import type { StudentAttendanceHistoryItem } from "@/lib/queries/attendance";

const statusStyles: Record<AttendanceStatus, string> = {
  present: "bg-emerald-100 text-emerald-800",
  absent: "bg-rose-100 text-rose-800",
  excused: "bg-slate-100 text-slate-700",
  late: "bg-amber-100 text-amber-800",
  pending: "bg-muted text-muted-foreground",
};

function computeStreak(history: StudentAttendanceHistoryItem[]): number {
  // Most recent history is first; count consecutive 'present' from top.
  let n = 0;
  for (const h of history) {
    if (h.status === "present") n++;
    else if (h.status === "pending") continue;
    else break;
  }
  return n;
}

export function StudentAttendanceReport({
  history,
}: {
  history: StudentAttendanceHistoryItem[];
}) {
  const completed = history.filter((h) => h.status !== "pending");
  const total = completed.length;
  const present = completed.filter((h) => h.status === "present").length;
  const absent = completed.filter((h) => h.status === "absent").length;
  const late = completed.filter((h) => h.status === "late").length;
  const absencePct = total === 0 ? 0 : Math.round((absent / total) * 100);
  const attendancePct =
    total === 0 ? 0 : Math.round(((present + late) / total) * 100);
  const streak = computeStreak(history);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Attendance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Attended" value={`${attendancePct}%`} />
          <Stat label="Absent" value={`${absencePct}%`} />
          <Stat label="Current streak" value={`${streak} session${streak === 1 ? "" : "s"}`} />
          <Stat label="Total tracked" value={String(total)} />
        </div>

        {history.length > 0 && (
          <div className="mt-6">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recent sessions
            </h4>
            <ul className="space-y-1.5">
              {history.slice(0, 10).map((h) => (
                <li
                  key={h.session_id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{h.topic}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(h.start_time).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-xs font-medium capitalize",
                      statusStyles[h.status],
                    )}
                  >
                    {h.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
