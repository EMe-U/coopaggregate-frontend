import { useTranslation } from 'react-i18next'
import { formatKg, formatNumber } from '../../utils/format'

// How full a fixed-size lot is ("72 / 100 kg") with a bar, and the shortfall a reversal left in a
// full lot (it is never filled again). An older lot has no size, so only its kg are shown. A sold
// lot has nothing left, so it shows "Sold out" and the kg sold instead of a full bar; an emptied lot
// shows "0 of 100 kg" only: its deliveries were taken back, so nothing is short.
export default function LotFill({ lot, withBar = true }) {
  const { t } = useTranslation()

  if (lot.olderLot || lot.capacityKg == null) return <span>{formatKg(lot.deliveredKg)}</span>

  if (lot.status === 'EMPTIED') {
    return (
      <span className="block whitespace-nowrap text-muted">
        {t('lots.fill.emptied', { capacity: formatNumber(lot.capacityKg) })}
      </span>
    )
  }

  const shortfall = Number(lot.shortfallKg) > 0 && (
    <span title={t('lots.fill.shortfallHelp')} className="mt-1 block whitespace-nowrap text-xs text-amber-800">
      {t('lots.fill.shortfall', { kg: formatKg(lot.shortfallKg) })}
    </span>
  )

  if (lot.status === 'SOLD') {
    const soldOut = !(Number(lot.remainingKg) > 0)
    return (
      <span className="block min-w-24">
        {soldOut && <span className="block whitespace-nowrap font-medium text-amber-800">{t('lots.fill.soldOut')}</span>}
        <span className={`block whitespace-nowrap ${soldOut ? 'text-xs text-muted' : ''}`}>
          {t('lots.fill.soldKg', { kg: formatKg(lot.soldKg) })}
        </span>
        {shortfall}
      </span>
    )
  }

  const capacity = Number(lot.capacityKg)
  const percent = capacity > 0 ? Math.min(100, (Number(lot.deliveredKg) / capacity) * 100) : 0
  return (
    <span className="block min-w-24">
      <span className="whitespace-nowrap">
        {t('lots.fill.value', { filled: formatNumber(lot.deliveredKg), capacity: formatNumber(lot.capacityKg) })}
      </span>
      {withBar && (
        <span
          role="meter"
          aria-valuemin={0}
          aria-valuemax={capacity}
          aria-valuenow={Number(lot.deliveredKg)}
          aria-label={t('lots.fill.label')}
          className="mt-1 block h-1.5 overflow-hidden rounded-full bg-text/10"
        >
          <span
            className={`block h-full rounded-full ${lot.status === 'FILLING' ? 'bg-primary' : 'bg-sky-600'}`}
            style={{ width: `${percent}%` }}
          />
        </span>
      )}
      {shortfall}
    </span>
  )
}
