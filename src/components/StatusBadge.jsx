export default function StatusBadge({ active, children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active ? 'bg-primary-light text-primary' : 'bg-danger/10 text-danger'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-primary' : 'bg-danger'}`} />
      {children}
    </span>
  )
}
