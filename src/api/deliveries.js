import client from './client'

// Returns the saved delivery. The backend answers 201 for a new delivery and 200 when a
// delivery with the same clientUuid was already saved, so a retry never records it twice.
export async function recordDelivery(delivery) {
  const response = await client.post('/api/deliveries', delivery)
  return response.data
}

// from and to are whole days (YYYY-MM-DD, Kigali time), both inclusive. Newest first.
export async function listDeliveries({ page = 0, size = 20, memberId, lotId, from, to } = {}) {
  const params = { page, size }
  if (memberId) params.memberId = memberId
  if (lotId) params.lotId = lotId
  if (from) params.from = from
  if (to) params.to = to

  const response = await client.get('/api/deliveries', { params })
  return response.data
}
