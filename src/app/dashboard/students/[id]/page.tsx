import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/queries/org";
import { getStudent } from "@/lib/queries/students";
import { getStudentAvailabilities } from "@/lib/queries/availabilities";
import { getStudentAttendanceHistory } from "@/lib/queries/attendance";
import {
  getBillableLinesForStudent,
  getInvoicesForStudent,
  getStudentBalance,
} from "@/lib/queries/invoices";
import { AvailabilityCard } from "@/components/availability/availability-card";
import { StudentAttendanceReport } from "@/components/attendance/student-attendance-report";
import { StudentBalanceCard } from "@/components/students/student-balance-card";
import { InvoicesCard } from "@/components/invoices/invoices-card";
import { StudentDetailView } from "./_components/student-detail-view";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const student = await getStudent(id);
  if (!student) notFound();

  const { supabase } = await requireOrg();

  const { data: ssData } = await supabase
    .from("session_students")
    .select("rate, sessions(id, start_time, end_time, topic, status)")
    .eq("student_id", id);

  const sessions = (ssData ?? [])
    .map((ss) => {
      const sess = ss.sessions as unknown as {
        id: string;
        start_time: string;
        end_time: string;
        topic: string;
        status: string;
      } | null;
      return sess ? { ...sess, rate: Number(ss.rate) } : null;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .sort(
      (a, b) =>
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
    );

  let resources: Array<{
    notes: string | null;
    resources: {
      id: string;
      title: string;
      subject: string;
      url: string;
    } | null;
    sessions: { start_time: string } | null;
  }> = [];

  if (sessions.length > 0) {
    const sessionIds = sessions.map((s) => s.id);
    const { data: resData } = await supabase
      .from("session_resources")
      .select(
        "notes, resources(id, title, subject, url), sessions(start_time)",
      )
      .eq("student_id", id)
      .in("session_id", sessionIds);
    resources = (resData ?? []) as unknown as typeof resources;
  }

  const availabilities = await getStudentAvailabilities(id);
  const attendanceHistory = await getStudentAttendanceHistory(id);
  const [balance, invoices, billableLines] = await Promise.all([
    getStudentBalance(id),
    getInvoicesForStudent(id),
    getBillableLinesForStudent(id),
  ]);

  return (
    <div className="space-y-6">
      <StudentDetailView
        student={student as unknown as Parameters<typeof StudentDetailView>[0]["student"]}
        sessions={sessions}
        resources={resources}
      />
      <StudentBalanceCard balance={balance} studentId={id} />
      <InvoicesCard
        studentId={id}
        invoices={invoices}
        billableLines={billableLines}
      />
      <StudentAttendanceReport history={attendanceHistory} />
      <AvailabilityCard
        ownerType="student"
        ownerId={id}
        availabilities={availabilities}
      />
    </div>
  );
}
