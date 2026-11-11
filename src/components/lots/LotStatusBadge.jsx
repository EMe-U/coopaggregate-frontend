import { useTranslation } from 'react-i18next'

// Every status the backend has. Any other is shown as "Other status", with its name in the tooltip.
const KNOWN_STATUSES = ['OPEN', 'CLOSED', 'SOLD', 'SHARED', 'FILLING', 'FULL', 'EMPTIED']

const styles = {
  FILLING: 'bg-primary-light text-primary',
  FULL: 'bg-sky-100 text-sky-800',
  SOLD: 'bg-warning/15 text-amber-800',
  // Nothing was sold from it: neutral, not the Sold colour.
  EMPTIED: 'bg-slate-200 text-slate-700',
  OLDER: 'bg-background text-muted',
}

// The name of a lot status in the chosen language, or "Other status" for one this page does not know.
export function lotStatusLabel(t, status) {
  return KNOWN_STATUSES.includes(status) ? t(`lots.status.${status}`) : t('lots.status.unknown')
}

// A label only, with a tooltip that explains the status. Actions on a lot live in its ⋮ menu. A lot
// from before fixed-size lots shows "Older lot"; its own status is in the tooltip.
export default function LotStatusBadge({ status, olderLot }) {
  const { t } = useTranslation()
  const known = KNOWN_STATUSES.includes(status)
  const key = olderLot ? 'OLDER' : status

  let label = lotStatusLabel(t, status)
  let title = known ? t(`lots.statusHelp.${status}`, { defaultValue: '' }) : t('lots.statusHelp.unknown', { status })
  if (olderLot) {
    label = t('lots.status.OLDER')
    title = `${t('lots.statusHelp.OLDER')} (${lotStatusLabel(t, status)})`
  }

  return (
    <span
      title={title || undefined}
      className={`inline-block cursor-default whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[key] ?? styles.OLDER}`}
    >
      {label}
    </span>
  )
}
