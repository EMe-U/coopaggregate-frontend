import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import { findOpenLot } from '../../api/lots'
import useOnlineStatus from '../../hooks/useOnlineStatus'
import { formatMoney } from '../../utils/format'
import { DEDUCTION_PER_KG_PREVIEW, previewDeduction } from '../../utils/deduction'

export default function LotAssignment({ gradeId, quantityKg }) {
  const { t } = useTranslation()
  const isOnline = useOnlineStatus()
  const [lot, setLot] = useState({ status: 'idle' })

  useEffect(() => {
    // Offline the server picks the lot when the delivery syncs, so there is nothing to look up.
    if (!gradeId || !isOnline) {
      setLot({ status: 'idle' })
      return
    }

    let ignore = false
    setLot({ status: 'loading' })
    findOpenLot(gradeId)
      .then((openLot) => {
        if (!ignore) setLot({ status: 'done', openLot })
      })
      .catch(() => {
        if (!ignore) setLot({ status: 'error' })
      })
    return () => {
      ignore = true
    }
  }, [gradeId, isOnline])

  let lotText
  if (!isOnline) lotText = t('offline.lotLater')
  else if (lot.status === 'idle') lotText = t('deliveries.lot.chooseGrade')
  else if (lot.status === 'loading') lotText = t('deliveries.lot.checking')
  else if (lot.status === 'error') lotText = t('deliveries.lot.error')
  else if (lot.openLot) lotText = t('deliveries.lot.existing', { code: lot.openLot.code })
  else lotText = t('deliveries.lot.newLot')

  return (
    <div className="rounded-lg bg-primary-light p-4 text-sm text-primary">
      <p className="flex items-center gap-2 font-semibold">
        <Info size={16} />
        {t('deliveries.lot.title')}
      </p>
      <div className="mt-2 space-y-1 pl-6">
        <p className={lot.status === 'error' ? 'text-danger' : undefined}>{lotText}</p>
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
