import { useTranslation } from 'react-i18next'
import { CircleCheck } from 'lucide-react'

const styles = {
  PENDING: 'bg-background text-muted ring-1 ring-text/10',
  CONFIRMED: 'bg-primary-light text-primary',
  DISPUTED: 'bg-danger/10 text-danger',
}

// How a delivery was confirmed, from its confirmationMethod in the reader's language. The
// backend's confirmationLabel is only used for a method this app does not know yet.
export function confirmationMethodLabel(t, delivery) {
  if (!delivery.confirmationMethod) return delivery.confirmationLabel ?? null
  return t(`confirmation.method.${delivery.confirmationMethod}`, { defaultValue: delivery.confirmationLabel })
}

// Deliveries from before confirmations existed count as confirmed, but the member never confirmed
// them, so they get their own grey badge instead of "Confirmed".
function isRecordedBefore(delivery) {
  return delivery.confirmationStatus === 'CONFIRMED' && delivery.confirmationMethod === 'RECORDED_BEFORE_CONFIRMATION'
}

// Waiting, Confirmed, Recorded earlier or Disputed. Hovering shows how it was confirmed, or why it is
// disputed.
export default function ConfirmationBadge({ delivery }) {
  const { t } = useTranslation()
  const status = delivery.confirmationStatus
  if (!status) return null

  let title
  if (status === 'CONFIRMED') title = confirmationMethodLabel(t, delivery)
  if (status === 'DISPUTED') {
    const reason = t(`confirmation.disputeReason.${delivery.disputeReason}`, { defaultValue: delivery.disputeReason })
    title = delivery.disputeNote ? `${reason}: ${delivery.disputeNote}` : reason
  }
  const recordedBefore = isRecordedBefore(delivery)

  return (
    <span
      title={title ?? undefined}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${
        recordedBefore ? styles.PENDING : styles[status]
      } ${title ? 'cursor-help' : ''}`}
    >
      {status === 'CONFIRMED' && !recordedBefore && <CircleCheck size={12} />}
      {recordedBefore ? t('confirmation.badge.RECORDED_BEFORE_CONFIRMATION') : t(`confirmation.badge.${status}`)}
    </span>
  )
}
