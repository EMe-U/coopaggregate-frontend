import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Undo2 } from 'lucide-react'
import { reversePayment } from '../../api/payments'
import useNeedsInternet from '../../hooks/useNeedsInternet'
import { formatMoney } from '../../utils/format'
import ActionsMenu from '../ActionsMenu'
import ReasonDialog from '../ReasonDialog'

// ⋮ menu for a payment. onChanged(payment) runs after a reversal so the page can reload the balances.
export default function PaymentActionsMenu({ payment, onChanged }) {
  const { t } = useTranslation()
  const { offline, title } = useNeedsInternet()
  const [reversing, setReversing] = useState(false)

  if (payment.reversed) return null

  const actions = [
    {
      key: 'reverse',
      icon: Undo2,
      label: t('reversal.payment.reverse'),
      run: () => setReversing(true),
      danger: true,
      disabled: offline,
      title,
    },
  ]

  async function handleReverse(reason) {
    await reversePayment(payment.id, reason)
    setReversing(false)
    onChanged(payment)
  }

  return (
    <>
      <ActionsMenu label={t('reversal.payment.menu', { code: payment.paymentCode })} actions={actions} />
      {reversing && (
        <ReasonDialog
          title={t('reversal.payment.reverseTitle', { code: payment.paymentCode })}
          summary={`${payment.memberName} · ${formatMoney(payment.amountRwf)}`}
          explanation={t('reversal.payment.reverseExplanation')}
          confirmLabel={t('reversal.payment.reverse')}
          onConfirm={handleReverse}
          onClose={() => setReversing(false)}
        />
      )}
    </>
  )
}
