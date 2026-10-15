import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { listDeliveries } from '../../api/deliveries'
import useOnlineStatus from '../../hooks/useOnlineStatus'
import useLotsWithSales from '../../hooks/useLotsWithSales'
import usePageSize from '../../hooks/usePageSize'
import usePendingDeliveries from '../../hooks/usePendingDeliveries'
import { temporaryReference } from '../../offline/pending'
import { syncedDelivery } from '../../offline/sync'
import GradeName from '../GradeName'
import DeliveryActionsMenu from './DeliveryActionsMenu'
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

const syncStyles = {
  WAITING: 'bg-warning/15 text-text',
  SYNCING: 'bg-primary-light text-primary',
  FAILED: 'bg-danger/10 text-danger',
  SYNCED: 'bg-primary-light text-primary',
}

function SyncBadge({ status }) {
  const { t } = useTranslation()
  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${syncStyles[status]}`}>
      {t(`offline.status.${status}`)}
    </span>
  )
}

export default function TodayDeliveries({ reloadKey }) {
  const { t } = useTranslation()
  const pageSize = usePageSize()
  const isOnline = useOnlineStatus()
  const pending = usePendingDeliveries()
  const [page, setPage] = useState(0)
  const [result, setResult] = useState(null)
  const [totalKg, setTotalKg] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  // When a delivery leaves the queue (synced or discarded), reload so a synced one appears with
  // its receipt code and lot.
  const pendingCount = pending?.length
  const previousPendingCount = useRef(pendingCount)
  useEffect(() => {
    if (pendingCount < previousPendingCount.current) setRetryKey((key) => key + 1)
    previousPendingCount.current = pendingCount
  }, [pendingCount])

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
  }, [page, pageSize, reloadKey, retryKey, isOnline])

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
  }, [reloadKey, retryKey, isOnline])

  const deliveries = result?.content
  const lotsWithSales = useLotsWithSales((deliveries ?? []).map((delivery) => delivery.lotId), retryKey)
  // Deliveries waiting on this device go on top of the first page. One that has just synced can
  // be in both lists for a moment; the server row wins.
  const serverIds = new Set((deliveries ?? []).map((delivery) => delivery.id))
  const waiting =
    page === 0 && pending
      ? pending.filter((delivery) => !serverIds.has(syncedDelivery(delivery.clientUuid)?.id))
      : []
  const hasRows = waiting.length > 0 || deliveries?.length > 0

  const cell = 'whitespace-nowrap px-3 py-3'

  return (
    <section className="min-w-0 rounded-xl bg-surface p-5 shadow-sm print:hidden">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-text">{t('deliveries.today.title')}</h2>
        {result && totalKg !== null && !loadError && (
          <p className="text-sm text-muted">
            {t('deliveries.today.total', { kg: formatKg(totalKg), count: result.totalElements })}
          </p>
        )}
      </div>

      {loadError && !isOnline && (
        <p className="mb-3 rounded-lg bg-background px-3 py-2 text-sm text-muted">{t('offline.todayOffline')}</p>
      )}
      {loadError && isOnline && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
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

      {!loadError && !deliveries && waiting.length === 0 && (
        <div className="space-y-2">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-10 animate-pulse rounded bg-background" />
          ))}
        </div>
      )}

      {!loadError && deliveries?.length === 0 && waiting.length === 0 && (
        <p className="py-8 text-center text-sm text-muted">{t('deliveries.today.empty')}</p>
      )}

      {hasRows && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-background text-xs uppercase tracking-wide text-muted">
              <tr>
                {['code', 'member', 'grade', 'lot', 'kg', 'deduction', 'time', 'sync', 'actions'].map((column) => (
                  <th key={column} className="whitespace-nowrap px-3 py-2 font-semibold">
                    {column === 'sync' ? t('offline.syncColumn') : t(`deliveries.today.${column}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-text/5">
              {waiting.map((delivery) => (
                <tr key={delivery.clientUuid} className="bg-warning/5">
                  <td className={`${cell} font-mono text-muted`}>{temporaryReference(delivery.clientUuid)}</td>
                  <td className={cell}>{delivery.memberName}</td>
                  <td className={cell}>
                    <span className="rounded-md bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
                      <GradeName name={delivery.gradeName} />
                    </span>
                  </td>
                  <td className={`${cell} text-muted`}>–</td>
                  <td className={cell}>{formatKg(delivery.payload.quantityKg)}</td>
                  <td className={`${cell} text-muted`}>–</td>
                  <td className={cell}>{formatTime(delivery.payload.deliveredAt)}</td>
                  <td className={cell}>
                    <SyncBadge status={delivery.status} />
                  </td>
                  <td className={cell}>
                    <Link
                      to={`/members/${delivery.payload.memberId}`}
                      className="inline-flex min-h-11 items-center font-medium text-primary hover:underline"
                    >
                      {t('deliveries.today.view')}
                    </Link>
                  </td>
                </tr>
              ))}
              {(deliveries ?? []).map((delivery) => (
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
                    <SyncBadge status="SYNCED" />
                  </td>
                  <td className={cell}>
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/members/${delivery.memberId}`}
                        className="inline-flex min-h-11 items-center font-medium text-primary hover:underline"
                      >
                        {t('deliveries.today.view')}
                      </Link>
                      <DeliveryActionsMenu
                        delivery={delivery}
                        lotHasSales={lotsWithSales.has(delivery.lotId)}
                        onChanged={() => setRetryKey((key) => key + 1)}
                      />
                    </div>
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
