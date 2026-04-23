import { notFound } from "next/navigation";
import { getResources } from "@/lib/queries/resources";
import { getSession, getSessionResources } from "@/lib/queries/sessions";
import { getSessionAttendance } from "@/lib/queries/attendance";
import { getStudents } from "@/lib/queries/students";
import { getTutors } from "@/lib/queries/tutors";
import { SessionDetailView } from "./_components/session-detail-view";
import type { AttendanceStatus } from "@/lib/db-types";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) notFound();

  const [linkedResources, allResources, students, tutors, attendance] =
    await Promise.all([
      getSessionResources(id),
      getResources(),
      getStudents(),
      getTutors(),
      getSessionAttendance(id),
    ]);

  const sessionRec = session as unknown as {
    id: string;
    tutor_id: string | null;
    tutors?: { id: string; full_name: string } | null;
    session_students?: Array<{
      student_id: string;
      students: { id: string; full_name: string } | null;
    }>;
  };
  const tutorName = sessionRec.tutors?.full_name ?? null;

  const attendanceByStudent = new Map(
    attendance.map((a) => [a.student_id, a]),
  );
  const attendanceRows = (sessionRec.session_students ?? [])
    .filter((ss) => ss.students)
    .map((ss) => {
      const rec = attendanceByStudent.get(ss.student_id);
      return {
        student_id: ss.student_id,
        full_name: ss.students!.full_name,
        status: (rec?.status ?? "pending") as AttendanceStatus,
        attendance_id: rec?.id ?? null,
      };
    });

  return (
    <SessionDetailView
      session={session as unknown as Parameters<typeof SessionDetailView>[0]["session"]}
      tutorName={tutorName}
      linkedResources={linkedResources as unknown as Parameters<typeof SessionDetailView>[0]["linkedResources"]}
      attendance={attendanceRows}
      allResources={allResources.map((r) => ({
        id: r.id as string,
        title: r.title as string,
        subject: r.subject as string,
      }))}
      students={students.map((s) => ({
        id: s.id as string,
        full_name: s.full_name as string,
        default_rate: (s.default_rate ?? null) as number | null,
        archived_at: (s.archived_at ?? null) as string | null,
      }))}
      tutors={tutors.map((t) => ({
        id: t.id as string,
        full_name: t.full_name as string,
        pay_rate: (t.pay_rate ?? null) as number | null,
        archived_at: (t.archived_at ?? null) as string | null,
      }))}
    />
  );
}
