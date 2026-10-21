import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ReversedBadge from '../ReversedBadge'

// The id rows are given, so a link to a delivery on the same page can jump to it.
export function deliveryRowId(id) {
  return `delivery-${id}`
}

// Jumps to the delivery when it is on this page, otherwise opens its delivery page.
function DeliveryLink({ target }) {
  if (!target) return <span className="text-muted">…</span>
  const className = 'font-mono text-primary hover:underline'
  return target.onPage ? (
    <a href={`#${deliveryRowId(target.id)}`} className={className}>
      {target.receiptCode}
    </a>
  ) : (
    <Link to={`/deliveries/${target.id}`} className={className}>
      {target.receiptCode}
    </Link>
  )
}

// Shown under a delivery's receipt code: reversed, and the link between a corrected delivery and
// the one it replaced. linked comes from useLinkedDeliveries.
export default function DeliveryHistoryNote({ delivery, linked }) {
  const { t } = useTranslation()
  if (!delivery.reversed && delivery.correctsId == null) return null

  return (
    <div className="mt-1 flex flex-col items-start gap-0.5 font-sans text-xs font-normal">
      {delivery.reversed && <ReversedBadge reason={delivery.reversalReason} />}
      {delivery.correctedById != null && (
        <span className="text-muted">
          {t('reversal.delivery.correctedBy')} <DeliveryLink target={linked(delivery.correctedById)} />
        </span>
      )}
      {delivery.correctsId != null && (
        <span className="text-muted">
          {t('reversal.delivery.corrects')} <DeliveryLink target={linked(delivery.correctsId)} />
        </span>
      )}
    </div>
  )
}
