"use client";

import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/shared/action-button";
import { AttendanceCard } from "@/components/attendance/attendance-card";
import { DraftEmailButton } from "@/components/emails/draft-email-button";
import { LinkResourceDialog } from "@/components/sessions/link-resource-dialog";
import {
  SessionDialog,
  type SessionInitialData,
  type SessionStudentOption,
  type SessionTutorOption,
} from "@/components/sessions/session-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deleteSession,
  unlinkResourceFromSession,
} from "@/lib/actions/sessions";
import type { AttendanceStatus } from "@/lib/db-types";
import { formatCurrency, formatGrade, getSessionHours } from "@/lib/utils";

const statusLabels: Record<string, string> = {
  completed: "Completed",
  scheduled: "Scheduled",
  cancelled_billable: "Cancelled (Billable)",
  cancelled_free: "Cancelled",
};

type LinkedResource = {
  id: string;
  notes: string | null;
  resources: {
    id: string;
    title: string;
    subject: string;
    url: string;
  } | null;
  students: { full_name: string } | null;
};

type SessionDetail = Omit<SessionInitialData, "session_students"> & {
  start_time: string;
  end_time: string;
  session_students: Array<{
    rate: number;
    student_id: string;
    students: {
      id: string;
      full_name: string;
      grade_level?: number | null;
    } | null;
  }>;
};

export function SessionDetailView({
  session,
  tutorName,
  linkedResources,
  attendance,
  allResources,
  students,
  tutors,
}: {
  session: SessionDetail;
  tutorName: string | null;
  linkedResources: LinkedResource[];
  attendance: Array<{
    student_id: string;
    full_name: string;
    status: AttendanceStatus;
    attendance_id?: string | null;
  }>;
  allResources: { id: string; title: string; subject: string }[];
  students: SessionStudentOption[];
  tutors: SessionTutorOption[];
}) {
  const router = useRouter();

  const hours = getSessionHours(session.start_time, session.end_time);
  const duration = Math.round(hours * 60);

  const sessionStudents = session.session_students
    .map((ss) =>
      ss.students
        ? {
            id: ss.students.id,
            full_name: ss.students.full_name,
            grade_level: ss.students.grade_level ?? null,
            rate: Number(ss.rate),
          }
        : null,
    )
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const dialogSessionStudents: SessionStudentOption[] = sessionStudents.map((s) => ({
    id: s.id,
    full_name: s.full_name,
    default_rate: null,
    archived_at: null,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="pl-0">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          <DraftEmailButton
            contextType="session_summary"
            contextId={session.id}
            studentId={sessionStudents[0]?.id}
            label="Email summary"
          />
          <SessionDialog
            students={students}
            tutors={tutors}
            initialData={session}
            trigger={
              <Button variant="outline" size="sm">
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
            }
          />
          <ActionButton
            variant="destructive"
            size="sm"
            action={() => deleteSession(session.id)}
            confirm="Delete this session? This cannot be undone."
            successMessage="Session deleted"
            onSuccess={() => router.push("/dashboard/sessions")}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </ActionButton>
        </div>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold">{session.topic}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {sessionStudents.map((s, i) => (
              <span key={s.id}>
                <span className="font-medium text-foreground">
                  {s.full_name}
                </span>
                {s.grade_level != null && (
                  <span className="ml-1 text-xs">
                    ({formatGrade(s.grade_level)})
                  </span>
                )}
                <span className="ml-1 text-xs">
                  {formatCurrency(Number(s.rate) * hours)}
                </span>
                {i < sessionStudents.length - 1 && (
                  <span className="mx-1">·</span>
                )}
              </span>
            ))}
            {tutorName && (
              <>
                <span className="mx-1">|</span>
                <span>
                  Tutor:{" "}
                  <span className="font-medium text-foreground">
                    {tutorName}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          {statusLabels[session.status] ?? session.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Date
            </CardTitle>
            <div className="rounded-xl bg-blue-50 p-2">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {format(new Date(session.start_time), "EEEE, MMMM d, yyyy")}
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Time
            </CardTitle>
            <div className="rounded-xl bg-emerald-50 p-2">
              <Clock className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {format(new Date(session.start_time), "h:mm a")} –{" "}
              {format(new Date(session.end_time), "h:mm a")}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {duration} minutes ({hours.toFixed(1)} hrs)
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rates (per hour)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {sessionStudents.map((s) => (
                <div key={s.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{s.full_name}</span>
                  <span className="font-semibold">
                    {formatCurrency(s.rate)}/hr ={" "}
                    {formatCurrency(Number(s.rate) * hours)}
                  </span>
                </div>
              ))}
            </div>
            {session.tutor_pay_rate != null && (
              <div className="mt-2 border-t pt-2 text-sm text-muted-foreground">
                Tutor pay: {formatCurrency(session.tutor_pay_rate)}/hr ={" "}
                {formatCurrency(Number(session.tutor_pay_rate) * hours)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {session.cancellation_reason && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="text-sm text-red-800">
              Cancellation Reason
            </CardTitle>
          </CardHeader>
          <CardContent className="text-red-700">
            {session.cancellation_reason}
          </CardContent>
        </Card>
      )}

      {session.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Session Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-muted-foreground">
              {session.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {attendance.length > 0 && (
        <AttendanceCard sessionId={session.id} students={attendance} />
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Linked Resources</CardTitle>
          <LinkResourceDialog
            sessionId={session.id}
            resources={allResources}
            sessionStudents={dialogSessionStudents}
          />
        </CardHeader>
        <CardContent>
          {linkedResources.length === 0 ? (
            <p className="text-sm italic text-muted-foreground">
              No resources linked yet.
            </p>
          ) : (
            <div className="space-y-3">
              {linkedResources.map((lr) => (
                <div
                  key={lr.id}
                  className="flex items-start justify-between rounded-xl border p-4 transition-colors hover:bg-muted/30"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {lr.resources?.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lr.resources?.subject}
                    </p>
                    {lr.students?.full_name && (
                      <p className="text-xs text-muted-foreground">
                        For: {lr.students.full_name}
                      </p>
                    )}
                    {lr.notes && (
                      <p className="mt-1 text-xs italic">{lr.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {lr.resources?.url && (
                      <a
                        href={lr.resources.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <ActionButton
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      action={() =>
                        unlinkResourceFromSession(lr.id, session.id)
                      }
                      confirm="Unlink this resource?"
                      successMessage="Resource unlinked"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </ActionButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
