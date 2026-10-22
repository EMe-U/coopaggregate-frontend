import { useState } from 'react'

// The CoopAggregate logo from public/: the SVG, then the PNG if the SVG is missing. When neither
// file exists nothing is shown, never a broken image. Decorative: the name is always written next
// to it, so the alt text is empty.
const SOURCES = ['/coopaggregate-logo.svg', '/coopaggregate-logo.png']

export default function Logo({ size }) {
  const [attempt, setAttempt] = useState(0)
  if (attempt >= SOURCES.length) return null

  return (
    <img
      src={SOURCES[attempt]}
      alt=""
      width={size}
      height={size}
      onError={() => setAttempt((current) => current + 1)}
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  )
}
