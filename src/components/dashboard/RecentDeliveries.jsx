import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { listDeliveries } from '../../api/deliveries'
import GradeName from '../GradeName'
import { formatDateTime, formatKg, formatTime, kigaliIsoDate } from '../../utils/format'

const RECENT_COUNT = 5

// The latest deliveries can be from an earlier day, so those also show their date.
function deliveryTime(deliveredAt) {
  const sameDay = kigaliIsoDate(new Date(deliveredAt)) === kigaliIsoDate()
  return sameDay ? formatTime(deliveredAt) : formatDateTime(deliveredAt)
}

export default function RecentDeliveries() {
  const { t } = useTranslation()
  const [deliveries, setDeliveries] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let ignore = false
    setLoadError(false)
    listDeliveries({ page: 0, size: RECENT_COUNT })
      .then((data) => {
        if (!ignore) setDeliveries(data.content)
      })
      .catch(() => {
        if (!ignore) setLoadError(true)
      })
    return () => {
      ignore = true
    }
  }, [retryKey])

  const cell = 'whitespace-nowrap px-3 py-3'

  return (
    <section className="min-w-0 rounded-xl bg-surface p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-text">{t('dashboard.recent.title')}</h2>
          <p className="text-sm text-muted">{t('dashboard.recent.subtitle')}</p>
        </div>
        <Link
          to="/record-delivery"
          className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {t('dashboard.recent.viewAll')}
          <ArrowRight size={14} />
        </Link>
      </div>

      {loadError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {t('dashboard.recent.error')}
          <button
            type="button"
            onClick={() => setRetryKey((key) => key + 1)}
            className="min-h-11 font-medium underline"
          >
            {t('dashboard.retry')}
          </button>
        </div>
      )}

      {!loadError && !deliveries && (
        <div className="space-y-2">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-10 animate-pulse rounded bg-background" />
          ))}
        </div>
      )}

      {!loadError && deliveries?.length === 0 && (
        <p className="py-8 text-center text-sm text-muted">{t('dashboard.recent.empty')}</p>
      )}

      {!loadError && deliveries?.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs font-semibold text-muted">
              <tr className="border-b border-text/10">
                {['receipt', 'member', 'grade', 'kg', 'time'].map((column) => (
                  <th key={column} className={`whitespace-nowrap px-3 py-2 ${column === 'kg' ? 'text-right' : ''}`}>
                    {t(`dashboard.recent.${column}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-text/5">
              {deliveries.map((delivery) => (
                <tr key={delivery.id}>
                  <td className={`${cell} font-mono text-xs font-semibold`}>{delivery.receiptCode}</td>
                  <td className={cell}>
                    <Link to={`/members/${delivery.memberId}`} className="text-primary hover:underline">
                      {delivery.memberName}
                    </Link>
                  </td>
                  <td className={cell}>
                    <span className="rounded-md bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
                      <GradeName name={delivery.gradeName} />
                    </span>
                  </td>
                  <td className={`${cell} text-right`}>{formatKg(delivery.quantityKg)}</td>
                  <td className={`${cell} text-muted`}>{deliveryTime(delivery.deliveredAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
