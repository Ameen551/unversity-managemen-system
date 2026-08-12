export function Spinner({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-10 ${className ?? ''}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-royal-200 border-t-royal-600" />
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-royal-200 border-t-royal-600" />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className ?? ''}`} />;
}
