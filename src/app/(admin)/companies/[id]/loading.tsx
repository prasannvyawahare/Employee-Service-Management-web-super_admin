import { Skeleton } from "@/components/ui/Skeleton";

export default function CompanyDetailLoading() {
  return (
    <div className="max-w-2xl space-y-4">
      <Skeleton className="h-7 w-56" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full" />
      ))}
    </div>
  );
}
