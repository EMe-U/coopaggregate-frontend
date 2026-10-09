// Same rule as the backend: a Rwandan mobile number (072, 073, 078 or 079) written as
// 07XXXXXXXX, 2507XXXXXXXX or +2507XXXXXXXX.
export const RWANDAN_PHONE_PATTERN = /^(\+250|250|0)7[2389]\d{7}$/

export function cleanPhone(phone) {
  return phone.replace(/\s/g, '')
}
