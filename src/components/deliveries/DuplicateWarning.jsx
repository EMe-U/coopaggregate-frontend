import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TriangleAlert } from 'lucide-react'
import { listDeliveries } from '../../api/deliveries'
import { listPending } from '../../offline/db'
import { kigaliIsoDate } from '../../utils/format'

const WINDOW_MINUTES = 15

// The API filters by whole days, so this asks for the days the last 15 minutes fall on (two days
// just after midnight). Without internet only the deliveries waiting on this device are checked.
function serverDeliveries(memberId, windowStart, now) {
  if (!navigator.onLine) return Promise.resolve([])
  return listDeliveries({
    memberId,
    from: kigaliIsoDate(new Date(windowStart)),
    to: kigaliIsoDate(new Date(now)),
    size: 20,
  }).then((data) => data.content.map((delivery) => ({ kg: delivery.quantityKg, at: delivery.deliveredAt })))
}

function waitingDeliveries(memberId) {
  return listPending().then((deliveries) =>
    deliveries
      .filter((delivery) => delivery.payload.memberId === memberId)
      .map((delivery) => ({ kg: delivery.payload.quantityKg, at: delivery.payload.deliveredAt })),
  )
}

// Warns only; the manager can still save. Checks saved deliveries and those waiting to sync.
export default function DuplicateWarning({ memberId }) {
  const { t } = useTranslation()
  const [recent, setRecent] = useState(null)

  useEffect(() => {
    setRecent(null)
    if (!memberId) return

    let ignore = false
    const now = Date.now()
    const windowStart = now - WINDOW_MINUTES * 60 * 1000

    // The warning is a convenience; if a check fails the form still works.
    Promise.all([
      serverDeliveries(memberId, windowStart, now).catch(() => []),
      waitingDeliveries(memberId).catch(() => []),
    ]).then(([saved, waiting]) => {
      const latest = [...saved, ...waiting]
        .map((delivery) => ({ ...delivery, time: new Date(delivery.at).getTime() }))
        .filter((delivery) => delivery.time >= windowStart)
        .sort((a, b) => b.time - a.time)[0]
      if (!ignore && latest) {
        const minutesAgo = Math.max(1, Math.round((now - latest.time) / 60000))
        setRecent({ kg: latest.kg, minutesAgo })
      }
    })

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
