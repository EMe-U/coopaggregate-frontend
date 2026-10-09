import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { createMember, updateMember } from '../../api/members'
import { todayIso } from '../../utils/format'

// Same rules as the backend's MemberRequest.
const PHONE_PATTERN = /^(\+250|250|0)7[2389]\d{7}$/
const NATIONAL_ID_PATTERN = /^\d{16}$/

// The backend stores +2507XXXXXXXX; the manager is used to typing 07XXXXXXXX.
function toLocalPhone(phone) {
  return phone?.startsWith('+250') ? `0${phone.slice(4)}` : (phone ?? '')
}

function initialValues(member) {
  return {
    fullName: member?.fullName ?? '',
    phone: toLocalPhone(member?.phone),
    nationalId: member?.nationalId ?? '',
    address: member?.address ?? '',
    joinDate: member?.joinDate ?? todayIso(),
    preferredLanguage: member?.preferredLanguage ?? 'rw',
  }
}

function toRequest(values) {
  return {
    fullName: values.fullName.trim(),
    phone: values.phone.replace(/\s/g, ''),
    nationalId: values.nationalId.trim() || null,
    address: values.address.trim() || null,
    joinDate: values.joinDate,
    preferredLanguage: values.preferredLanguage,
  }
}

function validate(request) {
  const errors = {}
  if (!request.fullName) errors.fullName = 'members.form.errors.fullNameRequired'
  if (!PHONE_PATTERN.test(request.phone)) errors.phone = 'members.form.errors.phoneInvalid'
  if (request.nationalId && !NATIONAL_ID_PATTERN.test(request.nationalId)) {
    errors.nationalId = 'members.form.errors.nationalIdInvalid'
  }
  if (!request.joinDate) {
    errors.joinDate = 'members.form.errors.joinDateRequired'
  } else if (request.joinDate > todayIso()) {
    errors.joinDate = 'members.form.errors.joinDateFuture'
  }
  return errors
}

const inputClass =
  'w-full rounded-md border border-text/10 bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

function Field({ id, label, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-text">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-danger">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-muted">{hint}</p>
      )}
    </div>
  )
}

export default function MemberFormModal({ member, onClose, onSaved }) {
  const { t } = useTranslation()
  const isEdit = Boolean(member)

  const [values, setValues] = useState(() => initialValues(member))
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, saving])

  function setValue(name, value) {
    setValues((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    const request = toRequest(values)
    const errors = validate(request)
    setFieldErrors(Object.fromEntries(Object.entries(errors).map(([field, key]) => [field, t(key)])))
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    try {
      const saved = isEdit ? await updateMember(member.id, request) : await createMember(request)
      onSaved(saved)
    } catch (error) {
      setFormError(
        error.response ? t('members.form.errors.generic') : t('members.form.errors.serverUnreachable'),
      )
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-form-title"
        className="w-full max-w-lg rounded-xl bg-surface shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-text/5 px-5 py-4">
          <h2 id="member-form-title" className="text-lg font-semibold text-text">
            {isEdit ? t('members.form.editTitle') : t('members.form.addTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md p-1 text-muted hover:bg-background hover:text-text"
            aria-label={t('members.form.close')}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 px-5 py-4">
          {formError && (
            <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          )}

          <Field id="fullName" label={t('members.form.fullName')} error={fieldErrors.fullName}>
            <input
              id="fullName"
              value={values.fullName}
              onChange={(event) => setValue('fullName', event.target.value)}
              className={inputClass}
              maxLength={150}
              autoFocus
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="phone"
              label={t('members.form.phone')}
              hint={t('members.form.phoneHint')}
              error={fieldErrors.phone}
            >
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                value={values.phone}
                onChange={(event) => setValue('phone', event.target.value)}
                className={inputClass}
              />
            </Field>

            <Field
              id="nationalId"
              label={`${t('members.form.nationalId')} ${t('members.form.optional')}`}
              error={fieldErrors.nationalId}
            >
              <input
                id="nationalId"
                inputMode="numeric"
                value={values.nationalId}
                onChange={(event) => setValue('nationalId', event.target.value)}
                className={inputClass}
                maxLength={16}
              />
            </Field>
          </div>

          <Field
            id="address"
            label={`${t('members.form.address')} ${t('members.form.optional')}`}
            error={fieldErrors.address}
          >
            <input
              id="address"
              value={values.address}
              onChange={(event) => setValue('address', event.target.value)}
              className={inputClass}
              maxLength={255}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="joinDate" label={t('members.form.joinDate')} error={fieldErrors.joinDate}>
              <input
                id="joinDate"
                type="date"
                value={values.joinDate}
                max={todayIso()}
                onChange={(event) => setValue('joinDate', event.target.value)}
                className={inputClass}
              />
            </Field>

            <Field
              id="preferredLanguage"
              label={t('members.form.preferredLanguage')}
              error={fieldErrors.preferredLanguage}
            >
              <select
                id="preferredLanguage"
                value={values.preferredLanguage}
                onChange={(event) => setValue('preferredLanguage', event.target.value)}
                className={inputClass}
              >
                <option value="rw">{t('language.rw')}</option>
                <option value="en">{t('language.en')}</option>
              </select>
            </Field>
          </div>

          <div className="flex justify-end gap-2 border-t border-text/5 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-text/10 px-4 py-2 text-sm font-medium text-text hover:bg-background"
            >
              {t('members.form.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? t('members.form.saving') : t('members.form.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
