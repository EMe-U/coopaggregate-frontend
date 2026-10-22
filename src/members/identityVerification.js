// The member form is left for the identity provider's page and comes back on
// /members/verify/callback. The form values wait in sessionStorage meanwhile (gone when the tab
// closes, removed after use and on logout). The verification itself is only kept in memory.
const DRAFT_KEY = 'memberRegistrationDraft'

let verification = null

export function saveRegistrationDraft(values) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(values))
}

// Returns the saved form values once, or null.
export function takeRegistrationDraft() {
  const saved = sessionStorage.getItem(DRAFT_KEY)
  sessionStorage.removeItem(DRAFT_KEY)
  try {
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

export function clearRegistrationDraft() {
  sessionStorage.removeItem(DRAFT_KEY)
}

export function keepVerification(result) {
  verification = result
}

// Returns the completed verification once, or null.
export function takeVerification() {
  const result = verification
  verification = null
  return result
}

// The message for a failed start or callback, by status. 409 carries the backend's own message
// ("This person is already a member." or that the check was already used).
export function verificationErrorMessage(t, error) {
  const status = error.response?.status
  if (!error.response) return t('memberVerification.errors.network')
  if (status === 400) return t('memberVerification.errors.startAgain')
  if (status === 409) return error.response.data?.message || t('memberVerification.errors.used')
  if (status === 503) return t('memberVerification.errors.unavailable')
  return error.response.data?.message || t('memberVerification.errors.generic')
}
