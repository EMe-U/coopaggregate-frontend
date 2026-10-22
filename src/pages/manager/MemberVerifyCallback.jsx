import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShieldAlert } from 'lucide-react'
import { completeIdentityVerification } from '../../api/members'
import EmptyState from '../../components/EmptyState'
import { keepVerification, verificationErrorMessage } from '../../members/identityVerification'

const BACK_TO_FORM = '/members?register=1'

// The identity provider sends the member back here with a code and the state. The result is kept
// in memory and the registration form opens again with the values typed before leaving.
export default function MemberVerifyCallback() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')
  // A state works only once, so the request must not be sent twice (React runs effects twice in
  // development).
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    sent.current = true
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    if (!code || !state) {
      setError(t('memberVerification.errors.startAgain'))
      return
    }
    completeIdentityVerification(code, state)
      .then((result) => {
        keepVerification(result)
        navigate(BACK_TO_FORM, { replace: true })
      })
      .catch((requestError) => setError(verificationErrorMessage(t, requestError)))
  }, [searchParams, navigate, t])

  if (!error) return <div className="h-48 animate-pulse rounded-xl bg-surface shadow-sm" />

  return (
    <div className="rounded-xl bg-surface shadow-sm">
      <EmptyState icon={ShieldAlert} title={t('memberVerification.failedTitle')} message={error}>
        <button
          type="button"
          onClick={() => navigate(BACK_TO_FORM, { replace: true })}
          className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90"
        >
          {t('memberVerification.backToForm')}
        </button>
      </EmptyState>
    </div>
  )
}
