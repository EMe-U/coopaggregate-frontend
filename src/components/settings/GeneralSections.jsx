import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Boxes, Building2, Coins, Info, Mail, MessageSquare, ShoppingBag, X } from 'lucide-react'
import useSettingsSection from '../../hooks/useSettingsSection'
import { cleanPhone, RWANDAN_PHONE_PATTERN } from '../../utils/phone'
import SettingsSection, { SaveBar } from './SettingsSection'
import Switch from './Switch'
import { inputClass, labelClass } from './fieldClasses'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// The backend keeps at most 10 committee emails.
const MAX_EMAILS = 10

function Field({ id, label, error, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
      {error ? <p className="mt-1 text-sm text-danger">{error}</p> : hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}

// Positive number with at most two decimals, or null when it is not one.
function parseAmount(text) {
  const value = String(text ?? '').trim().replace(',', '.')
  return /^\d+(\.\d{1,2})?$/.test(value) && Number(value) > 0 ? Number(value) : null
}

export function CooperativeSection({ settings, onSaved }) {
  const { t } = useTranslation()
  const section = useSettingsSection(settings, ['cooperativeEmail', 'cooperativePhone', 'location'], onSaved)
  const [errors, setErrors] = useState({})
  const { draft } = section

  function handleSave() {
    const found = {}
    if (draft.cooperativeEmail?.trim() && !EMAIL_PATTERN.test(draft.cooperativeEmail.trim())) {
      found.cooperativeEmail = t('settings.errors.email')
    }
    if (draft.cooperativePhone?.trim() && !RWANDAN_PHONE_PATTERN.test(cleanPhone(draft.cooperativePhone))) {
      found.cooperativePhone = t('settings.errors.phone')
    }
    setErrors(found)
    if (Object.keys(found).length === 0) section.save()
  }

  const fields = [
    { key: 'cooperativePhone', type: 'tel', hint: t('settings.cooperative.phoneHint') },
    { key: 'cooperativeEmail', type: 'email' },
    { key: 'location', type: 'text' },
  ]

  return (
    <SettingsSection icon={Building2} title={t('settings.cooperative.title')} subtitle={t('settings.cooperative.subtitle')}>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(({ key, type, hint }) => (
          <Field key={key} id={`settings-${key}`} label={t(`settings.cooperative.${key}`)} error={errors[key]} hint={hint}>
            <input
              id={`settings-${key}`}
              type={type}
              value={draft[key] ?? ''}
              onChange={(event) => {
                section.setField(key, event.target.value)
                setErrors((current) => ({ ...current, [key]: undefined }))
              }}
              maxLength={150}
              className={inputClass}
            />
          </Field>
        ))}
      </div>
      <SaveBar dirty={section.dirty} saving={section.saving} message={section.message} onSave={handleSave} />
    </SettingsSection>
  )
}

// The deduction is set on the backend and only shown here.
export function DeductionSection({ settings }) {
  const { t } = useTranslation()

  return (
    <SettingsSection icon={Coins} title={t('settings.deduction.title')} subtitle={t('settings.deduction.subtitle')}>
      <div className="rounded-lg bg-background p-4">
        <p className={labelClass}>{t('settings.deduction.label')}</p>
        <p className="text-2xl font-semibold text-text">
          {settings.deductionPerKg} <span className="text-sm font-normal text-muted">{t('settings.deduction.unit')}</span>
        </p>
        <p className="mt-1 text-xs text-muted">{t('settings.deduction.kept')}</p>
      </div>
      <p className="mt-3 text-xs text-muted">{t('settings.deduction.readOnly')}</p>
    </SettingsSection>
  )
}

export function OrdersSection({ settings, onSaved }) {
  const { t } = useTranslation()
  const section = useSettingsSection(settings, ['minOrderKg'], onSaved)
  const [error, setError] = useState('')

  function handleSave() {
    if (parseAmount(section.draft.minOrderKg) === null) {
      setError(t('settings.errors.positive'))
      return
    }
    section.save()
  }

  return (
    <SettingsSection icon={ShoppingBag} title={t('settings.orders.title')} subtitle={t('settings.orders.subtitle')}>
      <Field id="settings-min-order" label={t('settings.orders.minOrderKg')} error={error}>
        <div className="relative max-w-xs">
          <input
            id="settings-min-order"
            type="text"
            inputMode="decimal"
            value={section.draft.minOrderKg ?? ''}
            onChange={(event) => {
              section.setField('minOrderKg', event.target.value)
              setError('')
            }}
            className={`${inputClass} pr-12`}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">kg</span>
        </div>
      </Field>
      <SaveBar dirty={section.dirty} saving={section.saving} message={section.message} onSave={handleSave} />
    </SettingsSection>
  )
}

// The size of new lots. It can change at any time with a reason, which goes to the change history.
// Each lot keeps the size it was started with, so the lot being filled and older lots do not change.
const REASON_MIN = 10
const REASON_MAX = 500

export function LotSizeSection({ settings, onSaved }) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  const section = useSettingsSection(settings, ['lotSizeKg'], (saved) => {
    setReason('')
    onSaved(saved)
  })
  const [error, setError] = useState('')
  const [reasonError, setReasonError] = useState('')
  // A size typed differently but equal ("100.0") is not a change and needs no reason.
  const changed = section.dirty && parseAmount(section.draft.lotSizeKg) !== Number(settings.lotSizeKg)

  function handleSave() {
    const size = parseAmount(section.draft.lotSizeKg)
    if (size === null || size > 100000) {
      setError(t('settings.lotSize.invalid'))
      return
    }
    const trimmed = reason.trim()
    if (changed && (trimmed.length < REASON_MIN || trimmed.length > REASON_MAX)) {
      setReasonError(t('settings.lotSize.reasonInvalid', { min: REASON_MIN, max: REASON_MAX }))
      return
    }
    section.save(changed ? { lotSizeReason: trimmed } : {})
  }

  return (
    <SettingsSection icon={Boxes} title={t('settings.lotSize.title')} subtitle={t('settings.lotSize.subtitle')}>
      <Field id="settings-lot-size" label={t('settings.lotSize.label')} error={error} hint={t('settings.lotSize.hint')}>
        <div className="relative max-w-xs">
          <input
            id="settings-lot-size"
            type="text"
            inputMode="decimal"
            value={section.draft.lotSizeKg ?? ''}
            onChange={(event) => {
              section.setField('lotSizeKg', event.target.value)
              setError('')
            }}
            className={`${inputClass} pr-12`}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">kg</span>
        </div>
      </Field>
      {changed && (
        <div className="mt-4 space-y-3">
          <p className="flex items-start gap-1.5 rounded-lg bg-background p-3 text-sm text-muted">
            <Info size={16} className="mt-0.5 shrink-0 text-primary" />
            {t('settings.lotSize.newLotsOnly')}
          </p>
          <div>
            <label htmlFor="settings-lot-size-reason" className={labelClass}>
              {t('settings.lotSize.reason')}
            </label>
            <textarea
              id="settings-lot-size-reason"
              rows={3}
              required
              maxLength={REASON_MAX}
              value={reason}
              aria-invalid={Boolean(reasonError)}
              aria-describedby="settings-lot-size-reason-help"
              onChange={(event) => {
                setReason(event.target.value)
                setReasonError('')
              }}
              className={`${inputClass} py-2`}
            />
            <div id="settings-lot-size-reason-help" className="mt-1 flex flex-wrap justify-between gap-x-3 text-xs">
              {reasonError ? (
                <p className="text-sm text-danger">{reasonError}</p>
              ) : (
                <p className="text-muted">{t('settings.lotSize.reasonHint', { min: REASON_MIN, max: REASON_MAX })}</p>
              )}
              <p className="ml-auto text-muted" aria-live="polite">
                {reason.trim().length} / {REASON_MAX}
              </p>
            </div>
          </div>
        </div>
      )}
      <SaveBar dirty={section.dirty} saving={section.saving} message={section.message} onSave={handleSave} />
    </SettingsSection>
  )
}

