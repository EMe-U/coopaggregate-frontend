import { useTranslation } from 'react-i18next'

const styles = {
  PENDING: 'bg-background text-muted ring-1 ring-text/10',
  CONFIRMED: 'bg-primary-light text-primary',
  DISPUTED: 'bg-danger/10 text-danger',
}

// Waiting, Confirmed or Disputed. Hovering shows how it was confirmed, or why it is disputed.
export default function ConfirmationBadge({ delivery }) {
  const { t } = useTranslation()
  const status = delivery.confirmationStatus
  if (!status) return null

  let title
  if (status === 'CONFIRMED' && delivery.confirmationMethod) {
    title = t(`confirmation.method.${delivery.confirmationMethod}`, { defaultValue: delivery.confirmationLabel })
  }
  if (status === 'DISPUTED') {
    const reason = t(`confirmation.disputeReason.${delivery.disputeReason}`, { defaultValue: delivery.disputeReason })
    title = delivery.disputeNote ? `${reason}: ${delivery.disputeNote}` : reason
  }

  return (
    <span
      title={title}
      className={`inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${styles[status]} ${title ? 'cursor-help' : ''}`}
    >
      {t(`confirmation.badge.${status}`)}
    </span>
  )
}
