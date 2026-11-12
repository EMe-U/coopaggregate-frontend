import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ClipboardList, Lightbulb, PackagePlus, Save, WifiOff } from 'lucide-react'
import { recordDelivery } from '../../api/deliveries'
import AllDeliveries from '../../components/deliveries/AllDeliveries'
import DeliveryConfirmation from '../../components/deliveries/DeliveryConfirmation'
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

const TABS = [
  { key: 'record', icon: PackagePlus },
  { key: 'all', icon: ClipboardList },
]

// Record | All deliveries. The arrow keys, Home and End move between the tabs (the selected one is
// the only tab stop).
function Tabs({ active, onChange }) {
  const { t } = useTranslation()
  const refs = useRef({})

  function handleKeyDown(event) {
    const index = TABS.findIndex((tab) => tab.key === active)
    let next
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = TABS.length - 1
    else return
    event.preventDefault()
    onChange(TABS[next].key)
    refs.current[TABS[next].key]?.focus()
  }

  return (
    <div role="tablist" aria-label={t('allDeliveries.tabs.label')} className="flex gap-1 rounded-xl bg-surface p-1 shadow-sm sm:inline-flex print:hidden">
      {TABS.map(({ key, icon: Icon }) => {
        const selected = key === active
        return (
          <button
            key={key}
            ref={(element) => {
              refs.current[key] = element
            }}
            type="button"
            role="tab"
            id={`delivery-tab-${key}`}
            aria-selected={selected}
            // The All deliveries panel is only on the page while its tab is selected.
            aria-controls={key === 'record' || selected ? `delivery-panel-${key}` : undefined}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(key)}
            onKeyDown={handleKeyDown}
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold sm:flex-none ${
              selected ? 'bg-primary text-white' : 'text-muted hover:bg-background hover:text-text'
            }`}
          >
            <Icon size={16} />
            {t(`allDeliveries.tabs.${key}`)}
          </button>
        )
      })}
    </div>
  )
}

export default function RecordDelivery() {
  const { t } = useTranslation()
  const isOnline = useOnlineStatus()
  const today = kigaliIsoDate()
  // ?tab=all opens All deliveries. The Record tab stays mounted while hidden, so a half-typed
  // delivery is still there when coming back.
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'all' ? 'all' : 'record'

  function changeTab(key) {
    if (key === tab) return
    setSearchParams(key === 'all' ? { tab: 'all' } : {}, { replace: true })
  }

  const [form, setForm] = useState(emptyForm)
  // Created once per delivery and reused on every retry, so a double tap or a retry after a
  // lost response returns the delivery that was already saved instead of saving it again.
  const [clientUuid, setClientUuid] = useState(() => crypto.randomUUID())
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  // The saved delivery, or the one kept on this device to sync later. While either is shown the
  // form is locked until "Record another".
  const [receipt, setReceipt] = useState(null)
  const [pendingReceipt, setPendingReceipt] = useState(null)
  // After an online save the member confirms with the code they received by SMS. Offline
  // deliveries skip this step: once synced, the member replies to the SMS instead.
  const [askingCode, setAskingCode] = useState(false)
  // Bumped when the saved delivery changes, so today's list shows its new status.
  const [listKey, setListKey] = useState(0)
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

  async function handleSubmit(event) {
    event.preventDefault()
    if (locked) return
    setFormError('')

    const fieldErrors = validate(form, today)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    const delivery = { memberId: form.member.id, gradeId: form.grade.id, quantityKg: parseKg(form.quantityText) }

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
        const saved = await recordDelivery({ clientUuid, ...delivery, deliveredAt: deliveredAtFor(form.date, today) })
        setReceipt(saved)
        setAskingCode(saved.confirmationStatus === 'PENDING')
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
    }
  }

  // Confirmed, disputed or reviewed ends the step; a correction keeps it open for the new delivery.
  function handleConfirmationChanged(updated) {
    setReceipt(updated)
    setListKey((key) => key + 1)
    if (updated.confirmationStatus !== 'PENDING') setAskingCode(false)
  }

  function handleRecordAnother() {
    setForm(emptyForm())
    setErrors({})
    setFormError('')
    setReceipt(null)
    setPendingReceipt(null)
    setAskingCode(false)
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

      <Tabs active={tab} onChange={changeTab} />

      {tab === 'all' && (
        <div role="tabpanel" id="delivery-panel-all" aria-labelledby="delivery-tab-all">
          <AllDeliveries />
        </div>
      )}

      <div
        role="tabpanel"
        id="delivery-panel-record"
        aria-labelledby="delivery-tab-record"
        hidden={tab !== 'record'}
        className="space-y-6"
      >
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
              <Save size={18} />
              {saving ? t('deliveries.saving') : t('deliveries.save')}
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

        <TodayDeliveries reloadKey={`${shownReceipt?.id}-${listKey}`} />
      </div>

      {askingCode && receipt && (
        <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/40 p-4 print:hidden">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="code-step-title"
            className="my-auto w-full max-w-lg rounded-xl bg-surface p-5 shadow-lg"
          >
            <h2 id="code-step-title" className="mb-4 text-lg font-semibold text-text">
              {t('codeConfirmation.title', { code: receipt.receiptCode })}
            </h2>
            <DeliveryConfirmation
              delivery={receipt}
              showDetails
              onChanged={handleConfirmationChanged}
              onClose={() => setAskingCode(false)}
            />
          </div>
        </div>
      )}

    </div>
  )
}
