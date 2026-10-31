import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const [error, setError] = useState('')
  // A state works only once, so the request must not be sent twice (React runs effects twice in
  // development).
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    sent.current = true
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    const request = code && state ? completeIdentityVerification(code, state) : null
    // Once sent, the code and the state must not stay in the address bar or the browser history.
    // The router's own history entry is kept, so only the query string goes.
    window.history.replaceState(window.history.state, '', window.location.pathname)
    if (!request) {
      setError(t('memberVerification.errors.startAgain'))
      return
    }
    request
      .then((result) => {
        keepVerification(result)
        navigate(BACK_TO_FORM, { replace: true })
      })
      .catch((requestError) => setError(verificationErrorMessage(t, requestError)))
  }, [navigate, t])

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
