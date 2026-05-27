export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-text-secondary/10 ${className}`}
    />
  );
}
