export default function PageTitle({ children, className = 'mb-6' }) {
  return <h1 className={`text-2xl font-semibold text-text ${className}`}>{children}</h1>
}
