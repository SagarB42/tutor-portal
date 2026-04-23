"use client";

import { format } from "date-fns";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  DollarSign,
  ExternalLink,
  GraduationCap,
  Mail,
  Pencil,
  Phone,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/shared/action-button";
import { StudentDialog } from "@/components/students/student-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteStudent } from "@/lib/actions/students";
import { formatCurrency, formatGrade, getSessionHours } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  completed: "bg-green-50 text-green-700 border-green-200",
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  cancelled_billable: "bg-red-50 text-red-700 border-red-200",
  cancelled_free: "bg-slate-50 text-slate-600 border-slate-200",
};

type StudentRow = {
  id: string;
  full_name: string;
  grade_level: number | null;
  default_rate: number | null;
  email: string | null;
  phone: string | null;
  parent_name: string | null;
  parent_email: string | null;
  parent_phone: string | null;
  alt_parent_name: string | null;
  alt_parent_email: string | null;
  alt_parent_phone: string | null;
  archived_at: string | null;
  [key: string]: unknown;
};

type SessionHistoryItem = {
  id: string;
  start_time: string;
  end_time: string;
  topic: string;
  status: string;
  rate: number;
};

type ResourceItem = {
  notes: string | null;
  resources: { id: string; title: string; subject: string; url: string } | null;
  sessions: { start_time: string } | null;
};

function ContactLine({
  icon: Icon,
  value,
}: {
  icon: typeof Mail;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
      <span className="break-all">{value}</span>
    </div>
  );
}

function ContactGroup({
  icon: HeaderIcon,
  label,
  name,
  email,
  phone,
}: {
  icon: typeof User;
  label: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  if (!name && !email && !phone) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <HeaderIcon className="h-3.5 w-3.5" />
        {label}
      </div>
      {name && <div className="text-sm font-medium text-white">{name}</div>}
      <div className="space-y-1">
        <ContactLine icon={Mail} value={email} />
        <ContactLine icon={Phone} value={phone} />
      </div>
    </div>
  );
}

export function StudentDetailView({
  student,
  sessions,
  resources,
}: {
  student: StudentRow;
  sessions: SessionHistoryItem[];
  resources: ResourceItem[];
}) {
  const router = useRouter();
  const isArchived = !!student.archived_at;

  const billableSessions = sessions.filter((s) =>
    ["completed", "cancelled_billable"].includes(s.status),
  );
  const totalBilled = billableSessions.reduce(
    (sum, s) =>
      sum + Number(s.rate) * getSessionHours(s.start_time, s.end_time),
    0,
  );

  const hasStudentContact = !!(student.email || student.phone);
  const hasParentContact = !!(
    student.parent_name ||
    student.parent_email ||
    student.parent_phone
  );
  const hasAltContact = !!(
    student.alt_parent_name ||
    student.alt_parent_email ||
    student.alt_parent_phone
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="pl-0">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          <StudentDialog
            initialData={
              student as unknown as Parameters<
                typeof StudentDialog
              >[0]["initialData"]
            }
            trigger={
              <Button variant="outline" size="sm">
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
            }
          />
          <ActionButton
            variant="destructive"
            size="sm"
            action={() => deleteStudent(student.id)}
            confirm="Delete this student? This cannot be undone."
            successMessage="Student deleted"
            onSuccess={() => router.push("/dashboard/students")}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </ActionButton>
        </div>
      </div>

      <Card className="border-0 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white shadow-xl">
        <CardContent className="p-6 sm:p-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{student.full_name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300">
                <span className="flex items-center gap-1">
                  <GraduationCap className="h-4 w-4" />{" "}
                  {formatGrade(student.grade_level)}
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />{" "}
                  {formatCurrency(student.default_rate ?? 0)}/hr
                </span>
              </div>
            </div>
            {isArchived ? (
              <Badge
                variant="outline"
                className="border-red-500/40 bg-red-500/15 text-red-300"
              >
                Archived
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-green-500/30 bg-green-500/15 text-green-300"
              >
                Active
              </Badge>
            )}
          </div>
          {(hasStudentContact || hasParentContact || hasAltContact) && (
            <div className="grid grid-cols-1 gap-x-10 gap-y-6 border-t border-slate-700/70 pt-6 md:grid-cols-2">
              {hasStudentContact && (
                <ContactGroup
                  icon={User}
                  label="Student"
                  email={student.email}
                  phone={student.phone}
                />
              )}
              {hasParentContact && (
                <ContactGroup
                  icon={Users}
                  label="Parent"
                  name={student.parent_name}
                  email={student.parent_email}
                  phone={student.parent_phone}
                />
              )}
              {hasAltContact && (
                <ContactGroup
                  icon={Users}
                  label="Alt Parent"
                  name={student.alt_parent_name}
                  email={student.alt_parent_email}
                  phone={student.alt_parent_phone}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sessions
            </CardTitle>
            <div className="rounded-xl bg-blue-50 p-2">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.length}</div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Billed
            </CardTitle>
            <div className="rounded-xl bg-green-50 p-2">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalBilled)}
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resources Assigned
            </CardTitle>
            <div className="rounded-xl bg-violet-50 p-2">
              <BookOpen className="h-4 w-4 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resources.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="flex h-full flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" /> Resources Given
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              {resources.length === 0 ? (
                <div className="p-8 text-center italic text-muted-foreground">
                  No resources assigned yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resource</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead className="text-right">Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resources.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {item.resources?.title}
                          {item.notes && (
                            <div className="mt-1 text-xs italic text-muted-foreground">
                              {item.notes}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {item.resources?.subject}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.sessions?.start_time
                            ? format(
                                new Date(item.sessions.start_time),
                                "MMM d, yyyy",
                              )
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.resources?.url && (
                            <a
                              href={item.resources.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                            >
                              Open <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="flex h-full flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" /> Recent Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {sessions.length === 0 ? (
              <div className="p-8 text-center italic text-muted-foreground">
                No sessions yet.
              </div>
            ) : (
              <div className="divide-y">
                {sessions.slice(0, 8).map((s) => {
                  const hours = getSessionHours(s.start_time, s.end_time);
                  const charge = Number(s.rate) * hours;
                  return (
                    <div
                      key={s.id}
                      className="cursor-pointer p-4 transition-colors hover:bg-muted/50"
                      onClick={() =>
                        router.push(`/dashboard/sessions/${s.id}`)
                      }
                    >
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <span className="text-sm font-medium">
                          {format(new Date(s.start_time), "MMM d")}
                        </span>
                        <Badge
                          variant="outline"
                          className={statusStyles[s.status] ?? ""}
                        >
                          {s.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {s.topic}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatCurrency(s.rate)}/hr × {hours.toFixed(1)}h ={" "}
                        {formatCurrency(charge)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
