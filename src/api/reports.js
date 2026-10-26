import client from './client'

// One week, Monday to Sunday in Kigali time. weekStart (YYYY-MM-DD) must be a Monday and not in the
// future; without it, the current week. Stock, owed money, pending confirmations and open disputes
// are the numbers at the time of the request, not at the end of that week.
export async function getWeeklyReport(weekStart) {
  const response = await client.get('/api/reports/weekly', { params: weekStart ? { weekStart } : {} })
  return response.data
}

// The weeks of the last 52 with any activity, newest first: [{ weekStart, weekEnd }].
export async function listReportWeeks() {
  const response = await client.get('/api/reports/weeks')
  return response.data
}
