import { useTranslation } from 'react-i18next'

const styles = {
  FILLING: 'bg-primary-light text-primary',
  FULL: 'bg-sky-100 text-sky-800',
  SOLD: 'bg-warning/15 text-amber-800',
  OLDER: 'bg-background text-muted',
}

// A label only, with a tooltip that explains the status. Actions on a lot live in its ⋮ menu. A lot
// from before fixed-size lots shows "Older lot"; its own status is in the tooltip.
export default function LotStatusBadge({ status, olderLot }) {
  const { t } = useTranslation()
  const key = olderLot ? 'OLDER' : status
  const title = olderLot
    ? `${t('lots.statusHelp.OLDER')} (${t(`lots.status.${status}`, { defaultValue: status })})`
    : t(`lots.statusHelp.${status}`, { defaultValue: '' })

  return (
    <span
      title={title || undefined}
      className={`inline-block cursor-default whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[key] ?? styles.OLDER}`}
    >
      {t(`lots.status.${key}`, { defaultValue: status })}
    </span>
  )
}
