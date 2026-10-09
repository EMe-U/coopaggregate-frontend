import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TriangleAlert } from 'lucide-react'
import { listDeliveries } from '../../api/deliveries'
import { kigaliIsoDate } from '../../utils/format'

const WINDOW_MINUTES = 15

// Warns only; the manager can still save. The API filters by whole days, so this asks for the
// days the last 15 minutes fall on (two days just after midnight) and keeps the recent ones.
export default function DuplicateWarning({ memberId }) {
  const { t } = useTranslation()
  const [recent, setRecent] = useState(null)

  useEffect(() => {
    setRecent(null)
    if (!memberId) return

    let ignore = false
    const now = Date.now()
    const windowStart = now - WINDOW_MINUTES * 60 * 1000

    listDeliveries({
      memberId,
      from: kigaliIsoDate(new Date(windowStart)),
      to: kigaliIsoDate(new Date(now)),
      size: 20,
    })
      .then((data) => {
        // Newest first, so the first match is the latest delivery.
        const latest = data.content.find((delivery) => new Date(delivery.deliveredAt).getTime() >= windowStart)
        if (!ignore && latest) {
          const minutesAgo = Math.max(1, Math.round((now - new Date(latest.deliveredAt).getTime()) / 60000))
          setRecent({ kg: latest.quantityKg, minutesAgo })
        }
      })
      // The warning is a convenience; if the check fails the form still works.
      .catch(() => {})

    return () => {
      ignore = true
    }
  }, [memberId])

  if (!recent) return null

  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg bg-danger/10 p-4 text-sm text-danger">
      <TriangleAlert size={20} className="mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold">{t('deliveries.duplicate.title')}</p>
        <p>{t('deliveries.duplicate.message', { kg: recent.kg, count: recent.minutesAgo })}</p>
      </div>
    </div>
  )
}
