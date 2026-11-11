// The details the identity check can give, as the backend names them in verifiedFields.
// A member who was never verified has none; a verification has at least fullName and phone.
export function verifiedFieldsOf(memberOrVerification) {
  return memberOrVerification?.verifiedFields ?? []
}

// eSignet gives the gender as written in the registry (for example "Female"). The two usual values
// are shown in the chosen language; anything else is shown as given.
export function genderLabel(t, gender) {
  if (!gender) return ''
  const known = gender.trim().toLowerCase()
  return known === 'male' || known === 'female' ? t(`members.gender.${known}`) : gender
}

// The national ID with only its last 4 characters: "••••••5678". The number of dots is fixed so
// the mask does not show the length either.
export function maskNationalId(nationalId) {
  if (!nationalId) return ''
  return nationalId.length > 4 ? `••••••${nationalId.slice(-4)}` : '••••'
}

// A national ID is exactly 16 digits (0-9), as the backend requires. Spaces typed inside it, as in
// "1199 8800 1234 5678", are dropped.
export const NATIONAL_ID_LENGTH = 16
export const NATIONAL_ID_PATTERN = /^[0-9]{16}$/

export function cleanNationalId(value) {
  return (value ?? '').replace(/\s+/g, '')
}

// The backend finds a member by any whole national ID of 6 to 20 letters or digits: a typed
// 16-digit one, or one from the identity check.
export const SEARCHABLE_NATIONAL_ID = /^[A-Za-z0-9]{6,20}$/

// The members search: a whole national ID typed with spaces ("1199 8800 1234 5678") is sent
// without them, so the backend finds the member by it. Only a term with a digit is joined, so a
// name such as "Jean Paul" is still searched as typed. Anything else is sent as typed.
export function memberSearchTerm(search) {
  if (!/\s/.test(search)) return search
  const joined = cleanNationalId(search)
  return SEARCHABLE_NATIONAL_ID.test(joined) && /[0-9]/.test(joined) ? joined : search
}
