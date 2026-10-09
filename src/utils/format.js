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

export function todayIso() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}
