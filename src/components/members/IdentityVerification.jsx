import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldCheck } from 'lucide-react'
import { startIdentityVerification } from '../../api/members'
import useNeedsInternet from '../../hooks/useNeedsInternet'
import {
  clearRegistrationDraft,
  saveRegistrationDraft,
  verificationErrorMessage,
} from '../../members/identityVerification'

function timeLeft(useBefore, now) {
  const seconds = Math.max(0, Math.floor((new Date(useBefore).getTime() - now) / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

// The identity step of the registration form. The member is taken to the provider's page (the form
// values wait in sessionStorage, see members/identityVerification.js) and comes back on
// /identity/callback. verification is the completed result, kept by the form; fieldError is an
// error from saving the member that belongs to this step.
export default function IdentityVerification({ verification, onExpired, getDraft, fieldError }) {
  const { t } = useTranslation()
  const needsInternet = useNeedsInternet()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => Date.now())

  // The verification must be used within 30 minutes; count down and drop it when it runs out.
  useEffect(() => {
    if (!verification) return undefined
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [verification])

  const expired = verification && new Date(verification.useBefore).getTime() <= now
  useEffect(() => {
    if (expired) {
      setError(t('memberVerification.errors.expired'))
      onExpired()
    }
  }, [expired, onExpired, t])

  async function handleStart() {
    setBusy(true)
    setError('')
    saveRegistrationDraft(getDraft())
    try {
      const started = await startIdentityVerification()
      window.location.assign(started.authorizationUrl)
      return
    } catch (requestError) {
      clearRegistrationDraft()
      setError(verificationErrorMessage(t, requestError))
    }
    setBusy(false)
  }

  if (verification && !expired) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-lg bg-primary-light p-3 text-sm text-primary">
        <ShieldCheck size={20} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">
            {t('memberVerification.verified', {
              method: t(`memberVerification.method.${verification.method}`, { defaultValue: verification.method }),
            })}
          </p>
          <p className="text-xs">{t('memberVerification.saveWithin', { time: timeLeft(verification.useBefore, now) })}</p>
        </div>
      </div>
    )
  }

  const shownError = fieldError || error
  return (
    <div className={`space-y-3 rounded-lg border p-3 ${fieldError ? 'border-danger/40' : 'border-text/10'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text">{t('memberVerification.title')}</p>
          <p className="text-xs text-muted">{t('memberVerification.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={handleStart}
          disabled={busy || needsInternet.offline}
          title={needsInternet.title}
          className="flex min-h-11 items-center gap-2 rounded-lg border border-primary/30 px-3 text-sm font-medium text-primary hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ShieldCheck size={16} />
          {busy ? t('memberVerification.starting') : t('memberVerification.start')}
        </button>
      </div>

      {!shownError && <p className="text-xs text-muted">{t('memberVerification.requiredHint')}</p>}
      {shownError && (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {shownError}
        </p>
      )}
    </div>
  )
}
