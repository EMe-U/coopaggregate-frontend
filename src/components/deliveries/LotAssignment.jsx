import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import { findOpenLot } from '../../api/lots'
import { getSettings } from '../../api/settings'
import useOnlineStatus from '../../hooks/useOnlineStatus'
import { formatMoney, formatNumber } from '../../utils/format'
import { DEDUCTION_PER_KG_PREVIEW, previewDeduction } from '../../utils/deduction'

// The lot size: the capacity of the grade's lot being filled, or else the lot size setting (the
// next lot starts with it). Null when neither can be read, for example offline.
function useLotSize(gradeId, isOnline) {
  const [settingSize, setSettingSize] = useState(null)
  const [lotSize, setLotSize] = useState(null)

  useEffect(() => {
    if (!isOnline) return undefined
    let ignore = false
    getSettings()
      .then((settings) => {
        if (!ignore) setSettingSize(settings.lotSizeKg ?? null)
      })
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [isOnline])

  useEffect(() => {
    setLotSize(null)
    if (!gradeId || !isOnline) return undefined
    let ignore = false
    findOpenLot(gradeId)
      .then((openLot) => {
        if (!ignore) setLotSize(openLot?.capacityKg ?? null)
      })
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [gradeId, isOnline])

  return lotSize ?? settingSize
}

// A delivery is in no lot until the member confirms it; then the system puts its kilos into the
// lots of its grade, first in first out, splitting it across lots when one fills up.
export default function LotAssignment({ gradeId, quantityKg }) {
  const { t } = useTranslation()
  const isOnline = useOnlineStatus()
  const lotSize = useLotSize(gradeId, isOnline)

  return (
    <div className="rounded-lg bg-primary-light p-4 text-sm text-primary">
      <p className="flex items-center gap-2 font-semibold">
        <Info size={16} />
        {t('deliveries.lot.title')}
      </p>
      <div className="mt-2 space-y-1 pl-6">
        <p>
          {lotSize != null
            ? t('deliveries.lot.entersLot', { capacity: formatNumber(lotSize) })
            : t('deliveries.lot.entersLotNoSize')}
        </p>
        <p>
          {quantityKg
            ? t('deliveries.lot.deduction', {
                kg: quantityKg,
                rate: DEDUCTION_PER_KG_PREVIEW,
                amount: formatMoney(previewDeduction(quantityKg)),
              })
            : t('deliveries.lot.deductionHint')}
        </p>
        <p className="pt-1 text-xs italic">{t('deliveries.lot.note')}</p>
      </div>
    </div>
  )
}
