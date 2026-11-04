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
