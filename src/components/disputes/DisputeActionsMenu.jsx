import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleCheck, PencilLine, ReceiptText, Undo2 } from 'lucide-react'
import { getDelivery, resolveDispute, reverseDelivery } from '../../api/deliveries'
import useGradeName from '../../hooks/useGradeName'
import useNeedsInternet from '../../hooks/useNeedsInternet'
import { formatKg } from '../../utils/format'
import ActionsMenu from '../ActionsMenu'
import ConfirmDialog from '../ConfirmDialog'
import ReasonDialog from '../ReasonDialog'
import CorrectDeliveryModal from '../deliveries/CorrectDeliveryModal'
import { plainReversalError } from '../deliveries/reversalError'

// ⋮ menu for an open dispute, with the same dialogs as the delivery menu. The correction form
// needs the delivery's grade id, which a dispute does not carry, so the delivery is loaded first.
// A delivery whose lot already has sales is refused by the server, and the dialog shows why.
// onChanged(message) runs after the dispute is settled.
export default function DisputeActionsMenu({ dispute, onChanged }) {
  const { t } = useTranslation()
  const gradeName = useGradeName()
  const needsInternet = useNeedsInternet()
  // Which dialog is open: resolve, reverse, correct or loadError.
  const [open, setOpen] = useState(null)
  const [delivery, setDelivery] = useState(null)
  const [loading, setLoading] = useState(false)

  async function openCorrection() {
    setLoading(true)
    try {
      setDelivery(await getDelivery(dispute.deliveryId))
      setOpen('correct')
    } catch {
      setOpen('loadError')
    } finally {
      setLoading(false)
    }
  }

  const offline = { disabled: needsInternet.offline, title: needsInternet.title }
  const actions = [
    {
      key: 'open',
      icon: ReceiptText,
      label: t('disputes.menu.openDelivery'),
      path: `/deliveries/${dispute.deliveryId}`,
    },
    {
      key: 'correct',
      icon: PencilLine,
      label: t('reversal.delivery.correct'),
      run: openCorrection,
      disabled: needsInternet.offline || loading,
      title: needsInternet.title,
    },
    {
      key: 'reverse',
      icon: Undo2,
      label: t('reversal.delivery.reverse'),
      run: () => setOpen('reverse'),
      danger: true,
      ...offline,
    },
    { key: 'resolve', icon: CircleCheck, label: t('confirmation.menu.resolve'), run: () => setOpen('resolve'), ...offline },
  ]

  function done() {
    setOpen(null)
    onChanged(t('disputes.settled', { code: dispute.receiptCode }))
  }

  const summary = `${dispute.memberName} · ${gradeName(dispute.gradeName)} · ${formatKg(dispute.quantityKg)}`
  const close = () => setOpen(null)

  return (
    <>
      <ActionsMenu label={t('reversal.delivery.menu', { code: dispute.receiptCode })} actions={actions} />
      {open === 'resolve' && (
        <ReasonDialog
          title={t('confirmation.resolve.title', { code: dispute.receiptCode })}
          summary={summary}
          explanation={t('confirmation.resolve.explanation')}
          fieldLabel={t('confirmation.resolve.note')}
          placeholder={t('confirmation.resolve.notePlaceholder')}
          requiredMessage={t('confirmation.resolve.noteRequired')}
          confirmLabel={t('confirmation.menu.resolve')}
          tone="primary"
          onConfirm={async (note) => {
            await resolveDispute(dispute.deliveryId, note)
            done()
          }}
          onClose={close}
        />
      )}
      {open === 'reverse' && (
        <ReasonDialog
          title={t('reversal.delivery.reverseTitle', { code: dispute.receiptCode })}
          summary={summary}
          explanation={t('reversal.delivery.reverseExplanation')}
          confirmLabel={t('reversal.delivery.reverse')}
          onConfirm={async (reason) => {
            try {
              await reverseDelivery(dispute.deliveryId, reason)
            } catch (error) {
              throw plainReversalError(t, error)
            }
            done()
          }}
          onClose={close}
        />
      )}
      {open === 'correct' && <CorrectDeliveryModal delivery={delivery} onClose={close} onCorrected={done} />}
      {open === 'loadError' && (
        <ConfirmDialog
          title={t('disputes.loadDeliveryError')}
          message={t('disputes.loadDeliveryErrorMessage')}
          confirmLabel={t('disputes.retry')}
          cancelLabel={t('reversal.cancel')}
          busy={loading}
          onConfirm={openCorrection}
          onCancel={close}
        />
      )}
    </>
  )
}
