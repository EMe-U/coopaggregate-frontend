import { useTranslation } from 'react-i18next'
import { ReceiptText } from 'lucide-react'
import { formatMoney } from '../../utils/format'
import PaymentForm from './PaymentForm'

// members: balances with something left to pay. formKey changes after each payment so the
// form starts empty with a new clientUuid.
export default function RecordPaymentPanel({ ref, members, selectedId, onSelect, onSaved, formKey }) {
  const { t } = useTranslation()
  const selected = members?.find((member) => member.memberId === selectedId)

  return (
    <section ref={ref} className="min-w-0 scroll-mt-4 rounded-xl bg-surface p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text">
        <ReceiptText size={20} className="text-primary" />
        {t('payments.form.title')}
      </h2>

      <div className="mb-4">
        <label htmlFor="payment-member" className="mb-1.5 block text-sm font-medium text-text">
          {t('payments.form.member')}
        </label>
        <select
          id="payment-member"
          value={selectedId ?? ''}
          onChange={(event) => onSelect(event.target.value ? Number(event.target.value) : null)}
          disabled={!members}
          className="min-h-12 w-full rounded-lg border border-transparent bg-background px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="">{members?.length === 0 ? t('payments.form.noMembers') : t('payments.form.chooseMember')}</option>
          {members?.map((member) => (
            <option key={member.memberId} value={member.memberId}>
              {member.memberName} ({member.memberNumber}) – {formatMoney(member.balanceRwf)}
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <PaymentForm
          key={`${selected.memberId}-${formKey}`}
          member={{ memberId: selected.memberId, memberName: selected.memberName, owedRwf: selected.balanceRwf }}
          onSaved={onSaved}
        />
      )}
    </section>
  )
}
