function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
}

const sizes = {
  sm: 'h-8 w-8 rounded-full text-xs',
  lg: 'h-14 w-14 rounded-xl text-lg',
}

export default function Avatar({ name, size = 'sm', className = 'bg-primary-light text-primary' }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center font-semibold ${sizes[size]} ${className}`}
    >
      {initials(name)}
    </span>
  )
}
