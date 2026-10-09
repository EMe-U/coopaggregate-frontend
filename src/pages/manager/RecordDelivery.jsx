import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Lightbulb, Save, WifiOff } from 'lucide-react'
import { recordDelivery } from '../../api/deliveries'
import SuccessToast from '../../components/SuccessToast'
import GradeSelector from '../../components/deliveries/GradeSelector'
import LotAssignment from '../../components/deliveries/LotAssignment'
import MemberPicker from '../../components/deliveries/MemberPicker'
import useOnlineStatus from '../../hooks/useOnlineStatus'
import { kigaliIsoDate } from '../../utils/format'

const QUANTITY_PATTERN = /^\d+(\.\d{1,2})?$/
const MAX_QUANTITY_KG = 5000

// Phone keypads in some languages type a comma as the decimal separator.
function parseQuantity(text) {
  const value = text.trim().replace(',', '.')
  return QUANTITY_PATTERN.test(value) ? Number(value) : null
}

function validate({ member, grade, date, quantityText }, today) {
  const errors = {}
  if (!member) errors.member = 'deliveries.errors.memberRequired'
  if (!grade) errors.grade = 'deliveries.errors.gradeRequired'
  if (!date) errors.date = 'deliveries.errors.dateRequired'
  else if (date > today) errors.date = 'deliveries.errors.dateFuture'

  const quantityKg = parseQuantity(quantityText)
  if (quantityText.trim() === '') errors.quantityText = 'deliveries.errors.quantityRequired'
  else if (quantityKg === null || quantityKg <= 0) errors.quantityText = 'deliveries.errors.quantityInvalid'
  else if (quantityKg > MAX_QUANTITY_KG) errors.quantityText = 'deliveries.errors.quantityTooLarge'
  return errors
}

// The form only asks for the day. Today means "now"; an earlier day is saved at noon Kigali time.
function deliveredAtFor(date, today) {
  return date === today ? undefined : new Date(`${date}T12:00:00+02:00`).toISOString()
}

function emptyForm() {
  return { member: null, grade: null, date: kigaliIsoDate(), quantityText: '' }
}

function Label({ htmlFor, id, children }) {
  return (
    <label htmlFor={htmlFor} id={id} className="mb-1.5 block text-sm font-medium text-text">
      {children}
    </label>
  )
}

function FieldError({ message }) {
  return message ? <p className="mt-1 text-sm text-danger">{message}</p> : null
}

export default function RecordDelivery() {
  const { t } = useTranslation()
  const isOnline = useOnlineStatus()
  const today = kigaliIsoDate()

  const [form, setForm] = useState(emptyForm)
  // Created once per delivery and reused on every retry, so a double tap or a retry after a
  // lost response returns the delivery that was already saved instead of saving it again.
  const [clientUuid, setClientUuid] = useState(() => crypto.randomUUID())
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const clearNotice = useCallback(() => setNotice(''), [])

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (saving || !isOnline) return
    setFormError('')

    const fieldErrors = validate(form, today)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    setSaving(true)
    try {
      await recordDelivery({
        clientUuid,
        memberId: form.member.id,
        gradeId: form.grade.id,
        quantityKg: parseQuantity(form.quantityText),
        deliveredAt: deliveredAtFor(form.date, today),
      })
      setForm(emptyForm())
      setClientUuid(crypto.randomUUID())
      setNotice(t('deliveries.receipt.title'))
    } catch (error) {
      if (!error.response) setFormError(t('deliveries.errors.serverUnreachable'))
      else setFormError(error.response.data?.message || t('deliveries.errors.generic'))
    } finally {
      setSaving(false)
    }
  }

  const quantityKg = parseQuantity(form.quantityText)

  return (
    <div className="space-y-6">
      {!isOnline && (
        <div role="status" className="flex items-start gap-3 rounded-xl bg-text/85 p-4 text-sm text-white">
          <WifiOff size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">{t('deliveries.offline.title')}</p>
            <p className="text-white/80">{t('deliveries.offline.message')}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="min-w-0 space-y-5 rounded-xl bg-surface p-5 shadow-sm sm:p-6 lg:col-span-3"
        >
          <h1 className="text-lg font-semibold text-text">{t('deliveries.title')}</h1>

          {formError && (
            <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          )}

          <div>
            <Label htmlFor="member-search">{t('deliveries.member.label')}</Label>
            <MemberPicker
              member={form.member}
              onChange={(member) => setField('member', member)}
              disabled={saving}
              error={errors.member}
            />
            <FieldError message={errors.member && t(errors.member)} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="delivery-date">{t('deliveries.date.label')}</Label>
              <input
                id="delivery-date"
                type="date"
                value={form.date}
                max={today}
                onChange={(event) => setField('date', event.target.value)}
                disabled={saving}
                className="min-h-12 w-full rounded-lg border border-transparent bg-background px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <FieldError message={errors.date && t(errors.date)} />
            </div>

            <div>
              <Label id="grade-label">{t('deliveries.grade.label')}</Label>
              <GradeSelector
                gradeId={form.grade?.id}
                onChange={(grade) => setField('grade', grade)}
                disabled={saving}
              />
              <FieldError message={errors.grade && t(errors.grade)} />
            </div>
          </div>

          <div>
            <Label htmlFor="quantity">{t('deliveries.quantity.label')}</Label>
            <div className="relative">
              <input
                id="quantity"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={form.quantityText}
                onChange={(event) => setField('quantityText', event.target.value)}
                disabled={saving}
                aria-invalid={Boolean(errors.quantityText)}
                className="min-h-12 w-full rounded-lg border border-transparent bg-background py-3 pl-3 pr-12 text-lg font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                {t('deliveries.quantity.unit')}
              </span>
            </div>
            <FieldError message={errors.quantityText && t(errors.quantityText)} />
          </div>

          <LotAssignment gradeId={form.grade?.id} quantityKg={quantityKg > 0 ? quantityKg : null} />

          <button
            type="submit"
            disabled={saving || !isOnline}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-semibold text-white shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={18} />
            {saving ? t('deliveries.saving') : t('deliveries.save')}
          </button>
        </form>

        <div className="min-w-0 space-y-6 lg:col-span-2">
          <div className="rounded-xl bg-background p-4 text-sm ring-1 ring-text/5">
            <p className="flex items-center gap-2 font-semibold text-text">
              <Lightbulb size={16} />
              {t('deliveries.tips.title')}
            </p>
            <p className="mt-1 text-muted">{t('deliveries.tips.text')}</p>
          </div>
        </div>
      </div>

      {notice && <SuccessToast message={notice} onDone={clearNotice} />}
    </div>
  )
}
