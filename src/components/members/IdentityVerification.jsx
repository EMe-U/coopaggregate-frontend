import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlaskConical, ShieldCheck } from 'lucide-react'
import { completeIdentityVerification, startIdentityVerification } from '../../api/members'
import useNeedsInternet from '../../hooks/useNeedsInternet'
import { saveRegistrationDraft, verificationErrorMessage } from '../../members/identityVerification'

function timeLeft(useBefore, now) {
  const seconds = Math.max(0, Math.floor((new Date(useBefore).getTime() - now) / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

// The identity step of the registration form. A real provider takes the member to its own page
// (the form values wait in sessionStorage, see members/identityVerification.js); the MOCK provider
// is completed here with any code. verification is the completed result, kept by the form.
export default function IdentityVerification({ verification, onVerified, onExpired, getDraft }) {
  const { t } = useTranslation()
  const needsInternet = useNeedsInternet()
  // Set while the MOCK provider waits for a code: the state from start.
  const [mockState, setMockState] = useState(null)
  const [code, setCode] = useState('')
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
    try {
      const started = await startIdentityVerification()
      if (started.authorizationUrl) {
        saveRegistrationDraft(getDraft())
        window.location.assign(started.authorizationUrl)
        return
      }
      // Only the MOCK provider is completed here, with any code.
      if (started.provider === 'MOCK') setMockState(started.state)
      else setError(t('memberVerification.errors.unavailable'))
    } catch (requestError) {
      setError(verificationErrorMessage(t, requestError))
    }
    setBusy(false)
  }

  // This box sits inside the member form, so it is not a form of its own (forms cannot be nested).
  async function handleMockCode() {
    if (!code.trim()) return
    setBusy(true)
    setError('')
    try {
      onVerified(await completeIdentityVerification(code.trim(), mockState))
    } catch (requestError) {
      setError(verificationErrorMessage(t, requestError))
    } finally {
      // A state works once, even when the check fails, so a new try starts again.
      setMockState(null)
      setCode('')
      setBusy(false)
    }
  }

  if (verification && !expired) {
    // A test verification checked no real identity, so it must not look like a real one.
    const isTest = verification.method === 'MOCK'
    return (
      <div
        role="status"
        className={`flex items-start gap-3 rounded-lg p-3 text-sm ${isTest ? 'bg-background text-muted' : 'bg-primary-light text-primary'}`}
      >
        {isTest ? <FlaskConical size={20} className="mt-0.5 shrink-0" /> : <ShieldCheck size={20} className="mt-0.5 shrink-0" />}
        <div>
          <p className="font-semibold">
            {isTest
              ? t('memberVerification.testVerified')
              : t('memberVerification.verified', {
                  method: t(`memberVerification.method.${verification.method}`, { defaultValue: verification.method }),
                })}
          </p>
          <p className="text-xs">{t('memberVerification.saveWithin', { time: timeLeft(verification.useBefore, now) })}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border border-text/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text">{t('memberVerification.title')}</p>
          <p className="text-xs text-muted">{t('memberVerification.subtitle')}</p>
        </div>
        {!mockState && (
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
        )}
      </div>

      {mockState && (
        <div className="rounded-lg bg-warning/15 p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-800">
            <FlaskConical size={16} />
            {t('memberVerification.mock.title')}
          </p>
          <p className="mt-1 text-xs text-amber-800">{t('memberVerification.mock.explanation')}</p>
          <div className="mt-2 flex gap-2">
            <label htmlFor="mock-identity-code" className="sr-only">
              {t('memberVerification.mock.code')}
            </label>
            <input
              id="mock-identity-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return
                event.preventDefault()
                handleMockCode()
              }}
              placeholder={t('memberVerification.mock.code')}
              disabled={busy}
              className="min-h-11 w-full min-w-0 rounded-md border border-text/10 bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={handleMockCode}
              disabled={busy || !code.trim()}
              className="min-h-11 shrink-0 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
            >
              {t('memberVerification.mock.check')}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
