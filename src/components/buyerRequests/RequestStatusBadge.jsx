import { useTranslation } from 'react-i18next'

const styles = {
  PENDING: 'bg-warning/15 text-amber-800',
  ACCEPTED: 'bg-primary-light text-primary',
  REJECTED: 'bg-danger/10 text-danger',
}

export default function RequestStatusBadge({ status }) {
  const { t } = useTranslation()
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? styles.PENDING}`}
    >
      {t(`buyerRequests.status.${status}`, { defaultValue: status })}
    </span>
  )
}
