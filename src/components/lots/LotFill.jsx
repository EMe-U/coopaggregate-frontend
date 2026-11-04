import { useTranslation } from 'react-i18next'
import { formatKg, formatNumber } from '../../utils/format'

// How full a fixed-size lot is ("72 / 100 kg") with a bar, and the shortfall a reversal left in a
// full lot (it is never filled again). An older lot has no size, so only its kg are shown.
export default function LotFill({ lot, withBar = true }) {
  const { t } = useTranslation()

  if (lot.olderLot || lot.capacityKg == null) return <span>{formatKg(lot.deliveredKg)}</span>

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
      {Number(lot.shortfallKg) > 0 && (
        <span title={t('lots.fill.shortfallHelp')} className="mt-1 block whitespace-nowrap text-xs text-amber-800">
          {t('lots.fill.shortfall', { kg: formatKg(lot.shortfallKg) })}
        </span>
      )}
    </span>
  )
}
