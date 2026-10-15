import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Info, Save } from 'lucide-react'
import { correctDelivery } from '../../api/deliveries'
import useNeedsInternet from '../../hooks/useNeedsInternet'
import { parseKg } from '../../utils/quantity'
import GradeSelector from './GradeSelector'
import MemberPicker from './MemberPicker'

const MAX_QUANTITY_KG = 5000

function validate({ member, grade, quantityText, reason }, delivery) {
  const errors = {}
  if (!member) errors.member = 'deliveries.errors.memberRequired'
  if (!grade) errors.grade = 'deliveries.errors.gradeRequired'
  const quantityKg = parseKg(quantityText)
  if (quantityText.trim() === '') errors.quantityText = 'deliveries.errors.quantityRequired'
  else if (quantityKg === null || quantityKg <= 0) errors.quantityText = 'deliveries.errors.quantityInvalid'
  else if (quantityKg > MAX_QUANTITY_KG) errors.quantityText = 'deliveries.errors.quantityTooLarge'
  if (!reason.trim()) errors.reason = 'reversal.reasonRequired'

  const unchanged =
    member?.id === delivery.memberId && grade?.id === delivery.gradeId && quantityKg === Number(delivery.quantityKg)
  if (Object.keys(errors).length === 0 && unchanged) errors.form = 'reversal.correct.nothingChanged'
  return errors
}

// Prefilled with the delivery; the manager changes what was wrong. onCorrected receives the new
// delivery returned by the server.
export default function CorrectDeliveryModal({ delivery, onClose, onCorrected }) {
  const { t } = useTranslation()
  const needsInternet = useNeedsInternet()
  const [form, setForm] = useState(() => ({
    member: { id: delivery.memberId, fullName: delivery.memberName, memberCode: delivery.memberNumber },
    grade: { id: delivery.gradeId, name: delivery.gradeName },
    quantityText: String(delivery.quantityKg),
    reason: '',
  }))
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saving, onClose])

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined, form: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (saving) return
    const fieldErrors = validate(form, delivery)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    setSaving(true)
    setServerError('')
    try {
      const corrected = await correctDelivery(delivery.id, {
        reason: form.reason.trim(),
        memberId: form.member.id,
        gradeId: form.grade.id,
        quantityKg: parseKg(form.quantityText),
      })
      onCorrected(corrected)
    } catch (error) {
      setServerError(error.response?.data?.message || t('reversal.error'))
      setSaving(false)
    }
  }

  const fieldError = (name) => errors[name] && <p className="mt-1 text-sm text-danger">{t(errors[name])}</p>
  const labelClass = 'mb-1.5 block text-sm font-medium text-text'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-labelledby="correct-title"
        className="my-auto w-full max-w-lg space-y-4 rounded-xl bg-surface p-5 text-left shadow-lg"
      >
        <h2 id="correct-title" className="text-lg font-semibold text-text">
          {t('reversal.correct.title', { code: delivery.receiptCode })}
        </h2>
        <p className="flex items-start gap-2 rounded-lg bg-warning/15 p-3 text-sm text-amber-800">
          <Info size={16} className="mt-0.5 shrink-0" />
          <span>{t('reversal.correct.explanation')}</span>
        </p>

        <div>
          <label htmlFor="correct-member" className={labelClass}>
            {t('deliveries.member.label')}
          </label>
          <MemberPicker
            inputId="correct-member"
            member={form.member}
            onChange={(member) => setField('member', member)}
            disabled={saving}
            error={errors.member}
          />
          {fieldError('member')}
        </div>

        <div>
          <p id="correct-grade-label" className={labelClass}>
            {t('deliveries.grade.label')}
          </p>
          <GradeSelector
            labelId="correct-grade-label"
            gradeId={form.grade?.id}
            onChange={(grade) => setField('grade', grade)}
            disabled={saving}
          />
          {fieldError('grade')}
        </div>

        <div>
          <label htmlFor="correct-quantity" className={labelClass}>
            {t('deliveries.quantity.label')}
          </label>
          <input
            id="correct-quantity"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={form.quantityText}
            onChange={(event) => setField('quantityText', event.target.value)}
            disabled={saving}
            aria-invalid={Boolean(errors.quantityText)}
            className="min-h-12 w-full rounded-lg border border-transparent bg-background px-3 text-base font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {fieldError('quantityText')}
        </div>

        <div>
          <label htmlFor="correct-reason" className={labelClass}>
            {t('reversal.reason')}
          </label>
          <textarea
            id="correct-reason"
            rows={2}
            maxLength={500}
            value={form.reason}
            onChange={(event) => setField('reason', event.target.value)}
            placeholder={t('reversal.correct.reasonPlaceholder')}
            disabled={saving}
            aria-invalid={Boolean(errors.reason)}
            className="w-full rounded-lg border border-transparent bg-background px-3 py-2 text-base outline-none placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {fieldError('reason')}
        </div>

        {(errors.form || serverError) && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {serverError || t(errors.form)}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="min-h-12 flex-1 rounded-lg border border-text/10 px-4 text-sm font-medium text-text hover:bg-background"
          >
            {t('reversal.cancel')}
          </button>
          <button
            type="submit"
            disabled={saving || needsInternet.offline}
            title={needsInternet.title}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? t('reversal.correct.saving') : t('reversal.correct.save')}
          </button>
        </div>
      </form>
    </div>
  )
}
