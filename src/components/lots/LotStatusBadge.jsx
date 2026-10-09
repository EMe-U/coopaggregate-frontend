import { useTranslation } from 'react-i18next'

const styles = {
  OPEN: 'bg-primary-light text-primary',
  CLOSED: 'bg-sky-100 text-sky-800',
  SOLD: 'bg-warning/15 text-amber-800',
  SHARED: 'bg-background text-muted',
}

export default function LotStatusBadge({ status }) {
  const { t } = useTranslation()

  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {t(`lots.status.${status}`)}
    </span>
  )
}
