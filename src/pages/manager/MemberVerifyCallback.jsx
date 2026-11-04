import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cancelIdentityVerification, completeIdentityVerification } from '../../api/members'
import { cancelledMessage, keepVerification, verificationErrorMessage } from '../../members/identityVerification'

// The identity provider sends the manager back here, with a code and the state, or with an error.
// Either way the Members page opens next: with the Add member form and the verified name and phone,
// or with a message saying why there is no verification.
export default function MemberVerifyCallback() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  // A state works only once, so the request must not be sent twice (React runs effects twice in
  // development).
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    sent.current = true
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    const providerError = params.get('error')
    // Once read, the code and the state must not stay in the address bar or the browser history.
    // The router's own history entry is kept, so only the query string goes.
    window.history.replaceState(window.history.state, '', window.location.pathname)

    const backToMembers = (registration) => navigate('/members', { replace: true, state: { registration } })

    if (providerError) {
      const done = () => backToMembers({ error: cancelledMessage(t, providerError) })
      if (state) cancelIdentityVerification(state, providerError).catch(() => {}).finally(done)
      else done()
      return
    }
    if (!code || !state) {
      backToMembers({ error: t('memberVerification.errors.VERIFICATION_UNKNOWN') })
      return
    }
    completeIdentityVerification(code, state)
      .then((result) => {
        keepVerification(result)
        backToMembers({ verified: true })
      })
      .catch((error) => backToMembers({ error: verificationErrorMessage(t, error) }))
  }, [navigate, t])

  return (
    <div role="status" aria-busy="true" className="space-y-3 rounded-xl bg-surface p-6 shadow-sm">
      <p className="text-sm text-muted">{t('memberVerification.checking')}</p>
      <div className="h-24 animate-pulse rounded-lg bg-background" />
    </div>
  )
}
