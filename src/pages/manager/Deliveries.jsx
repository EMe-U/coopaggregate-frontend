import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { listDeliveries } from '../../api/deliveries'
import GradeName from '../../components/GradeName'
import PageTitle from '../../components/PageTitle'
import Pagination from '../../components/Pagination'
import ConfirmationBadge from '../../components/deliveries/ConfirmationBadge'
import DeliveryActionsMenu from '../../components/deliveries/DeliveryActionsMenu'
import usePageSize from '../../hooks/usePageSize'
import useLotsWithSales from '../../hooks/useLotsWithSales'
import { formatDateTime, formatKg } from '../../utils/format'

const STATUSES = ['PENDING', 'CONFIRMED', 'DISPUTED']

// Deliveries filtered by confirmation status, opened from the dashboard's "Needs attention":
// /deliveries?status=DISPUTED, or /deliveries?status=PENDING&olderThanHours=48.
export default function Deliveries() {
  const { t } = useTranslation()
  const pageSize = usePageSize()
  const [searchParams] = useSearchParams()
  const status = STATUSES.includes(searchParams.get('status')) ? searchParams.get('status') : null
  const olderThanHours = Number(searchParams.get('olderThanHours')) || null

  const [page, setPage] = useState(0)
  const [result, setResult] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    setPage(0)
  }, [status, olderThanHours])

  useEffect(() => {
    let ignore = false
    setLoadError(false)
    const deliveredBefore = olderThanHours
      ? new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString()
      : undefined
    listDeliveries({ confirmationStatus: status, deliveredBefore, page, size: pageSize })
      .then((data) => {
        if (!ignore) setResult(data)
      })
      .catch(() => {
        if (!ignore) setLoadError(true)
      })
    return () => {
      ignore = true
    }
  }, [status, olderThanHours, page, pageSize, reloadKey])

  const deliveries = result?.content ?? []
  const lotsWithSales = useLotsWithSales(deliveries.map((delivery) => delivery.lotId), reloadKey)

  let title = t('deliveriesPage.title')
  if (status === 'DISPUTED') title = t('deliveriesPage.disputed')
  else if (status === 'PENDING' && olderThanHours) title = t('deliveriesPage.waitingOver', { count: olderThanHours })
  else if (status) title = t('deliveriesPage.withStatus', { status: t(`confirmation.badge.${status}`) })

  const cell = 'whitespace-nowrap px-3 py-3'

  return (
    <div className="space-y-6">
      <div>
        <Link to="/dashboard" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-primary">
          <ArrowLeft size={16} />
          {t('deliveriesPage.back')}
        </Link>
        <PageTitle className="mb-1">{title}</PageTitle>
        <p className="text-sm text-muted">{t('deliveriesPage.subtitle')}</p>
      </div>

      <section className="min-w-0 rounded-xl bg-surface p-5 shadow-sm">
        {loadError && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {t('deliveriesPage.error')}
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="min-h-11 font-medium underline"
            >
              {t('dashboard.retry')}
            </button>
          </div>
        )}
        {!loadError && !result && <div className="h-32 animate-pulse rounded-lg bg-background" />}
        {!loadError && result && deliveries.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">{t('deliveriesPage.empty')}</p>
        )}
        {!loadError && deliveries.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-background text-xs uppercase tracking-wide text-muted">
                  <tr>
                    {['receipt', 'member', 'grade', 'lot', 'kg', 'date', 'status', 'actions'].map((column) => (
                      <th key={column} className="whitespace-nowrap px-3 py-2 font-semibold">
                        {t(`deliveriesPage.columns.${column}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-text/5">
                  {deliveries.map((delivery) => (
                    <tr key={delivery.id}>
                      <td className={`${cell} font-mono text-primary`}>{delivery.receiptCode}</td>
                      <td className={cell}>
                        <Link to={`/members/${delivery.memberId}`} className="text-primary hover:underline">
                          {delivery.memberName}
                        </Link>
                      </td>
                      <td className={cell}>
                        <GradeName name={delivery.gradeName} />
                      </td>
                      <td className={cell}>
                        <Link to={`/lots/${delivery.lotId}`} className="font-mono text-xs text-primary hover:underline">
                          {delivery.lotCode}
                        </Link>
                      </td>
                      <td className={cell}>{formatKg(delivery.quantityKg)}</td>
                      <td className={`${cell} text-muted`}>{formatDateTime(delivery.deliveredAt)}</td>
                      <td className={cell}>
                        <ConfirmationBadge delivery={delivery} />
                      </td>
                      <td className="px-3 py-1">
                        <DeliveryActionsMenu
                          delivery={delivery}
                          lotHasSales={lotsWithSales.has(delivery.lotId)}
                          onChanged={() => setReloadKey((key) => key + 1)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination result={result} onPageChange={setPage} className="mt-3" />
          </>
        )}
      </section>
    </div>
  )
}
