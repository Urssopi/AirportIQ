import { Skeleton } from "@/components/Skeleton";

export default function BoardLoading() {
  return (
    <main className="min-h-screen px-4 md:px-8 py-6" aria-busy="true" aria-label="Loading board">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-64 mt-2" />
      <Skeleton className="h-10 w-full mt-4" />
      <div className="mt-6 rounded-lg border border-border bg-surface overflow-hidden">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full mt-px" />
        ))}
      </div>
    </main>
  );
}
