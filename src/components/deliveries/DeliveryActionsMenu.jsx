import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleCheck, MessageSquareWarning, PencilLine, Undo2 } from 'lucide-react'
import { resolveDispute, reverseDelivery } from '../../api/deliveries'
import useNeedsInternet from '../../hooks/useNeedsInternet'
import { formatKg } from '../../utils/format'
import ActionsMenu from '../ActionsMenu'
import ReasonDialog from '../ReasonDialog'
import CorrectDeliveryModal from './CorrectDeliveryModal'
import DisputeDialog from './DisputeDialog'
import useGradeName from '../../hooks/useGradeName'

// ⋮ menu for a saved delivery: record or settle a dispute,
// correct or reverse it. Once its lot has sales the delivery can no longer be corrected or
// reversed, so those actions stay visible but disabled with the reason. onChanged runs after any
// change so the page can reload its lists and totals.
export default function DeliveryActionsMenu({ delivery, lotHasSales, onChanged }) {
  const { t } = useTranslation()
  const gradeName = useGradeName()
  const needsInternet = useNeedsInternet()
  // Which dialog is open: dispute, resolve, correct or reverse.
  const [open, setOpen] = useState(null)

  if (delivery.reversed) return null

  const offline = { disabled: needsInternet.offline, title: needsInternet.title }
  let blockedReason
  if (needsInternet.offline) blockedReason = needsInternet.title
  else if (lotHasSales) blockedReason = t('reversal.delivery.lotHasSales')
  const blocked = { disabled: Boolean(blockedReason), title: blockedReason }

  const status = delivery.confirmationStatus
  const actions = []
  if (status === 'DISPUTED') {
    actions.push({ key: 'resolve', icon: CircleCheck, label: t('confirmation.menu.resolve'), run: () => setOpen('resolve'), ...offline })
  } else {
    actions.push({
      key: 'dispute',
      icon: MessageSquareWarning,
      label: t('confirmation.menu.dispute'),
      run: () => setOpen('dispute'),
      ...offline,
    })
  }
  actions.push(
    { key: 'correct', icon: PencilLine, label: t('reversal.delivery.correct'), run: () => setOpen('correct'), ...blocked },
    {
      key: 'reverse',
      icon: Undo2,
      label: t('reversal.delivery.reverse'),
      run: () => setOpen('reverse'),
      danger: true,
      ...blocked,
    },
  )

  function done() {
    setOpen(null)
    onChanged()
  }

  const summary = `${delivery.memberName} · ${gradeName(delivery.gradeName)} · ${formatKg(delivery.quantityKg)}`
  const close = () => setOpen(null)

  return (
    <>
      <ActionsMenu label={t('reversal.delivery.menu', { code: delivery.receiptCode })} actions={actions} />
      {open === 'dispute' && <DisputeDialog delivery={delivery} onClose={close} onDisputed={done} />}
      {open === 'resolve' && (
        <ReasonDialog
          title={t('confirmation.resolve.title', { code: delivery.receiptCode })}
          summary={summary}
          explanation={t('confirmation.resolve.explanation')}
          fieldLabel={t('confirmation.resolve.note')}
          placeholder={t('confirmation.resolve.notePlaceholder')}
          requiredMessage={t('confirmation.resolve.noteRequired')}
          confirmLabel={t('confirmation.menu.resolve')}
          tone="primary"
          onConfirm={async (note) => {
            await resolveDispute(delivery.id, note)
            done()
          }}
          onClose={close}
        />
      )}
      {open === 'reverse' && (
        <ReasonDialog
          title={t('reversal.delivery.reverseTitle', { code: delivery.receiptCode })}
          summary={summary}
          explanation={t('reversal.delivery.reverseExplanation')}
          confirmLabel={t('reversal.delivery.reverse')}
          onConfirm={async (reason) => {
            await reverseDelivery(delivery.id, reason)
            done()
          }}
          onClose={close}
        />
      )}
      {open === 'correct' && <CorrectDeliveryModal delivery={delivery} onClose={close} onCorrected={done} />}
    </>
  )
}
