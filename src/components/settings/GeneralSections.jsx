import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Building2, Coins, Mail, MessageSquare, ShoppingBag, X } from 'lucide-react'
import useSettingsSection from '../../hooks/useSettingsSection'
import { cleanPhone, RWANDAN_PHONE_PATTERN } from '../../utils/phone'
import ConfirmDialog from '../ConfirmDialog'
import SettingsSection, { SaveBar } from './SettingsSection'
import Switch from './Switch'
import { inputClass, labelClass } from './fieldClasses'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// The backend keeps at most 10 committee emails.
const MAX_EMAILS = 10

function Field({ id, label, error, children }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
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
  const section = useSettingsSection(
    settings,
    ['cooperativeName', 'cooperativePhone', 'cooperativeEmail', 'location'],
    onSaved,
  )
  const [errors, setErrors] = useState({})
  const { draft } = section

  function handleSave() {
    const found = {}
    const phone = draft.cooperativePhone ? cleanPhone(draft.cooperativePhone) : ''
    if (phone && !RWANDAN_PHONE_PATTERN.test(phone)) found.cooperativePhone = t('settings.errors.phone')
    if (draft.cooperativeEmail?.trim() && !EMAIL_PATTERN.test(draft.cooperativeEmail.trim())) {
      found.cooperativeEmail = t('settings.errors.email')
    }
    setErrors(found)
    if (Object.keys(found).length === 0) section.save()
  }

  const fields = [
    { key: 'cooperativeName', type: 'text' },
    { key: 'cooperativePhone', type: 'tel' },
    { key: 'cooperativeEmail', type: 'email' },
    { key: 'location', type: 'text' },
  ]

  return (
    <SettingsSection icon={Building2} title={t('settings.cooperative.title')} subtitle={t('settings.cooperative.subtitle')}>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(({ key, type }) => (
          <Field key={key} id={`settings-${key}`} label={t(`settings.cooperative.${key}`)} error={errors[key]}>
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

export function DeductionSection({ settings, onSaved }) {
  const { t } = useTranslation()
  const section = useSettingsSection(settings, ['deductionPerKg'], onSaved)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const value = section.draft.deductionPerKg ?? ''

  function handleSave() {
    if (!/^\d+$/.test(String(value).trim())) {
      setError(t('settings.errors.wholeNumber'))
      return
    }
    setConfirming(true)
  }

  async function handleConfirm() {
    setConfirming(false)
    await section.save()
  }

  return (
    <SettingsSection
      icon={Coins}
      title={t('settings.deduction.title')}
      subtitle={t('settings.deduction.subtitle')}
      badge={
        <span className="rounded-md bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
          {t('settings.deduction.badge')}
        </span>
      }
    >
      <div className="max-w-xs rounded-lg bg-background p-4">
        <label htmlFor="settings-deduction" className={labelClass}>
          {t('settings.deduction.label')}
        </label>
        <div className="relative">
          <input
            id="settings-deduction"
            type="text"
            inputMode="numeric"
            value={value}
            onChange={(event) => {
              section.setField('deductionPerKg', event.target.value)
              setError('')
            }}
            className={`${inputClass} bg-surface pr-20`}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">
            {t('settings.deduction.unit')}
          </span>
        </div>
        {error && <p className="mt-1 text-sm text-danger">{error}</p>}
        <p className="mt-2 text-xs text-muted">{t('settings.deduction.kept')}</p>
      </div>
      <p className="mt-3 text-sm text-amber-800">{t('settings.deduction.newOnly')}</p>
      <SaveBar dirty={section.dirty} saving={section.saving} message={section.message} onSave={handleSave} />
      {confirming && (
        <ConfirmDialog
          title={t('settings.deduction.confirmTitle')}
          message={t('settings.deduction.confirmMessage', { amount: String(value).trim() })}
          confirmLabel={t('settings.deduction.confirm')}
          cancelLabel={t('settings.cancel')}
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
        />
      )}
    </SettingsSection>
  )
}

export function BuyerPageSection({ settings, onSaved }) {
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
    <SettingsSection icon={ShoppingBag} title={t('settings.buyerPage.title')} subtitle={t('settings.buyerPage.subtitle')}>
      <Field id="settings-min-order" label={t('settings.buyerPage.minOrderKg')} error={error}>
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
      <SaveBar dirty={section.dirty} saving={section.saving} message={section.message} onSave={section.save} />
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
      <SaveBar dirty={section.dirty} saving={section.saving} message={section.message} onSave={section.save} />
    </SettingsSection>
  )
}
