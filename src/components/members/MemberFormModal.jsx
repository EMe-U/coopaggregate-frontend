import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Lock, ShieldCheck, X } from 'lucide-react'
import { createMember, updateMember } from '../../api/members'
import { errorCode, verificationErrorMessage } from '../../members/identityVerification'
import { genderLabel, maskNationalId, verifiedFieldsOf } from '../../members/memberDetails'
import { formatAddress, formatDate, todayIso } from '../../utils/format'
import { RWANDAN_PHONE_PATTERN, cleanPhone } from '../../utils/phone'
import { VerifiedMark } from './VerifiedBadge'

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

// A new member gets every verified detail from the verification: only what the manager typed is
// sent. A value for a verified field (even empty) is refused, and so is a birth date, gender or
// email, which only come from the check; the address is typed only when it was not verified.
function toNewMemberRequest(values, verification) {
  const nationalId = values.nationalId.trim()
  const address = verifiedFieldsOf(verification).includes('address') ? '' : values.address.trim()
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

// A read-only text that grows to show all of its value, at any width.
function LockedText({ id, value, className }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const element = ref.current
    function fit() {
      element.style.height = 'auto'
      element.style.height = `${element.scrollHeight + 2}px`
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [value])
  return <textarea ref={ref} id={id} value={value} readOnly aria-readonly="true" rows={1} className={className} />
}

// A verified value: shown, never typed. multiline wraps a long value (an address) instead of
// hiding most of it in a one-line box.
function LockedField({ id, label, value, error, multiline }) {
  const lockedClass = `${inputClass} cursor-not-allowed bg-background pr-9`
  return (
    <Field
      id={id}
      label={
        <>
          {label}
          <VerifiedMark />
        </>
      }
      error={error}
    >
      <div className="relative">
        {multiline ? (
          <LockedText id={id} value={value} className={`${lockedClass} block resize-none overflow-hidden break-words`} />
        ) : (
          <input id={id} value={value} readOnly aria-readonly="true" className={lockedClass} />
        )}
        <Lock size={14} className="pointer-events-none absolute right-3 top-3 text-muted" />
      </div>
    </Field>
  )
}

// The verified details of a member or a verification, in form order, with how each is shown.
// Only details named in verifiedFields and with a value; the address is left out when asked
// (editing keeps it editable).
function lockedDetails(t, source, { withAddress = true } = {}) {
  const fields = verifiedFieldsOf(source)
  const birthdate = source.birthdate ?? source.birthDate
  const all = [
    { field: 'fullName', id: 'fullName', label: t('members.form.fullName'), value: source.fullName },
    { field: 'phone', id: 'phone', label: t('members.form.phone'), value: toLocalPhone(source.phone) },
    { field: 'birthdate', id: 'birthDate', label: t('members.form.birthDate'), value: formatDate(birthdate) },
    { field: 'gender', id: 'gender', label: t('members.form.gender'), value: genderLabel(t, source.gender) },
    { field: 'email', id: 'email', label: t('members.form.email'), value: source.email },
    withAddress && { field: 'address', id: 'address', label: t('members.form.address'), value: formatAddress(source.address), multiline: true },
  ]
  return all.filter((detail) => detail && fields.includes(detail.field) && detail.value)
}

// "Full name, Phone, Birth date" for the note under the verified details.
function lockedNote(t, details) {
  return t('members.form.verifiedLocked', { fields: details.map((detail) => detail.label).join(', ') })
}

// Short details two by two; the name and the address take the whole width.
function LockedDetails({ details, errors }) {
  const wide = (detail) => detail.field === 'fullName' || detail.field === 'address'
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {details.map((detail) => (
        <div key={detail.field} className={wide(detail) ? 'sm:col-span-2' : undefined}>
          <LockedField
            id={detail.id}
            label={detail.label}
            value={detail.value}
            error={errors[detail.id]}
            multiline={detail.multiline}
          />
        </div>
      ))}
    </div>
  )
}

// The new member's verified details, with the time left to save them.
function VerifiedIdentity({ verification, now, errors }) {
  const { t } = useTranslation()
  const details = lockedDetails(t, verification)
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
      <LockedDetails details={details} errors={errors} />
      <p className="text-xs text-muted">{lockedNote(t, details)}</p>
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
  // A saved national ID is shown masked and read-only until the manager goes into the field to
  // change it; left unchanged, it is masked again.
  const [nationalIdMasked, setNationalIdMasked] = useState(() => isEdit && Boolean(member.nationalId))

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
    } else if (status === 400 && error.response.data?.code === 'VERIFIED_FIELD_LOCKED') {
      // A verified detail was sent: a fault of this page, never of the manager.
      onVerificationGone(t('members.form.errors.generic'))
    } else if (status === 400) {
      // Errors about the fields typed here are shown by them; anything else (such as a birth date
      // that should never have been sent) is a fault of this page.
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

  // Editing: verified details are shown locked (the address excepted: it stays editable, and a
  // changed address is no longer the verified one, so its mark goes as soon as it differs).
  const editLocked = isEdit ? lockedDetails(t, member, { withAddress: false }) : []
  const lockedInEdit = (field) => editLocked.some((detail) => detail.field === field)
  const lockedById = (id) => editLocked.find((detail) => detail.id === id)
  const editExtras = editLocked.filter((detail) => !['fullName', 'phone'].includes(detail.field))
  const addressVerified = isEdit
    ? verifiedFieldsOf(member).includes('address') && values.address.trim() === (member.address ?? '').trim()
    : verifiedFieldsOf(verification).includes('address')

  // Beside the national ID for a new member, unless the check verified it; on its own line when
  // editing, as before.
  const addressField = (
    <Field
      id="address"
      label={
        isEdit && addressVerified ? (
          <>
            {t('members.form.address')}
            <VerifiedMark />
          </>
        ) : (
          `${t('members.form.address')} ${t('members.form.optional')}`
        )
      }
      error={fieldErrors.address}
    >
      <input
        id="address"
        value={values.address}
        onChange={(event) => setValue('address', event.target.value)}
        className={inputClass}
        maxLength={isEdit ? 500 : 255}
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

          {isEdit && lockedInEdit('fullName') ? (
            <LockedField
              id="fullName"
              label={lockedById('fullName').label}
              value={lockedById('fullName').value}
              error={fieldErrors.fullName}
            />
          ) : isEdit ? (
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
            {isEdit && lockedInEdit('phone') && (
              <LockedField id="phone" label={lockedById('phone').label} value={lockedById('phone').value} error={fieldErrors.phone} />
            )}
            {isEdit && !lockedInEdit('phone') && (
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
                value={nationalIdMasked ? maskNationalId(values.nationalId) : values.nationalId}
                readOnly={nationalIdMasked}
                onFocus={() => setNationalIdMasked(false)}
                onBlur={() => {
                  if (isEdit && values.nationalId && values.nationalId === (member.nationalId ?? '')) setNationalIdMasked(true)
                }}
                onChange={(event) => setValue('nationalId', event.target.value)}
                className={inputClass}
                maxLength={16}
                autoFocus={!isEdit}
              />
            </Field>

            {!isEdit && !addressVerified && addressField}
          </div>

          {editExtras.length > 0 && <LockedDetails details={editExtras} errors={fieldErrors} />}

          {editLocked.length > 0 && <p className="text-xs text-muted">{lockedNote(t, editLocked)}</p>}

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
