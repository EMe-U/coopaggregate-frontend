// The member form is left for the identity provider's page and comes back on /identity/callback.
// The form values wait in sessionStorage meanwhile (gone when the tab closes, removed after use and
// on logout). The verification itself is only kept in memory; the code, the state and the
// provider's details are never stored anywhere.
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
  verification = null
}

// result: { verificationId, verified, method, useBefore } from the callback.
export function keepVerification(result) {
  verification = result
}

// Returns the completed verification once, or null.
export function takeVerification() {
  const result = verification
  verification = null
  return result
}

// The message for a failed start or callback, by status. 409 and 502 carry the backend's own
// message ("This person is already a member.", or a fixed text about the provider).
export function verificationErrorMessage(t, error) {
  const status = error.response?.status
  const message = error.response?.data?.message
  if (!error.response) return t('memberVerification.errors.network')
  if (status === 400) return t('memberVerification.errors.startAgain')
  if (status === 409) return message || t('memberVerification.errors.used')
  if (status === 502) return message || t('memberVerification.errors.generic')
  if (status === 503) return t('memberVerification.errors.unavailable')
  return message || t('memberVerification.errors.generic')
}

// Whether a refused registration means the verification cannot be used again: it is used up (the
// third mismatch, or older than 30 minutes), unknown, or already used (409). A 409 about a phone
// or national ID used by another member keeps the verification.
export function verificationIsGone(error) {
  const status = error.response?.status
  const message = error.response?.data?.message ?? ''
  if (status === 400) return /used up|does not exist|did not verify anyone/i.test(message)
  if (status === 409) return /already a member|was already used/i.test(message)
  return false
}
