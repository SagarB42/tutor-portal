"use client";

import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  LifeBuoy,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Shield,
  Trash2,
  User,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/shared/action-button";
import { TutorDialog } from "@/components/tutors/tutor-dialog";
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
import { deleteTutor } from "@/lib/actions/tutors";
import { formatCurrency, getSessionHours } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  completed: "bg-green-50 text-green-700 border-green-200",
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  cancelled_billable: "bg-red-50 text-red-700 border-red-200",
  cancelled_free: "bg-slate-50 text-slate-600 border-slate-200",
};

type TutorRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  pay_rate: number | null;
  emergency_name: string | null;
  emergency_phone: string | null;
  alt_emergency_name: string | null;
  alt_emergency_phone: string | null;
  tfn: string | null;
  bank_bsb: string | null;
  archived_at: string | null;
  [key: string]: unknown;
};

type TutorSession = {
  id: string;
  start_time: string;
  end_time: string;
  topic: string;
  status: string;
  tutor_pay_rate: number | null;
  session_students?: Array<{
    students: { id: string; full_name: string } | null;
  }> | null;
};

function InfoLine({
  icon: Icon,
  value,
}: {
  icon: typeof Mail;
  value: React.ReactNode;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
      <span className="break-all">{value}</span>
    </div>
  );
}

export function TutorDetailView({
  tutor,
  sessions,
}: {
  tutor: TutorRow;
  sessions: TutorSession[];
}) {
  const router = useRouter();
  const isArchived = !!tutor.archived_at;

  const completedSessions = sessions.filter((s) =>
    ["completed", "cancelled_billable"].includes(s.status),
  );
  const totalEarnings = completedSessions.reduce(
    (sum, s) =>
      sum +
      (Number(s.tutor_pay_rate) || 0) *
        getSessionHours(s.start_time, s.end_time),
    0,
  );

  const hasContact = !!(tutor.email || tutor.phone || tutor.address);
  const hasEmergency = !!(
    tutor.emergency_name ||
    tutor.emergency_phone ||
    tutor.alt_emergency_name ||
    tutor.alt_emergency_phone
  );
  const hasFinancial = !!(tutor.pay_rate || tutor.tfn || tutor.bank_bsb);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="pl-0">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          <TutorDialog
            initialData={
              tutor as unknown as Parameters<
                typeof TutorDialog
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
            action={() => deleteTutor(tutor.id)}
            confirm="Delete this tutor? This cannot be undone."
            successMessage="Tutor deleted"
            onSuccess={() => router.push("/dashboard/tutors")}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </ActionButton>
        </div>
      </div>

      <Card className="border-0 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950 text-white shadow-xl">
        <CardContent className="p-6 sm:p-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{tutor.full_name}</h1>
              {tutor.pay_rate != null && (
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                  <DollarSign className="h-4 w-4" />{" "}
                  {formatCurrency(tutor.pay_rate)}/hr
                </div>
              )}
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

          {(hasContact || hasEmergency || hasFinancial) && (
            <div className="grid grid-cols-1 gap-x-10 gap-y-6 border-t border-slate-700/70 pt-6 md:grid-cols-2">
              {hasContact && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <User className="h-3.5 w-3.5" />
                    Contact
                  </div>
                  <div className="space-y-1">
                    <InfoLine icon={Mail} value={tutor.email} />
                    <InfoLine icon={Phone} value={tutor.phone} />
                    <InfoLine icon={MapPin} value={tutor.address} />
                  </div>
                </div>
              )}

              {hasEmergency && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <LifeBuoy className="h-3.5 w-3.5" />
                    Emergency
                  </div>
                  {(tutor.emergency_name || tutor.emergency_phone) && (
                    <div className="space-y-1">
                      {tutor.emergency_name && (
                        <div className="text-sm font-medium text-white">
                          {tutor.emergency_name}
                        </div>
                      )}
                      <InfoLine icon={Phone} value={tutor.emergency_phone} />
                    </div>
                  )}
                  {(tutor.alt_emergency_name || tutor.alt_emergency_phone) && (
                    <div className="space-y-1 border-t border-slate-700/50 pt-2">
                      {tutor.alt_emergency_name && (
                        <div className="text-sm font-medium text-slate-200">
                          {tutor.alt_emergency_name}
                          <span className="ml-1 text-xs text-slate-400">
                            (alt)
                          </span>
                        </div>
                      )}
                      <InfoLine
                        icon={Phone}
                        value={tutor.alt_emergency_phone}
                      />
                    </div>
                  )}
                </div>
              )}

              {hasFinancial && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <Wallet className="h-3.5 w-3.5" />
                    Financial
                  </div>
                  <div className="space-y-1">
                    {tutor.pay_rate != null && (
                      <InfoLine
                        icon={DollarSign}
                        value={`${formatCurrency(tutor.pay_rate)}/hr`}
                      />
                    )}
                    {tutor.tfn && (
                      <InfoLine
                        icon={Shield}
                        value={`TFN: ••••••${tutor.tfn.slice(-3)}`}
                      />
                    )}
                    {tutor.bank_bsb && (
                      <InfoLine
                        icon={Wallet}
                        value={`BSB: ${tutor.bank_bsb}`}
                      />
                    )}
                  </div>
                </div>
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
              Completed
            </CardTitle>
            <div className="rounded-xl bg-emerald-50 p-2">
              <Calendar className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedSessions.length}</div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Earnings
            </CardTitle>
            <div className="rounded-xl bg-green-50 p-2">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalEarnings)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" /> Session History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sessions.length === 0 ? (
            <div className="p-8 text-center italic text-muted-foreground">
              No sessions yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Pay</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => {
                  const studentNames =
                    s.session_students
                      ?.map((ss) => ss.students?.full_name)
                      .filter(Boolean)
                      .join(", ") || "—";
                  const hours = getSessionHours(s.start_time, s.end_time);
                  const pay = (Number(s.tutor_pay_rate) || 0) * hours;
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
                      <TableCell>{s.topic}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {studentNames}
                      </TableCell>
                      <TableCell>
                        {pay > 0 ? formatCurrency(pay) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={statusStyles[s.status] ?? ""}
                        >
                          {s.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
