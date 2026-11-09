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

// The members search: a whole national ID (spaces allowed) is sent as its 16 digits, so the
// backend finds the member by it. Anything else is sent as typed.
export function memberSearchTerm(search) {
  const digits = cleanNationalId(search)
  return NATIONAL_ID_PATTERN.test(digits) ? digits : search
}
