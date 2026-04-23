export function CardSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div
      className={`flex-none animate-pulse rounded-2xl bg-parchment-100 ${
        wide ? 'h-36 w-[280px]' : 'h-16 w-full'
      }`}
    />
  );
}

export function HorizontalSkeletons() {
  return (
    <div className="flex gap-3 overflow-hidden">
      <CardSkeleton wide />
      <CardSkeleton wide />
    </div>
  );
}

export function RowSkeletons({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
