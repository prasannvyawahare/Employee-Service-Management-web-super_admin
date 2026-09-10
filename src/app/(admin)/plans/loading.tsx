import { Skeleton } from "@/components/ui/Skeleton";

export default function PlansLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-32" />
      <div className="flex flex-wrap gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-72 w-full max-w-sm" />
        ))}
      </div>
    </div>
  );
}
