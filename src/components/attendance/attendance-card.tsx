"use client";

import { useState, useTransition } from "react";
import { Check, Clock, X, AlertCircle, Ban } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DraftEmailButton } from "@/components/emails/draft-email-button";
import { cn } from "@/lib/utils";
import { setAttendance } from "@/lib/actions/attendance";
import type { AttendanceStatus } from "@/lib/db-types";

type StudentAttendance = {
  student_id: string;
  full_name: string;
  status: AttendanceStatus;
  attendance_id?: string | null;
};

const STATUSES: Array<{
  value: AttendanceStatus;
  label: string;
  icon: typeof Check;
  className: string;
}> = [
  {
    value: "present",
    label: "Present",
    icon: Check,
    className:
      "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600",
  },
  {
    value: "absent",
    label: "Absent",
    icon: X,
    className: "bg-rose-500 text-white border-rose-500 hover:bg-rose-600",
  },
  {
    value: "excused",
    label: "Excused",
    icon: Ban,
    className: "bg-slate-500 text-white border-slate-500 hover:bg-slate-600",
  },
  {
    value: "late",
    label: "Late",
    icon: AlertCircle,
    className: "bg-amber-500 text-white border-amber-500 hover:bg-amber-600",
  },
  {
    value: "pending",
    label: "Pending",
    icon: Clock,
    className: "bg-muted text-foreground border-border hover:bg-muted/80",
  },
];

type Props = {
  sessionId: string;
  students: StudentAttendance[];
};

export function AttendanceCard({ sessionId, students }: Props) {
  const [rows, setRows] = useState(students);
  const [pending, startTransition] = useTransition();

  function updateStatus(studentId: string, status: AttendanceStatus) {
    const previous = rows;
    setRows((r) =>
      r.map((row) =>
        row.student_id === studentId ? { ...row, status } : row,
      ),
    );
    startTransition(async () => {
      const res = await setAttendance({
        session_id: sessionId,
        student_id: studentId,
        status,
        notes: null,
      });
      if (!res.ok) {
        setRows(previous);
        toast.error(res.error);
        return;
      }
      toast.success("Attendance updated");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Attendance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.student_id}
              className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="text-sm font-medium">{row.full_name}</div>
              <div className="flex flex-wrap items-center gap-1.5">
                {STATUSES.map((s) => {
                  const Icon = s.icon;
                  const active = row.status === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      disabled={pending}
                      onClick={() => updateStatus(row.student_id, s.value)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                        active
                          ? s.className
                          : "border-border bg-background text-muted-foreground hover:bg-muted",
                        pending && "cursor-not-allowed opacity-70",
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {s.label}
                    </button>
                  );
                })}
                {row.status === "absent" && row.attendance_id && (
                  <DraftEmailButton
                    contextType="attendance_absence"
                    contextId={row.attendance_id}
                    studentId={row.student_id}
                    label="Email"
                    size="sm"
                    variant="ghost"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
