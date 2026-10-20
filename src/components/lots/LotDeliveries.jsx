import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { listDeliveries } from '../../api/deliveries'
import usePageSize from '../../hooks/usePageSize'
import useLinkedDeliveries from '../../hooks/useLinkedDeliveries'
import { formatDateTime, formatKg } from '../../utils/format'
import Pagination from '../Pagination'
import ConfirmationBadge from '../deliveries/ConfirmationBadge'
import DeliveryActionsMenu from '../deliveries/DeliveryActionsMenu'
import DeliveryHistoryNote, { deliveryRowId } from '../deliveries/DeliveryHistoryNote'

// Every delivery in the lot, including reversed ones, with its confirmation status.
// onChanged runs after a delivery was changed, so the lot's totals reload too.
export default function LotDeliveries({ lot, reloadKey, onChanged }) {
  const { t } = useTranslation()
  const pageSize = usePageSize()
  const [page, setPage] = useState(0)
  const [result, setResult] = useState(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let ignore = false
    setLoadError(false)
    listDeliveries({ lotId: lot.id, includeReversed: true, page, size: pageSize })
      .then((data) => {
        if (!ignore) setResult(data)
      })
      .catch(() => {
        if (!ignore) setLoadError(true)
      })
    return () => {
      ignore = true
    }
  }, [lot.id, page, pageSize, reloadKey])

  const deliveries = result?.content ?? []
  const linked = useLinkedDeliveries(deliveries)
  const cell = 'whitespace-nowrap px-3 py-2'

  if (loadError) return <p className="py-4 text-center text-sm text-danger">{t('lots.detail.deliveriesError')}</p>
  if (!result) return <div className="h-24 animate-pulse rounded-lg bg-background" />
  if (deliveries.length === 0) return <p className="py-4 text-center text-sm text-muted">{t('lots.detail.noDeliveries')}</p>

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-background text-xs text-muted">
            <tr>
              {['receipt', 'member', 'kg', 'date', 'status', 'actions'].map((column) => (
                <th key={column} className="whitespace-nowrap px-3 py-2 font-semibold">
                  {t(`lots.detail.deliveryColumns.${column}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-text/5">
            {deliveries.map((delivery) => (
              <tr
                key={delivery.id}
                id={deliveryRowId(delivery.id)}
                className={`target:bg-warning/20 ${delivery.reversed ? 'opacity-60' : ''}`}
              >
                <td className={`${cell} font-mono text-xs`}>
                  <span className={delivery.reversed ? 'line-through' : undefined}>{delivery.receiptCode}</span>
                  <DeliveryHistoryNote delivery={delivery} linked={linked} />
                </td>
                <td className={cell}>
                  <Link to={`/members/${delivery.memberId}`} className="text-primary hover:underline">
                    {delivery.memberName}
                  </Link>
                </td>
                <td className={cell}>{formatKg(delivery.quantityKg)}</td>
                <td className={`${cell} text-muted`}>{formatDateTime(delivery.deliveredAt)}</td>
                <td className={cell}>{!delivery.reversed && <ConfirmationBadge delivery={delivery} />}</td>
                <td className="px-3 py-1">
                  <DeliveryActionsMenu delivery={delivery} lotHasSales={Number(lot.soldKg) > 0} onChanged={onChanged} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination result={result} onPageChange={setPage} className="mt-3" />
    </>
  )
}
