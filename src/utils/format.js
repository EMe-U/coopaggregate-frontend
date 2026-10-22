// +250788123456 -> +250 788 123 456. Anything else is returned unchanged.
export function formatPhone(phone) {
  const match = /^\+250(\d{3})(\d{3})(\d{3})$/.exec(phone ?? '')
  return match ? `+250 ${match[1]} ${match[2]} ${match[3]}` : phone
}

// The backend sends dates as YYYY-MM-DD. Splitting the string avoids timezone shifts
// that new Date('YYYY-MM-DD') would cause.
export function formatDate(isoDate) {
  if (!isoDate) return ''
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

const numberFormat = new Intl.NumberFormat('en-US')

export function formatNumber(value) {
  return numberFormat.format(value)
}

// Display only. Amounts are always calculated by the backend.
export function formatMoney(amount) {
  return `${numberFormat.format(amount)} RWF`
}

export function formatKg(kg) {
  return `${numberFormat.format(kg)} kg`
}

// The cooperative works in Kigali time, and the backend filters deliveries by Kigali dates.
const KIGALI = 'Africa/Kigali'
const kigaliDateFormat = new Intl.DateTimeFormat('en-CA', { timeZone: KIGALI })
const kigaliTimeFormat = new Intl.DateTimeFormat('en-GB', { timeZone: KIGALI, hour: '2-digit', minute: '2-digit' })

// Date -> YYYY-MM-DD in Kigali.
export function kigaliIsoDate(date = new Date()) {
  return kigaliDateFormat.format(date)
}

// Backend timestamps (e.g. 2026-10-09T08:42:00Z) -> 10:42 in Kigali.
export function formatTime(instant) {
  return kigaliTimeFormat.format(new Date(instant))
}

// Accepts a day (YYYY-MM-DD) or a timestamp and shows the day, in Kigali time for timestamps.
export function formatDay(value) {
  if (!value) return ''
  return value.length === 10 ? formatDate(value) : formatDate(kigaliIsoDate(new Date(value)))
}

export function formatDateTime(instant) {
  return `${formatDate(kigaliIsoDate(new Date(instant)))}, ${formatTime(instant)}`
}

export function todayIso() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}
