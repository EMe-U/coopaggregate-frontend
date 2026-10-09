import { useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'

const VISIBLE_MS = 3000

export default function SuccessToast({ message, onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [message, onDone])

  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white shadow-lg print:hidden"
    >
      <CheckCircle2 size={18} />
      {message}
    </div>
  )
}
