import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Lightbulb, WifiOff } from 'lucide-react'
import { recordDelivery } from '../../api/deliveries'
import ConfirmDeliveryScreen from '../../components/deliveries/ConfirmDeliveryScreen'
import DeliveryReceipt from '../../components/deliveries/DeliveryReceipt'
import DuplicateWarning from '../../components/deliveries/DuplicateWarning'
import GradeSelector from '../../components/deliveries/GradeSelector'
import LotAssignment from '../../components/deliveries/LotAssignment'
import MemberPicker from '../../components/deliveries/MemberPicker'
import PendingReceipt from '../../components/deliveries/PendingReceipt'
import TodayDeliveries from '../../components/deliveries/TodayDeliveries'
import useOnlineStatus from '../../hooks/useOnlineStatus'
import usePendingDeliveries from '../../hooks/usePendingDeliveries'
import { queueDelivery } from '../../offline/pending'
import { syncedDelivery, syncNow } from '../../offline/sync'
import { kigaliIsoDate } from '../../utils/format'
import { parseKg } from '../../utils/quantity'

const MAX_QUANTITY_KG = 5000

function validate({ member, grade, date, quantityText }, today) {
  const errors = {}
  if (!member) errors.member = 'deliveries.errors.memberRequired'
  if (!grade) errors.grade = 'deliveries.errors.gradeRequired'
  if (!date) errors.date = 'deliveries.errors.dateRequired'
  else if (date > today) errors.date = 'deliveries.errors.dateFuture'

  const quantityKg = parseKg(quantityText)
  if (quantityText.trim() === '') errors.quantityText = 'deliveries.errors.quantityRequired'
  else if (quantityKg === null || quantityKg <= 0) errors.quantityText = 'deliveries.errors.quantityInvalid'
  else if (quantityKg > MAX_QUANTITY_KG) errors.quantityText = 'deliveries.errors.quantityTooLarge'
  return errors
}

// The form only asks for the day. Today means "now"; an earlier day is saved at noon Kigali time.
// Online, "now" is left to the server clock. A delivery kept on the device for later carries the
// device time, because it may reach the server much later.
function deliveredAtFor(date, today, { queued = false } = {}) {
  if (date !== today) return new Date(`${date}T12:00:00+02:00`).toISOString()
  return queued ? new Date().toISOString() : undefined
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
  // The member checks the delivery on a full screen before it is saved.
  const [confirming, setConfirming] = useState(false)
  // The saved delivery, or the one kept on this device to sync later. While either is shown the
  // form is locked until "Record another".
  const [receipt, setReceipt] = useState(null)
  const [pendingReceipt, setPendingReceipt] = useState(null)
  const locked = saving || receipt !== null || pendingReceipt !== null

  // Follow the waiting delivery in the queue: show a failure, or the real receipt once it syncs.
  const pending = usePendingDeliveries()
  const queued = pendingReceipt && pending?.find((delivery) => delivery.clientUuid === pendingReceipt.clientUuid)
  const syncedReceipt = pendingReceipt && pending && !queued ? syncedDelivery(pendingReceipt.clientUuid) : null
  const shownReceipt = receipt ?? syncedReceipt

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (locked) return
    setFormError('')

    const fieldErrors = validate(form, today)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return
    setConfirming(true)
  }

  // confirmationPin is the PIN the member typed, or null to save the delivery as waiting for
  // confirmation. A wrong PIN still saves the delivery; the server marks it pinMismatch.
  async function save(confirmationPin) {
    const delivery = { memberId: form.member.id, gradeId: form.grade.id, quantityKg: parseKg(form.quantityText) }
    if (confirmationPin) delivery.confirmationPin = confirmationPin

    async function saveForLater() {
      const entry = await queueDelivery({
        clientUuid,
        payload: { ...delivery, deliveredAt: deliveredAtFor(form.date, today, { queued: true }) },
        member: form.member,
        grade: form.grade,
      })
      setPendingReceipt(entry)
      syncNow()
    }

    setSaving(true)
    try {
      if (!isOnline) {
        await saveForLater()
        return
      }
      try {
        setReceipt(await recordDelivery({ clientUuid, ...delivery, deliveredAt: deliveredAtFor(form.date, today) }))
      } catch (error) {
        if (error.response) {
          setFormError(error.response.data?.message || t('deliveries.errors.generic'))
          return
        }
        // No answer from the server: keep it on this device and let sync send it with the same clientUuid.
        await saveForLater()
      }
    } catch {
      setFormError(t('offline.saveFailed'))
    } finally {
      setSaving(false)
      setConfirming(false)
    }
  }

  function handleRecordAnother() {
    setForm(emptyForm())
    setErrors({})
    setFormError('')
    setReceipt(null)
    setPendingReceipt(null)
    setClientUuid(crypto.randomUUID())
  }

  const quantityKg = parseKg(form.quantityText)

  return (
    <div className="space-y-6">
      {!isOnline && (
        <div role="status" className="flex items-start gap-3 rounded-xl bg-text/85 p-4 text-sm text-white print:hidden">
          <WifiOff size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">{t('offline.banner.title')}</p>
            <p className="text-white/80">{t('offline.banner.message')}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="min-w-0 space-y-5 rounded-xl bg-surface p-5 shadow-sm sm:p-6 lg:col-span-3 print:hidden"
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
              disabled={locked}
              error={errors.member}
            />
            <FieldError message={errors.member && t(errors.member)} />
          </div>

          <DuplicateWarning memberId={form.member?.id} />

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="delivery-date">{t('deliveries.date.label')}</Label>
              <input
                id="delivery-date"
                type="date"
                value={form.date}
                max={today}
                onChange={(event) => setField('date', event.target.value)}
                disabled={locked}
                className="min-h-12 w-full rounded-lg border border-transparent bg-background px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <FieldError message={errors.date && t(errors.date)} />
            </div>

            <div>
              <Label id="grade-label">{t('deliveries.grade.label')}</Label>
              <GradeSelector
                gradeId={form.grade?.id}
                onChange={(grade) => setField('grade', grade)}
                disabled={locked}
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
                disabled={locked}
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
            disabled={locked}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-semibold text-white shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t('confirmation.continue')}
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="min-w-0 space-y-6 lg:col-span-2">
          {shownReceipt && <DeliveryReceipt delivery={shownReceipt} onRecordAnother={handleRecordAnother} />}
          {pendingReceipt && !shownReceipt && (
            <PendingReceipt delivery={queued ?? pendingReceipt} onRecordAnother={handleRecordAnother} />
          )}

          <div className="rounded-xl bg-background p-4 text-sm ring-1 ring-text/5 print:hidden">
            <p className="flex items-center gap-2 font-semibold text-text">
              <Lightbulb size={16} />
              {t('deliveries.tips.title')}
            </p>
            <p className="mt-1 text-muted">{t('deliveries.tips.text')}</p>
          </div>
        </div>
      </div>

      <TodayDeliveries reloadKey={shownReceipt?.id} />

      {confirming && (
        <ConfirmDeliveryScreen
          member={form.member}
          grade={form.grade}
          quantityKg={parseKg(form.quantityText)}
          date={form.date}
          saving={saving}
          onSave={save}
          onBack={() => setConfirming(false)}
        />
      )}
    </div>
  )
}
