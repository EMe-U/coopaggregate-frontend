import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PencilLine, Undo2 } from 'lucide-react'
import { reverseDelivery } from '../../api/deliveries'
import useNeedsInternet from '../../hooks/useNeedsInternet'
import { formatKg } from '../../utils/format'
import ActionsMenu from '../ActionsMenu'
import ReasonDialog from '../ReasonDialog'
import CorrectDeliveryModal from './CorrectDeliveryModal'

// ⋮ menu for a saved delivery. Once its lot has sales the delivery can no longer be changed, so
// the actions stay visible but disabled with the reason. onChanged runs after a successful change
// so the page can reload its lists and totals.
export default function DeliveryActionsMenu({ delivery, lotHasSales, onChanged }) {
  const { t } = useTranslation()
  const needsInternet = useNeedsInternet()
  const [reversing, setReversing] = useState(false)
  const [correcting, setCorrecting] = useState(false)

  if (delivery.reversed) return null

  let blockedReason
  if (needsInternet.offline) blockedReason = needsInternet.title
  else if (lotHasSales) blockedReason = t('reversal.delivery.lotHasSales')

  const actions = [
    {
      key: 'correct',
      icon: PencilLine,
      label: t('reversal.delivery.correct'),
      run: () => setCorrecting(true),
      disabled: Boolean(blockedReason),
      title: blockedReason,
    },
    {
      key: 'reverse',
      icon: Undo2,
      label: t('reversal.delivery.reverse'),
      run: () => setReversing(true),
      danger: true,
      disabled: Boolean(blockedReason),
      title: blockedReason,
    },
  ]

  async function handleReverse(reason) {
    await reverseDelivery(delivery.id, reason)
    setReversing(false)
    onChanged()
  }

  function handleCorrected() {
    setCorrecting(false)
    onChanged()
  }

  return (
    <>
      <ActionsMenu label={t('reversal.delivery.menu', { code: delivery.receiptCode })} actions={actions} />
      {reversing && (
        <ReasonDialog
          title={t('reversal.delivery.reverseTitle', { code: delivery.receiptCode })}
          summary={`${delivery.memberName} · ${t(`grades.${delivery.gradeName}`, { defaultValue: delivery.gradeName })} · ${formatKg(delivery.quantityKg)}`}
          explanation={t('reversal.delivery.reverseExplanation')}
          confirmLabel={t('reversal.delivery.reverse')}
          onConfirm={handleReverse}
          onClose={() => setReversing(false)}
        />
      )}
      {correcting && (
        <CorrectDeliveryModal delivery={delivery} onClose={() => setCorrecting(false)} onCorrected={handleCorrected} />
      )}
    </>
  )
}
