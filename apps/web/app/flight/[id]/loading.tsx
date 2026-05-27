import { Skeleton } from "@/components/Skeleton";

export default function FlightLoading() {
  return (
    <main
      className="mx-auto max-w-4xl px-4 md:px-6 py-6"
      aria-busy="true"
      aria-label="Loading flight"
    >
      <Skeleton className="h-3 w-24" />
      <div className="mt-3 rounded-lg border border-border bg-surface p-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-4 w-32 mt-2" />
        <Skeleton className="h-8 w-48 mt-6" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="mt-4 rounded-lg border border-border bg-surface p-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-20 w-full mt-3" />
        </div>
      ))}
    </main>
  );
}
