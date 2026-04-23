import { getAllStudents } from "@/lib/queries/students";
import { StudentsList } from "./_components/students-list";

export default async function StudentsPage() {
  const students = await getAllStudents();
  return <StudentsList students={students} />;
}
