import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Lock, ShieldCheck, X } from 'lucide-react'
import { createMember, updateMember } from '../../api/members'
import { errorCode, verificationErrorMessage } from '../../members/identityVerification'
import { todayIso } from '../../utils/format'
import { RWANDAN_PHONE_PATTERN, cleanPhone } from '../../utils/phone'

// Same rules as the backend's MemberRequest.
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
    phone: cleanPhone(values.phone),
    nationalId: values.nationalId.trim() || null,
    address: values.address.trim() || null,
    joinDate: values.joinDate,
    preferredLanguage: values.preferredLanguage,
  }
}

// A new member gets the name and phone of the verification: they are never sent.
function toNewMemberRequest(values, verification) {
  const nationalId = values.nationalId.trim()
  const address = values.address.trim()
  return {
    verificationId: verification.verificationId,
    ...(nationalId && { nationalId }),
    ...(address && { address }),
    joinDate: values.joinDate,
    preferredLanguage: values.preferredLanguage,
  }
}

// The name and phone are only checked when editing; a new member's come from the verification.
function validate(request) {
  const errors = {}
  if ('fullName' in request && !request.fullName) errors.fullName = 'members.form.errors.fullNameRequired'
  if ('phone' in request && !RWANDAN_PHONE_PATTERN.test(request.phone)) errors.phone = 'members.form.errors.phoneInvalid'
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

// The backend sends all field errors in one message: "fullName: is required; phone: must be ...".
function parseFieldErrors(message, fields) {
  const fieldErrors = {}
  const otherErrors = []
  for (const part of message.split('; ')) {
    const separator = part.indexOf(': ')
    const field = part.slice(0, separator)
    if (separator > 0 && fields.includes(field)) {
      fieldErrors[field] = part.slice(separator + 2)
    } else {
      otherErrors.push(part)
    }
  }
  return { fieldErrors, otherErrors }
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

function timeLeft(useBefore, now) {
  const seconds = Math.max(0, Math.floor((new Date(useBefore).getTime() - now) / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

// A verified value: shown, never typed or sent.
function LockedField({ id, label, value, error }) {
  return (
    <Field id={id} label={label} error={error}>
      <div className="relative">
        <input
          id={id}
          value={value}
          readOnly
          aria-readonly="true"
          className={`${inputClass} cursor-not-allowed bg-background pr-9`}
        />
        <Lock size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
      </div>
    </Field>
  )
}

// The new member's verified name and phone, with the time left to save them.
function VerifiedIdentity({ verification, now, errors }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-3 rounded-lg border border-primary/20 bg-primary-light/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 rounded-md bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
          <ShieldCheck size={12} />
          {t('members.verified.badge')}
        </span>
        <p role="timer" className="text-xs text-muted">
          {t('memberVerification.saveWithin', { time: timeLeft(verification.useBefore, now) })}
        </p>
      </div>
      <LockedField id="fullName" label={t('members.form.fullName')} value={verification.fullName} error={errors.fullName} />
      <LockedField id="phone" label={t('members.form.phone')} value={toLocalPhone(verification.phone)} error={errors.phone} />
      <p className="text-xs text-muted">{t('members.form.verifiedLocked')}</p>
    </div>
  )
}

// Adds a member (verification is the completed identity check from MemberVerifyCallback, kept in
// memory only) or edits one (member). onVerificationGone closes the form with a message when the
// verification expires or can no longer be used, so the manager starts again from Add member.
export default function MemberFormModal({ member, verification, onClose, onSaved, onVerificationGone }) {
  const { t } = useTranslation()
  const isEdit = Boolean(member)

  const [values, setValues] = useState(() => initialValues(member))
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  // The verification must be used within 30 minutes: count down, then drop it.
  useEffect(() => {
    if (isEdit) return undefined
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [isEdit])
  const expired = !isEdit && new Date(verification.useBefore).getTime() <= now
  useEffect(() => {
    if (expired) onVerificationGone(t('memberVerification.errors.expired'))
  }, [expired, onVerificationGone, t])

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

    if (expired) return
    const request = isEdit ? toRequest(values) : toNewMemberRequest(values, verification)
    const errors = validate(request)
    setFieldErrors(Object.fromEntries(Object.entries(errors).map(([field, key]) => [field, t(key)])))
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    try {
      const saved = isEdit ? await updateMember(member.id, request) : await createMember(request)
      onSaved(saved)
    } catch (error) {
      if (isEdit) showServerError(error, Object.keys(request))
      else showCreateError(error)
      setSaving(false)
    }
  }

  // Registering failed. A verification that cannot be used (unknown, expired, used, the person is
  // already a member, verification switched off) closes the form: start again from Add member.
  // A 409 without a code is a phone or national ID of another member: shown next to the field.
  function showCreateError(error) {
    const status = error.response?.status
    const message = error.response?.data?.message ?? ''

    if (!error.response) {
      setFormError(t('members.form.errors.serverUnreachable'))
    } else if (errorCode(error) || status === 503) {
      onVerificationGone(verificationErrorMessage(t, error))
    } else if (status === 409 && /^national id/i.test(message)) {
      setFieldErrors({ nationalId: message })
    } else if (status === 409 && /^phone/i.test(message)) {
      setFieldErrors({ phone: message })
    } else if (status === 409 && message) {
      setFormError(message)
    } else if (status === 400) {
      // Errors about the fields typed here are shown by them; anything else (such as a name or
      // phone that should never have been sent) is a fault of this page.
      const { fieldErrors: serverErrors, otherErrors } = parseFieldErrors(message, [
        'nationalId',
        'address',
        'joinDate',
        'preferredLanguage',
      ])
      if (otherErrors.length > 0 || Object.keys(serverErrors).length === 0) {
        onVerificationGone(t('members.form.errors.generic'))
      } else {
        setFieldErrors(serverErrors)
      }
    } else {
      setFormError(t('members.form.errors.generic'))
    }
  }

  function showServerError(error, fields) {
    const status = error.response?.status
    const message = error.response?.data?.message

    if (!error.response) {
      setFormError(t('members.form.errors.serverUnreachable'))
    } else if (status === 400 && message) {
      const { fieldErrors: serverErrors, otherErrors } = parseFieldErrors(message, fields)
      setFieldErrors(serverErrors)
      if (otherErrors.length > 0) setFormError(otherErrors.join(' '))
    } else if ((status === 409 || status === 503) && message) {
      setFormError(message)
    } else {
      setFormError(t('members.form.errors.generic'))
    }
  }

  // Beside the national ID for a new member; on its own line when editing, as before.
  const addressField = (
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
  )

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

          {isEdit ? (
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
          ) : (
            <VerifiedIdentity verification={verification} now={now} errors={fieldErrors} />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {isEdit && (
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
            )}

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
                autoFocus={!isEdit}
              />
            </Field>

            {!isEdit && addressField}
          </div>

          {isEdit && addressField}

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
              disabled={saving || expired}
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
