// Same rule as the backend: a Rwandan mobile number (072, 073, 078 or 079) written as
// 07XXXXXXXX, 2507XXXXXXXX or +2507XXXXXXXX.
export const RWANDAN_PHONE_PATTERN = /^(\+250|250|0)7[2389]\d{7}$/

export function cleanPhone(phone) {
  return phone.replace(/\s/g, '')
}

// 0788123456, 250788123456 or +250788123456 -> +250788123456. Anything else is returned cleaned.
export function internationalPhone(phone) {
  const cleaned = cleanPhone(phone ?? '')
  if (cleaned.startsWith('+250')) return cleaned
  if (cleaned.startsWith('250')) return `+${cleaned}`
  if (cleaned.startsWith('0')) return `+250${cleaned.slice(1)}`
  return cleaned
}

// A WhatsApp chat link: wa.me wants the international number as digits only.
export function whatsappLink(phone) {
  return `https://wa.me/${internationalPhone(phone).replace(/\D/g, '')}`
}
