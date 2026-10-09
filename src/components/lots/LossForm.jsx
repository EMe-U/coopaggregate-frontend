import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Save } from 'lucide-react'
import { listAllLots, recordLoss } from '../../api/lots'
import { formatKg } from '../../utils/format'
import { parseKg } from '../../utils/quantity'

const REASONS = ['ROT', 'DAMAGE', 'THEFT', 'OTHER']

const fieldClass =
  'min-h-12 w-full rounded-lg border border-transparent bg-background px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

// Losses can be recorded on open and closed lots that still have stock.
async function loadLotsWithStock() {
  const [open, closed] = await Promise.all([listAllLots('OPEN'), listAllLots('CLOSED')])
  return [...open, ...closed].filter((lot) => Number(lot.remainingKg) > 0)
}

// With a fixed lot (from the lot detail page) the lot picker is hidden.
export default function LossForm({ fixedLot, reloadKey, onSaved, onCancel }) {
  const { t } = useTranslation()

  const [lots, setLots] = useState(fixedLot ? [fixedLot] : null)
  const [lotsError, setLotsError] = useState(false)
  const [lotId, setLotId] = useState(fixedLot ? String(fixedLot.id) : '')
  const [quantityText, setQuantityText] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (fixedLot) return
    let ignore = false
    setLotsError(false)
    loadLotsWithStock()
      .then((data) => {
        if (!ignore) setLots(data)
      })
      .catch(() => {
        if (!ignore) setLotsError(true)
      })
    return () => {
      ignore = true
    }
  }, [fixedLot, reloadKey])

  const lot = lots?.find((candidate) => String(candidate.id) === lotId)

  function validate() {
    const fieldErrors = {}
    const quantityKg = parseKg(quantityText)
    if (!lot) fieldErrors.lot = t('lots.loss.errors.lotRequired')
    if (quantityText.trim() === '') fieldErrors.quantity = t('lots.loss.errors.quantityRequired')
    else if (quantityKg === null || quantityKg <= 0) fieldErrors.quantity = t('lots.loss.errors.quantityInvalid')
    else if (lot && quantityKg > Number(lot.remainingKg)) {
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
      setQuantityText('')
      setReason('')
      setNotes('')
      if (!fixedLot) setLotId('')
      onSaved(loss)
    } catch (error) {
      if (!error.response) setFormError(t('lots.loss.errors.serverUnreachable'))
      else setFormError(error.response.data?.message || t('lots.loss.errors.generic'))
    } finally {
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

      {!fixedLot && (
        <div>
          <label htmlFor="loss-lot" className="mb-1.5 block text-sm font-medium text-text">
            {t('lots.loss.lot')}
          </label>
          {lotsError ? (
            <p className="text-sm text-danger">{t('lots.table.error')}</p>
          ) : (
            <select
              id="loss-lot"
              value={lotId}
              onChange={(event) => setLotId(event.target.value)}
              disabled={!lots || saving}
              className={fieldClass}
            >
              <option value="">{lots?.length === 0 ? t('lots.loss.noLots') : t('lots.loss.chooseLot')}</option>
              {lots?.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {t('lots.loss.lotOption', {
                    code: candidate.code,
                    grade: t(`grades.${candidate.gradeName}`, { defaultValue: candidate.gradeName }),
                    kg: formatKg(candidate.remainingKg),
                  })}
                </option>
              ))}
            </select>
          )}
          {errors.lot && <p className="mt-1 text-sm text-danger">{errors.lot}</p>}
        </div>
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
          lot && <p className="mt-1 text-xs text-muted">{t('lots.loss.maxAvailable', { kg: formatKg(lot.remainingKg) })}</p>
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
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="min-h-12 flex-1 rounded-lg border border-text/10 px-4 text-sm font-medium text-text hover:bg-background"
          >
            {t('lots.loss.cancel')}
          </button>
        )}
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
