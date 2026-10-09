// +250788123456 -> +250 788 123 456. Anything else is returned unchanged.
export function formatPhone(phone) {
  const match = /^\+250(\d{3})(\d{3})(\d{3})$/.exec(phone ?? '')
  return match ? `+250 ${match[1]} ${match[2]} ${match[3]}` : phone
}

// 1199880012341022 -> 1 1998 •••• •••• 1022. The hidden part always shows the same number of
// dots so its length gives nothing away. The full ID is only shown on the member's profile.
export function maskNationalId(nationalId) {
  if (!/^\d{16}$/.test(nationalId ?? '')) return nationalId
  return `${nationalId[0]} ${nationalId.slice(1, 5)} •••• •••• ${nationalId.slice(-4)}`
}

// The backend sends dates as YYYY-MM-DD. Splitting the string avoids timezone shifts
// that new Date('YYYY-MM-DD') would cause.
export function formatDate(isoDate) {
  if (!isoDate) return ''
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

const numberFormat = new Intl.NumberFormat('en-US')

// Display only. Amounts are always calculated by the backend.
export function formatMoney(amount) {
  return `${numberFormat.format(amount)} RWF`
}

export function formatKg(kg) {
  return `${numberFormat.format(kg)} kg`
}

export function todayIso() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}
