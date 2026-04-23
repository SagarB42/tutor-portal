"use client";

import { format } from "date-fns";
import {
  CalendarDays,
  ChevronRight,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ActionButton } from "@/components/shared/action-button";
import { CsvDownloadButton } from "@/components/shared/csv-download-button";
import {
  SessionDialog,
  type SessionStudentOption,
  type SessionTutorOption,
  type SessionInitialData,
} from "@/components/sessions/session-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteSession } from "@/lib/actions/sessions";
import { exportSessionLogsCsv } from "@/lib/actions/exports";

const statusStyles: Record<string, string> = {
  completed: "bg-green-50 text-green-700 border-green-200",
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  cancelled_billable: "bg-red-50 text-red-700 border-red-200",
  cancelled_free: "bg-slate-50 text-slate-600 border-slate-200",
};

const statusLabels: Record<string, string> = {
  completed: "Completed",
  scheduled: "Scheduled",
  cancelled_billable: "Cancelled (Billable)",
  cancelled_free: "Cancelled",
};

export type SessionRow = SessionInitialData & {
  start_time: string;
  end_time: string;
};

export function SessionsList({
  sessions,
  students,
  tutors,
}: {
  sessions: SessionRow[];
  students: SessionStudentOption[];
  tutors: SessionTutorOption[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const tutorMap = useMemo(
    () => new Map(tutors.map((t) => [t.id, t.full_name])),
    [tutors],
  );

  const filtered = sessions.filter((s) => {
    const q = search.toLowerCase();
    const names =
      s.session_students
        ?.map((ss) => ss.students?.full_name)
        .filter(Boolean)
        .join(" ") ?? "";
    return (
      s.topic.toLowerCase().includes(q) ||
      names.toLowerCase().includes(q) ||
      (s.tutor_id && (tutorMap.get(s.tutor_id) ?? "").toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Sessions
            </h2>
            <Badge variant="secondary">{sessions.length}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Click a session for details.
          </p>
        </div>
        <div className="flex gap-2">
          <CsvDownloadButton
            action={exportSessionLogsCsv}
            label="Export CSV"
          />
          <SessionDialog students={students} tutors={tutors} />
        </div>
      </div>

      {sessions.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by topic, student, or tutor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground" />
              <h3 className="mb-1 text-lg font-semibold">No sessions yet</h3>
              <p className="text-sm text-muted-foreground">
                Log your first session to get started.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No sessions match your search.
            </div>
          ) : (
            <>
              {/* Mobile */}
              <div className="divide-y md:hidden">
                {filtered.map((s) => {
                  const names =
                    s.session_students
                      ?.map((ss) => ss.students?.full_name)
                      .filter(Boolean)
                      .join(", ") || "—";
                  return (
                    <div
                      key={s.id}
                      className="cursor-pointer p-4 transition-colors active:bg-muted/50"
                      onClick={() =>
                        router.push(`/dashboard/sessions/${s.id}`)
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <p className="truncate font-semibold">{s.topic}</p>
                            <Badge
                              variant="outline"
                              className={`shrink-0 text-xs ${statusStyles[s.status] || ""}`}
                            >
                              {statusLabels[s.status] || s.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(s.start_time), "MMM d, yyyy")} ·{" "}
                            {format(new Date(s.start_time), "h:mm a")} –{" "}
                            {format(new Date(s.end_time), "h:mm a")}
                          </p>
                          <p className="mt-0.5 truncate text-sm text-muted-foreground">
                            {names}
                          </p>
                          {s.tutor_id && tutorMap.get(s.tutor_id) && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Tutor: {tutorMap.get(s.tutor_id)}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <RowActions
                            row={s}
                            students={students}
                            tutors={tutors}
                          />
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Tutor</TableHead>
                      <TableHead>Topic</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px] text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((s) => {
                      const names =
                        s.session_students
                          ?.map((ss) => ss.students?.full_name)
                          .filter(Boolean)
                          .join(", ") || "—";
                      return (
                        <TableRow
                          key={s.id}
                          className="cursor-pointer"
                          onClick={() =>
                            router.push(`/dashboard/sessions/${s.id}`)
                          }
                        >
                          <TableCell className="font-medium">
                            {format(new Date(s.start_time), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            {format(new Date(s.start_time), "h:mm a")} –{" "}
                            {format(new Date(s.end_time), "h:mm a")}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {names}
                          </TableCell>
                          <TableCell>
                            {s.tutor_id ? (tutorMap.get(s.tutor_id) ?? "—") : "—"}
                          </TableCell>
                          <TableCell className="font-medium">
                            {s.topic}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={statusStyles[s.status] || ""}
                            >
                              {statusLabels[s.status] || s.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <RowActions
                                row={s}
                                students={students}
                                tutors={tutors}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RowActions({
  row,
  students,
  tutors,
}: {
  row: SessionRow;
  students: SessionStudentOption[];
  tutors: SessionTutorOption[];
}) {
  return (
    <>
      <SessionDialog
        students={students}
        tutors={tutors}
        initialData={row}
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => e.stopPropagation()}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        }
      />
      <ActionButton
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive"
        action={() => deleteSession(row.id)}
        confirm="Delete this session? This cannot be undone."
        successMessage="Session deleted"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </ActionButton>
    </>
  );
}
