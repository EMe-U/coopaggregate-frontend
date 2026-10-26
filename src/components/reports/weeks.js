import { kigaliIsoDate } from '../../utils/format'

// Weeks run Monday to Sunday in Kigali time, as on the backend. Days are YYYY-MM-DD strings and the
// arithmetic is done in UTC, so no timezone can move a day.
function toUtc(day) {
  const [year, month, date] = day.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, date))
}

export function addDays(day, days) {
  const date = toUtc(day)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

// The Monday of the current week in Kigali.
export function currentMonday() {
  const today = kigaliIsoDate()
  return addDays(today, -((toUtc(today).getUTCDay() + 6) % 7))
}

// "Mon 20 Oct - Sun 26 Oct 2026". Month names come from the translations, because browsers do not
// all know Kinyarwanda dates. A week across the new year shows both years.
export function weekLabel(t, weekStart) {
  const weekEnd = addDays(weekStart, 6)
  const months = t('reports.months', { returnObjects: true })
  const day = (value) => {
    const [, month, date] = value.split('-')
    return `${Number(date)} ${Array.isArray(months) ? months[Number(month) - 1] : month}`
  }
  const startYear = weekStart.slice(0, 4)
  const endYear = weekEnd.slice(0, 4)
  return t(startYear === endYear ? 'reports.week.label' : 'reports.week.labelTwoYears', {
    start: day(weekStart),
    end: day(weekEnd),
    startYear,
    endYear,
  })
}
