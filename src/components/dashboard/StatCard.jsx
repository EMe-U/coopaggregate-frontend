export default function StatCard({ label, icon: Icon, loading, children }) {
  return (
    <div className="min-w-0 rounded-xl bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
          <Icon size={16} />
        </div>
      </div>
      {loading ? (
        <div className="mt-3 space-y-2">
          <div className="h-7 w-24 animate-pulse rounded bg-background" />
          <div className="h-4 w-36 animate-pulse rounded bg-background" />
        </div>
      ) : (
        <div className="mt-2 min-w-0">{children}</div>
      )}
    </div>
  )
}
