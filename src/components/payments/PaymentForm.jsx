import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Save } from 'lucide-react'
import { recordPayment } from '../../api/payments'
import { formatMoney, kigaliIsoDate } from '../../utils/format'

const METHODS = ['CASH', 'MOMO', 'BANK']
// Same rule as the backend: mobile money and bank payments need the transaction reference.
const NEEDS_REFERENCE = ['MOMO', 'BANK']
const AMOUNT_PATTERN = /^\d+$/

const fieldClass =
  'min-h-12 w-full rounded-lg border border-transparent bg-background px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

// member: { memberId, memberName, owedRwf }. Give the form a new key for each member so the
// amount and the clientUuid start fresh.
export default function PaymentForm({ member, onSaved, onCancel }) {
  const { t } = useTranslation()
  const today = kigaliIsoDate()

  const [amountText, setAmountText] = useState(String(member.owedRwf))
  const [method, setMethod] = useState('CASH')
  const [reference, setReference] = useState('')
  const [date, setDate] = useState(today)
  // Created once for this payment and reused on every retry, so a double tap or a retry
  // after a lost response returns the payment that was already saved instead of paying twice.
  const [clientUuid] = useState(() => crypto.randomUUID())
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const amountRwf = AMOUNT_PATTERN.test(amountText.trim()) ? Number(amountText.trim()) : null
  const needsReference = NEEDS_REFERENCE.includes(method)

  function validate() {
    const fieldErrors = {}
    if (amountText.trim() === '') fieldErrors.amount = t('payments.form.errors.amountRequired')
    else if (!amountRwf) fieldErrors.amount = t('payments.form.errors.amountInvalid')
    else if (amountRwf > member.owedRwf) {
      fieldErrors.amount = t('payments.form.errors.amountTooLarge', { amount: formatMoney(member.owedRwf) })
    }
    if (needsReference && !reference.trim()) fieldErrors.reference = t('payments.form.errors.referenceRequired')
    if (!date) fieldErrors.date = t('payments.form.errors.dateRequired')
    else if (date > today) fieldErrors.date = t('payments.form.errors.dateFuture')
    return fieldErrors
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (saving) return
    setFormError('')

    const fieldErrors = validate()
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    setSaving(true)
    try {
      const payment = await recordPayment({
        clientUuid,
        memberId: member.memberId,
        amountRwf,
        method,
        reference: reference.trim() || null,
        paidAt: date,
      })
      onSaved(payment)
    } catch (error) {
      if (!error.response) setFormError(t('payments.form.errors.serverUnreachable'))
      else setFormError(error.response.data?.message || t('payments.form.errors.generic'))
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

      <div>
        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor="payment-amount" className="text-sm font-medium text-text">
            {t('payments.form.amount')}
          </label>
          <span className="text-xs text-muted">{t('payments.form.maxAllowed', { amount: formatMoney(member.owedRwf) })}</span>
        </div>
        <input
          id="payment-amount"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={amountText}
          onChange={(event) => setAmountText(event.target.value)}
          disabled={saving}
          className={`${fieldClass} text-lg font-semibold`}
        />
        {errors.amount && <p className="mt-1 text-sm text-danger">{errors.amount}</p>}
      </div>

      <div>
        <p id="payment-method-label" className="mb-1.5 text-sm font-medium text-text">
          {t('payments.form.method')}
        </p>
        <div role="radiogroup" aria-labelledby="payment-method-label" className="grid grid-cols-3 gap-2">
          {METHODS.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={method === value}
              onClick={() => setMethod(value)}
              disabled={saving}
              className={`min-h-12 rounded-lg px-1 text-sm font-medium ${
                method === value ? 'bg-primary text-white shadow-sm' : 'bg-background text-text hover:bg-primary-light'
              }`}
            >
              {t(`payments.methods.${value}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="payment-reference" className="mb-1.5 block text-sm font-medium text-text">
            {needsReference ? t('payments.form.reference') : t('payments.form.referenceOptional')}
          </label>
          <input
            id="payment-reference"
            autoComplete="off"
            maxLength={50}
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            disabled={saving}
            className={fieldClass}
          />
          {errors.reference ? (
            <p className="mt-1 text-sm text-danger">{errors.reference}</p>
          ) : (
            needsReference && <p className="mt-1 text-xs text-muted">{t('payments.form.referenceHint')}</p>
          )}
        </div>
        <div>
          <label htmlFor="payment-date" className="mb-1.5 block text-sm font-medium text-text">
            {t('payments.form.date')}
          </label>
          <input
            id="payment-date"
            type="date"
            value={date}
            max={today}
            onChange={(event) => setDate(event.target.value)}
            disabled={saving}
            className={fieldClass}
          />
          {errors.date && <p className="mt-1 text-sm text-danger">{errors.date}</p>}
        </div>
      </div>

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
          disabled={saving}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={16} />
          {saving ? t('payments.form.saving') : t('payments.form.save')}
        </button>
      </div>
    </form>
  )
}
