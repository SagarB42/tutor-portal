import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/queries/org";
import { getTutor } from "@/lib/queries/tutors";
import { getTutorAvailabilities } from "@/lib/queries/availabilities";
import { AvailabilityCard } from "@/components/availability/availability-card";
import { TutorDetailView } from "./_components/tutor-detail-view";

export default async function TutorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tutor = await getTutor(id);
  if (!tutor) notFound();

  const { supabase, organizationId } = await requireOrg();
  const { data: sessions } = await supabase
    .from("sessions")
    .select(
      "id, start_time, end_time, topic, status, tutor_pay_rate, session_students(rate, students(id, full_name))",
    )
    .eq("tutor_id", id)
    .eq("organization_id", organizationId)
    .order("start_time", { ascending: false });

  const availabilities = await getTutorAvailabilities(id);

  return (
    <div className="space-y-6">
      <TutorDetailView
        tutor={tutor as unknown as Parameters<typeof TutorDetailView>[0]["tutor"]}
        sessions={(sessions ?? []) as unknown as Parameters<typeof TutorDetailView>[0]["sessions"]}
      />
      <AvailabilityCard
        ownerType="tutor"
        ownerId={id}
        availabilities={availabilities}
      />
    </div>
  );
}
