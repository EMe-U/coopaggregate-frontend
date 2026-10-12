import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { listDeliveries } from '../../api/deliveries'
import GradeName from '../GradeName'
import { formatKg, formatMoney, formatTime, kigaliIsoDate } from '../../utils/format'

const PAGE_SIZE = 100

// Loads every page so the total covers the whole day, not only the first page.
async function loadDay(day) {
  const deliveries = []
  let page = 0
  let totalPages = 1
  while (page < totalPages) {
    const data = await listDeliveries({ from: day, to: day, page, size: PAGE_SIZE })
    deliveries.push(...data.content)
    totalPages = data.totalPages
    page++
  }
  return deliveries
}

export default function TodayDeliveries({ reloadKey }) {
  const { t } = useTranslation()
  const [deliveries, setDeliveries] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let ignore = false
    setLoadError(false)
    loadDay(kigaliIsoDate())
      .then((data) => {
        if (!ignore) setDeliveries(data)
      })
      .catch(() => {
        if (!ignore) setLoadError(true)
      })
    return () => {
      ignore = true
    }
  }, [reloadKey, retryKey])

  // Kilograms are added for display only; no money is calculated here.
  const totalKg = deliveries
    ? Math.round(deliveries.reduce((sum, delivery) => sum + Number(delivery.quantityKg), 0) * 100) / 100
    : 0

  const cell = 'whitespace-nowrap px-3 py-3'

  return (
    <section className="min-w-0 rounded-xl bg-surface p-5 shadow-sm print:hidden">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-text">{t('deliveries.today.title')}</h2>
        {deliveries && (
          <p className="text-sm text-muted">
            {t('deliveries.today.total', { kg: formatKg(totalKg), count: deliveries.length })}
          </p>
        )}
      </div>

      {loadError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {t('deliveries.today.error')}
          <button
            type="button"
            onClick={() => setRetryKey((key) => key + 1)}
            className="min-h-11 font-medium underline"
          >
            {t('deliveries.today.retry')}
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
        <p className="py-8 text-center text-sm text-muted">{t('deliveries.today.empty')}</p>
      )}

      {!loadError && deliveries?.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-background text-xs uppercase tracking-wide text-muted">
              <tr>
                {['code', 'member', 'grade', 'lot', 'kg', 'deduction', 'time', 'actions'].map((column) => (
                  <th key={column} className="whitespace-nowrap px-3 py-2 font-semibold">
                    {t(`deliveries.today.${column}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-text/5">
              {deliveries.map((delivery) => (
                <tr key={delivery.id}>
                  <td className={`${cell} font-mono text-primary`}>{delivery.receiptCode}</td>
                  <td className={cell}>{delivery.memberName}</td>
                  <td className={cell}>
                    <span className="rounded-md bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
                      <GradeName name={delivery.gradeName} />
                    </span>
                  </td>
                  <td className={`${cell} font-mono text-xs`}>{delivery.lotCode}</td>
                  <td className={cell}>{formatKg(delivery.quantityKg)}</td>
                  <td className={cell}>{formatMoney(delivery.deductionRwf)}</td>
                  <td className={cell}>{formatTime(delivery.deliveredAt)}</td>
                  <td className={cell}>
                    <Link
                      to={`/members/${delivery.memberId}`}
                      className="inline-flex min-h-11 items-center font-medium text-primary hover:underline"
                    >
                      {t('deliveries.today.view')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
