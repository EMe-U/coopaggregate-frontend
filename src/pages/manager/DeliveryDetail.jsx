import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ReceiptText, SearchX } from 'lucide-react'
import { getDelivery } from '../../api/deliveries'
import EmptyState from '../../components/EmptyState'
import GradeName from '../../components/GradeName'
import ReversedBadge from '../../components/ReversedBadge'
import ConfirmationBadge, { confirmationMethodLabel } from '../../components/deliveries/ConfirmationBadge'
import DeliveryActionsMenu from '../../components/deliveries/DeliveryActionsMenu'
import DeliveryConfirmation from '../../components/deliveries/DeliveryConfirmation'
import DeliveryHistoryNote from '../../components/deliveries/DeliveryHistoryNote'
import useLinkedDeliveries from '../../hooks/useLinkedDeliveries'
import useLotsWithSales from '../../hooks/useLotsWithSales'
import { formatDateTime, formatKg, formatMoney } from '../../utils/format'

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-text">{children}</dd>
    </div>
  )
}

export default function DeliveryDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const [delivery, setDelivery] = useState(null)
  const [loadState, setLoadState] = useState('loading')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false
    setLoadState('loading')
    getDelivery(id)
      .then((data) => {
        if (ignore) return
        setDelivery(data)
        setLoadState('loaded')
      })
      .catch((error) => {
        if (!ignore) setLoadState(error.response?.status === 404 ? 'notFound' : 'error')
      })
    return () => {
      ignore = true
    }
  }, [id, reloadKey])

  const linked = useLinkedDeliveries(delivery ? [delivery] : [])
  const lotsWithSales = useLotsWithSales(delivery ? [delivery.lotId] : [], reloadKey)

  // A correction is a new delivery with its own code, so the page moves to it.
  function handleChanged(updated) {
    if (updated && updated.id !== delivery.id) navigate(`/deliveries/${updated.id}`)
    else if (updated) setDelivery(updated)
    else setReloadKey((key) => key + 1)
  }

  const backLink = (
    <Link to="/record-delivery" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-primary">
      <ArrowLeft size={16} />
      {t('deliveryDetail.back')}
    </Link>
  )

  if (loadState === 'notFound' || loadState === 'error') {
    return (
      <div className="rounded-xl bg-surface shadow-sm">
        <EmptyState
          icon={SearchX}
          title={loadState === 'notFound' ? t('deliveryDetail.notFound') : t('deliveryDetail.error')}
        >
          <div className="flex flex-col items-center gap-3">
            {loadState === 'error' && (
              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
                className="min-h-11 rounded-lg border border-text/10 px-4 text-sm font-medium text-primary hover:bg-background"
              >
                {t('dashboard.retry')}
              </button>
            )}
            {backLink}
          </div>
        </EmptyState>
      </div>
    )
  }

  if (loadState === 'loading') return <div className="h-64 animate-pulse rounded-xl bg-surface shadow-sm" />

  const waiting = delivery.confirmationStatus === 'PENDING' && !delivery.reversed

  return (
    <div className="space-y-6">
      {backLink}

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="min-w-0 rounded-xl bg-surface p-5 shadow-sm lg:col-span-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="flex items-center gap-2 text-lg font-semibold text-text">
              <ReceiptText size={20} className="text-primary" />
              <span className={`font-mono ${delivery.reversed ? 'line-through' : ''}`}>{delivery.receiptCode}</span>
            </h1>
            <DeliveryActionsMenu
              delivery={delivery}
              lotHasSales={lotsWithSales.has(delivery.lotId)}
              onChanged={() => setReloadKey((key) => key + 1)}
              onDetailPage
            />
          </div>
          <DeliveryHistoryNote delivery={delivery} linked={linked} />

          <dl className="mt-4 divide-y divide-text/5 text-sm">
            <Row label={t('deliveryDetail.member')}>
              <Link to={`/members/${delivery.memberId}`} className="text-primary hover:underline">
                {delivery.memberName}
              </Link>
              <span className="block text-xs font-normal text-muted">{delivery.memberNumber}</span>
            </Row>
            <Row label={t('deliveryDetail.grade')}>
              <GradeName name={delivery.gradeName} />
            </Row>
            <Row label={t('deliveryDetail.lot')}>
              <Link to={`/lots/${delivery.lotId}`} className="font-mono text-primary hover:underline">
                {delivery.lotCode}
              </Link>
            </Row>
            <Row label={t('deliveryDetail.quantity')}>{formatKg(delivery.quantityKg)}</Row>
            <Row label={t('deliveryDetail.deduction')}>{formatMoney(delivery.deductionRwf)}</Row>
            <Row label={t('deliveryDetail.deliveredAt')}>{formatDateTime(delivery.deliveredAt)}</Row>
            <Row label={t('confirmation.status')}>
              {delivery.reversed ? (
                <ReversedBadge reason={delivery.reversalReason} />
              ) : (
                <ConfirmationBadge delivery={delivery} />
              )}
              {waiting && (
                <span className="mt-1 block text-xs font-normal text-muted">{t('codeConfirmation.waitingForMember')}</span>
              )}
              {delivery.confirmationStatus === 'CONFIRMED' && (
                <span className="mt-1 block text-xs font-normal text-muted">
                  {confirmationMethodLabel(t, delivery)}
                  {delivery.confirmedAt && ` · ${formatDateTime(delivery.confirmedAt)}`}
                </span>
              )}
            </Row>
            {delivery.disputeReason && (
              <Row label={t('deliveryDetail.dispute')}>
                {t(`confirmation.disputeReason.${delivery.disputeReason}`, { defaultValue: delivery.disputeReason })}
                {delivery.disputeNote && (
                  <span className="block text-xs font-normal text-muted">{delivery.disputeNote}</span>
                )}
              </Row>
            )}
            {delivery.resolutionNote && (
              <Row label={t('deliveryDetail.resolution')}>
                <span className="font-normal">{delivery.resolutionNote}</span>
              </Row>
            )}
          </dl>
        </section>

        {waiting && (
          <section className="min-w-0 rounded-xl bg-surface p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-4 font-semibold text-text">{t('deliveryDetail.confirmTitle')}</h2>
            <DeliveryConfirmation delivery={delivery} onChanged={handleChanged} />
          </section>
        )}
      </div>
    </div>
  )
}
