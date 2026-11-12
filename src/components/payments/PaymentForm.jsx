import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageSquare, Send } from 'lucide-react'
import { recordPayment } from '../../api/payments'
import { formatMoney } from '../../utils/format'
import useNeedsInternet from '../../hooks/useNeedsInternet'

export const METHODS = ['CASH', 'MOMO', 'BANK']
// Same rule as the backend: mobile money and bank payments need the transaction reference.
export const NEEDS_REFERENCE = ['MOMO', 'BANK']
export const MAX_REFERENCE = 50

const fieldClass =
  'min-h-12 w-full rounded-lg border border-transparent bg-background px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

// The method buttons, shared with the sale form's "How did the buyer pay?".
export function MethodPicker({ id, value, onChange, disabled }) {
  const { t } = useTranslation()
  return (
    <div role="radiogroup" aria-labelledby={id} className="grid grid-cols-3 gap-2">
      {METHODS.map((method) => (
        <button
          key={method}
          type="button"
          role="radio"
          aria-checked={value === method}
          onClick={() => onChange(method)}
          disabled={disabled}
          className={`min-h-12 rounded-lg px-1 text-sm font-medium ${
            value === method ? 'bg-primary text-white shadow-sm' : 'bg-background text-text hover:bg-primary-light'
          }`}
        >
          {t(`payments.methods.${method}`)}
        </button>
      ))}
    </div>
  )
}

// Disburses the farmer's whole balance: the amount is shown, not typed, and sent as it is. If a sale
// credited the farmer in the meantime the backend refuses it (400) and its message is shown; onRefused
// lets the page reload the balance. member: { memberId, memberName, owedRwf }.
export default function PaymentForm({ member, onSaved, onCancel, onRefused }) {
  const { t } = useTranslation()
  const needsInternet = useNeedsInternet()

  const [method, setMethod] = useState('CASH')
  const [reference, setReference] = useState('')
  // Created once for this disbursement and reused on every retry, so a double tap or a retry after a
  // lost response returns the payment already saved instead of paying twice.
  const [clientUuid] = useState(() => crypto.randomUUID())
  const [referenceError, setReferenceError] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const needsReference = NEEDS_REFERENCE.includes(method)
  const nothingOwed = !(member.owedRwf > 0)

  async function handleSubmit(event) {
    event.preventDefault()
    if (saving || nothingOwed) return
    setFormError('')

    const error = needsReference && !reference.trim() ? t('payments.form.errors.referenceRequired') : ''
    setReferenceError(error)
    if (error) return

    setSaving(true)
    try {
      const payment = await recordPayment({
        clientUuid,
        memberId: member.memberId,
        amountRwf: member.owedRwf,
        method,
        reference: reference.trim() || null,
      })
      onSaved(payment)
    } catch (requestError) {
      if (!requestError.response) setFormError(t('payments.form.errors.serverUnreachable'))
      else {
        setFormError(requestError.response.data?.message || t('payments.form.errors.generic'))
        if (requestError.response.status === 400) onRefused?.()
      }
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {formError && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      )}

      <div className="rounded-lg bg-primary-light/60 p-4">
        <p id="payment-amount-label" className="text-sm font-medium text-text">
          {t('payments.form.amount')}
        </p>
        <p className="mt-1 text-2xl font-semibold text-text" aria-labelledby="payment-amount-label" data-testid="disburse-amount">
          {formatMoney(member.owedRwf)}
        </p>
        <p className="mt-1 text-xs text-muted">{t('payments.form.fullBalance')}</p>
      </div>

      <div>
        <p id="payment-method-label" className="mb-1.5 text-sm font-medium text-text">
          {t('payments.form.method')}
        </p>
        <MethodPicker id="payment-method-label" value={method} onChange={setMethod} disabled={saving} />
      </div>

      <div>
        <label htmlFor="payment-reference" className="mb-1.5 block text-sm font-medium text-text">
          {needsReference ? t('payments.form.reference') : t('payments.form.referenceOptional')}
        </label>
        <input
          id="payment-reference"
          autoComplete="off"
          maxLength={MAX_REFERENCE}
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          disabled={saving}
          aria-invalid={Boolean(referenceError)}
          className={fieldClass}
        />
        {referenceError ? (
          <p className="mt-1 text-sm text-danger">{referenceError}</p>
        ) : (
          needsReference && <p className="mt-1 text-xs text-muted">{t('payments.form.referenceHint')}</p>
        )}
      </div>

      <p className="flex items-start gap-2 rounded-lg bg-background px-3 py-2 text-sm text-muted">
        <MessageSquare size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        {t('payments.form.smsNote')}
      </p>

      <div className="flex gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="min-h-12 flex-1 rounded-lg border border-text/10 px-4 text-sm font-medium text-text hover:bg-background"
          >
            {t('payments.form.cancel')}
          </button>
        )}
        <button
          type="submit"
          disabled={saving || nothingOwed || needsInternet.offline}
          title={needsInternet.title}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send size={16} />
          {saving ? t('payments.form.saving') : t('payments.form.save')}
        </button>
      </div>
    </form>
  )
}
