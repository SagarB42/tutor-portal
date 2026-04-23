import { getResources } from "@/lib/queries/resources";
import { ResourcesList } from "./_components/resources-list";

export default async function ResourcesPage() {
  const resources = await getResources();
  return <ResourcesList resources={resources} />;
}
