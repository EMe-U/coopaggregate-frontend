import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Undo2 } from 'lucide-react'
import { reversePayment } from '../../api/payments'
import useNeedsInternet from '../../hooks/useNeedsInternet'
import { formatMoney } from '../../utils/format'
import ActionsMenu from '../ActionsMenu'
import ReasonDialog from '../ReasonDialog'

// The backend's limit (PaymentService.MAX_REVERSAL_REASON): the reason is sent to the member by SMS.
export const MAX_REVERSAL_REASON = 100

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
          details={
            <dl className="mt-3 space-y-1 rounded-lg bg-background p-3 text-sm" data-testid="reverse-details">
              <div className="flex flex-wrap justify-between gap-x-3">
                <dt className="text-muted">{t('reversal.payment.member')}</dt>
                <dd className="font-medium">
                  {payment.memberName} <span className="font-mono text-xs text-muted">{payment.memberNumber}</span>
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-3">
                <dt className="text-muted">{t('reversal.payment.backToBalance')}</dt>
                <dd className="font-semibold">{formatMoney(payment.amountRwf)}</dd>
              </div>
            </dl>
          }
          explanation={t('reversal.payment.reverseExplanation')}
          warning={t('reversal.payment.smsWarning')}
          maxLength={MAX_REVERSAL_REASON}
          showCount
          confirmLabel={t('reversal.payment.reverse')}
          onConfirm={handleReverse}
          onClose={() => setReversing(false)}
        />
      )}
    </>
  )
}
