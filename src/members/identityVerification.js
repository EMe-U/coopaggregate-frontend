// Registering a member starts with the identity check: "Add member" sends the manager to the
// identity provider's page, which comes back on /identity/callback. The completed verification
// ({ verificationId, fullName, phone, useBefore, ... }) is kept in memory only, from the callback
// page until the Members page opens the form with it; it is never written to any storage. The
// code and the state are never kept.

let verification = null

export function keepVerification(result) {
  verification = result
}

// Returns the completed verification once, or null.
export function takeVerification() {
  const result = verification
  verification = null
  return result
}

// On logout.
export function clearVerification() {
  verification = null
}

export function verificationExpired(result, now = Date.now()) {
  return new Date(result.useBefore).getTime() <= now
}

// The error codes the backend sends with an identity error, each with its own text.
const CODES = [
  'VERIFICATION_UNKNOWN',
  'VERIFICATION_EXPIRED',
  'VERIFICATION_USED',
  'ALREADY_MEMBER',
  'CLAIMS_MISSING',
  'PHONE_NOT_RWANDAN',
  'NAME_TOO_LONG',
  'PROVIDER_FAILED',
  'NOT_CONFIGURED',
]

export function errorCode(error) {
  const code = error.response?.data?.code
  return CODES.includes(code) ? code : null
}

// The message for a failed start or callback, in the chosen language.
export function verificationErrorMessage(t, error) {
  if (!error.response) return t('memberVerification.errors.network')
  const code = errorCode(error)
  if (code) return t(`memberVerification.errors.${code}`)
  if (error.response.status === 503) return t('memberVerification.errors.NOT_CONFIGURED')
  return t('memberVerification.errors.generic')
}

// The message after the provider sent the manager back with an error instead of a code.
export function cancelledMessage(t, providerError) {
  return providerError === 'essential_consent_denied'
    ? t('memberVerification.cancelled.consentDenied')
    : t('memberVerification.cancelled.message')
}
