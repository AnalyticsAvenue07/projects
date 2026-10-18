export function PageSuspenseSkeleton() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-pulse">
      <div className="h-24 rounded-3xl bg-slate-200/80 border border-slate-200" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-48 rounded-3xl bg-slate-200/70 border border-slate-200" />
        <div className="h-48 rounded-3xl bg-slate-200/70 border border-slate-200" />
        <div className="h-48 rounded-3xl bg-slate-200/70 border border-slate-200" />
        <div className="h-48 rounded-3xl bg-slate-200/70 border border-slate-200" />
      </div>
    </div>
  )
}
