import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { listDeliveries } from '../../api/deliveries'
import usePageSize from '../../hooks/usePageSize'
import GradeName from '../GradeName'
import Pagination from '../Pagination'
import { formatKg, formatMoney, formatTime, kigaliIsoDate } from '../../utils/format'

const TOTAL_PAGE_SIZE = 100

// The table shows one page, but the total covers the whole day, so it reads every page.
// Kilograms are added for display only; no money is calculated here.
async function loadDayKg(day) {
  let totalKg = 0
  let page = 0
  let totalPages = 1
  while (page < totalPages) {
    const data = await listDeliveries({ from: day, to: day, page, size: TOTAL_PAGE_SIZE })
    totalKg += data.content.reduce((sum, delivery) => sum + Number(delivery.quantityKg), 0)
    totalPages = data.totalPages
    page++
  }
  return Math.round(totalKg * 100) / 100
}

export default function TodayDeliveries({ reloadKey }) {
  const { t } = useTranslation()
  const pageSize = usePageSize()
  const [page, setPage] = useState(0)
  const [result, setResult] = useState(null)
  const [totalKg, setTotalKg] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  // A new delivery appears at the top, so go back to the first page after saving one.
  useEffect(() => {
    setPage(0)
  }, [reloadKey])

  useEffect(() => {
    let ignore = false
    setLoadError(false)
    listDeliveries({ from: kigaliIsoDate(), to: kigaliIsoDate(), page, size: pageSize })
      .then((data) => {
        if (!ignore) setResult(data)
      })
      .catch(() => {
        if (!ignore) setLoadError(true)
      })
    return () => {
      ignore = true
    }
  }, [page, pageSize, reloadKey, retryKey])

  useEffect(() => {
    let ignore = false
    loadDayKg(kigaliIsoDate())
      .then((kg) => {
        if (!ignore) setTotalKg(kg)
      })
      // The total is extra information; the table still shows without it.
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [reloadKey, retryKey])

  const deliveries = result?.content

  const cell = 'whitespace-nowrap px-3 py-3'

  return (
    <section className="min-w-0 rounded-xl bg-surface p-5 shadow-sm print:hidden">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-text">{t('deliveries.today.title')}</h2>
        {result && totalKg !== null && (
          <p className="text-sm text-muted">
            {t('deliveries.today.total', { kg: formatKg(totalKg), count: result.totalElements })}
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
      {!loadError && result && <Pagination result={result} onPageChange={setPage} className="mt-3" />}
    </section>
  )
}
