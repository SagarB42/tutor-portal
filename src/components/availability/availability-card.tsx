import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvailabilityManager } from "./availability-manager";
import type { AvailabilityRow } from "@/lib/db-types";

export function AvailabilityCard({
  ownerType,
  ownerId,
  availabilities,
  title = "Availability",
}: {
  ownerType: "tutor" | "student";
  ownerId: string;
  availabilities: AvailabilityRow[];
  title?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <AvailabilityManager
          ownerType={ownerType}
          ownerId={ownerId}
          availabilities={availabilities}
        />
      </CardContent>
    </Card>
  );
}
