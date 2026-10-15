import client from './client'

// Returns the saved delivery. The backend answers 201 for a new delivery and 200 when a
// delivery with the same clientUuid was already saved, so a retry never records it twice.
export async function recordDelivery(delivery, config) {
  const response = await client.post('/api/deliveries', delivery, config)
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

// Cancels a delivery recorded by mistake. The backend answers 409 with a message when it can no
// longer be reversed, for example because its lot already has sales.
export async function reverseDelivery(id, reason) {
  const response = await client.post(`/api/deliveries/${id}/reverse`, { reason })
  return response.data
}

// Reverses the wrong delivery and records the corrected one in the same step. Returns the new
// delivery, which has its own receipt code and lot.
export async function correctDelivery(id, { reason, memberId, gradeId, quantityKg }) {
  const response = await client.post(`/api/deliveries/${id}/correct`, { reason, memberId, gradeId, quantityKg })
  return response.data
}