export function SmsSection({ settings, onSaved }) {
  const { t } = useTranslation()
  const section = useSettingsSection(settings, ['smsEnabled'], onSaved)

  return (
    <SettingsSection
      icon={MessageSquare}
      title={t('settings.sms.title')}
      subtitle={t('settings.sms.subtitle')}
      badge={
        <Switch
          checked={Boolean(section.draft.smsEnabled)}
          onChange={(checked) => section.setField('smsEnabled', checked)}
          label={t('settings.sms.title')}
        />
      }
    >
      <p className="rounded-lg bg-background p-3 text-sm text-muted">
        {section.draft.smsEnabled ? t('settings.sms.on') : t('settings.sms.off')}
      </p>
      <SaveBar dirty={section.dirty} saving={section.saving} message={section.message} onSave={() => section.save()} />
    </SettingsSection>
  )
}

export function CommitteeEmailsSection({ settings, onSaved }) {
  const { t } = useTranslation()
  const section = useSettingsSection(settings, ['committeeEmails'], onSaved)
  const [newEmail, setNewEmail] = useState('')
  const [error, setError] = useState('')
  const emails = section.draft.committeeEmails ?? []

  function handleAdd(event) {
    event.preventDefault()
    const email = newEmail.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(email)) setError(t('settings.errors.email'))
    else if (emails.includes(email)) setError(t('settings.committee.duplicate'))
    else if (emails.length >= MAX_EMAILS) setError(t('settings.committee.tooMany', { count: MAX_EMAILS }))
    else {
      section.setField('committeeEmails', [...emails, email])
      setNewEmail('')
      setError('')
    }
  }

  return (
    <SettingsSection icon={Mail} title={t('settings.committee.title')} subtitle={t('settings.committee.subtitle')}>
      {emails.length === 0 ? (
        <p className="rounded-lg bg-background p-3 text-sm text-muted">{t('settings.committee.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {emails.map((email) => (
            <li key={email} className="flex items-center justify-between gap-2 rounded-lg bg-background px-3 py-1 text-sm">
              <span className="min-w-0 truncate">{email}</span>
              <button
                type="button"
                onClick={() => section.setField('committeeEmails', emails.filter((item) => item !== email))}
                aria-label={t('settings.committee.remove', { email })}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-danger hover:bg-danger/10"
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleAdd} noValidate className="mt-3 flex flex-wrap gap-2">
        <label htmlFor="settings-new-email" className="sr-only">
          {t('settings.committee.newEmail')}
        </label>
        <input
          id="settings-new-email"
          type="email"
          value={newEmail}
          onChange={(event) => {
            setNewEmail(event.target.value)
            setError('')
          }}
          placeholder={t('settings.committee.placeholder')}
          className={`${inputClass} min-w-0 flex-1 basis-48`}
        />
        <button type="submit" className="min-h-11 rounded-lg bg-background px-4 text-sm font-medium text-text hover:bg-text/10">
          {t('settings.committee.add')}
        </button>
      </form>
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
      <p className="mt-3 text-xs text-muted">{t('settings.committee.note')}</p>
      <SaveBar dirty={section.dirty} saving={section.saving} message={section.message} onSave={() => section.save()} />
    </SettingsSection>
  )
}
