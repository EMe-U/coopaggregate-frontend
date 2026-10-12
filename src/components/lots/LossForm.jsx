import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Save } from 'lucide-react'
import { recordLoss } from '../../api/lots'
import { formatKg } from '../../utils/format'
import { parseKg } from '../../utils/quantity'

const REASONS = ['ROT', 'DAMAGE', 'THEFT', 'OTHER']

const fieldClass =
  'min-h-12 w-full rounded-lg border border-transparent bg-background px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

// Records a loss on an open or closed lot; it cannot be more than the lot's remaining kg.
export default function LossForm({ lot, onSaved, onCancel }) {
  const { t } = useTranslation()

  const [quantityText, setQuantityText] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  function validate() {
    const fieldErrors = {}
    const quantityKg = parseKg(quantityText)
    if (quantityText.trim() === '') fieldErrors.quantity = t('lots.loss.errors.quantityRequired')
    else if (quantityKg === null || quantityKg <= 0) fieldErrors.quantity = t('lots.loss.errors.quantityInvalid')
    else if (quantityKg > Number(lot.remainingKg)) {
      fieldErrors.quantity = t('lots.loss.errors.quantityTooLarge', { kg: formatKg(lot.remainingKg) })
    }
    if (!reason) fieldErrors.reason = t('lots.loss.errors.reasonRequired')
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
      const loss = await recordLoss(lot.id, {
        quantityKg: parseKg(quantityText),
        reason,
        notes: notes.trim() || null,
      })
      onSaved(loss)
    } catch (error) {
      if (!error.response) setFormError(t('lots.loss.errors.serverUnreachable'))
      else setFormError(error.response.data?.message || t('lots.loss.errors.generic'))
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
        <label htmlFor="loss-quantity" className="mb-1.5 block text-sm font-medium text-text">
          {t('lots.loss.quantity')}
        </label>
        <div className="relative">
          <input
            id="loss-quantity"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={quantityText}
            onChange={(event) => setQuantityText(event.target.value)}
            disabled={saving}
            className={`${fieldClass} pr-12`}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">kg</span>
        </div>
        {errors.quantity ? (
          <p className="mt-1 text-sm text-danger">{errors.quantity}</p>
        ) : (
          <p className="mt-1 text-xs text-muted">{t('lots.loss.maxAvailable', { kg: formatKg(lot.remainingKg) })}</p>
        )}
      </div>

      <div>
        <label htmlFor="loss-reason" className="mb-1.5 block text-sm font-medium text-text">
          {t('lots.loss.reason')}
        </label>
        <select
          id="loss-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={saving}
          className={fieldClass}
        >
          <option value="">{t('lots.loss.chooseReason')}</option>
          {REASONS.map((value) => (
            <option key={value} value={value}>
              {t(`lots.loss.reasons.${value}`)}
            </option>
          ))}
        </select>
        {errors.reason && <p className="mt-1 text-sm text-danger">{errors.reason}</p>}
      </div>

      <div>
        <label htmlFor="loss-notes" className="mb-1.5 block text-sm font-medium text-text">
          {t('lots.loss.notes')}
        </label>
        <textarea
          id="loss-notes"
          rows={3}
          maxLength={500}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={t('lots.loss.notesPlaceholder')}
          disabled={saving}
          className="w-full rounded-lg border border-transparent bg-background px-3 py-2 text-base outline-none placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="min-h-12 flex-1 rounded-lg border border-text/10 px-4 text-sm font-medium text-text hover:bg-background"
        >
          {t('lots.loss.cancel')}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={16} />
          {saving ? t('lots.loss.saving') : t('lots.loss.save')}
        </button>
      </div>
    </form>
  )
}
