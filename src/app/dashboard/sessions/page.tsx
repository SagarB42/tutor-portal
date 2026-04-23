import { getSessions } from "@/lib/queries/sessions";
import { getStudents } from "@/lib/queries/students";
import { getTutors } from "@/lib/queries/tutors";
import { SessionsList, type SessionRow } from "./_components/sessions-list";

export default async function SessionsPage() {
  const [sessions, students, tutors] = await Promise.all([
    getSessions(),
    getStudents(),
    getTutors(),
  ]);

  return (
    <SessionsList
      sessions={sessions as unknown as SessionRow[]}
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
