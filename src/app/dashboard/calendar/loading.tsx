import { PageHeaderSkeleton } from "@/components/shared/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <Skeleton className="h-10 w-72" />
      <div className="grid grid-cols-7 gap-0 rounded-lg border">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-[108px] rounded-none border-b border-r" />
        ))}
      </div>
    </div>
  );
}
