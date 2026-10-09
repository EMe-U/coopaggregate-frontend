export default function EmptyState({ icon: Icon, title, message, children }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      {Icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-background text-muted">
          <Icon size={22} />
        </div>
      )}
      <p className="font-medium text-text">{title}</p>
      {message && <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
