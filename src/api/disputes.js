import client from './client'

// Disputed deliveries, newest first: { openDisputes, openKg, settledDisputes, disputes }. The totals
// cover every dispute, not only this page or search. status is open or settled; search matches the
// receipt code, member name or member number. Disputes are settled on the delivery itself.
export async function listDisputes({ status = 'open', search, page = 0, size = 15 } = {}) {
  const params = { status, page, size }
  if (search) params.search = search

  const response = await client.get('/api/disputes', { params })
  return response.data
}
