import { getAllTutors } from "@/lib/queries/tutors";
import { TutorsList } from "./_components/tutors-list";

export default async function TutorsPage() {
  const tutors = await getAllTutors();
  return <TutorsList tutors={tutors} />;
}
