import client from './client'

// Returns the saved delivery. The backend answers 201 for a new delivery and 200 when a
// delivery with the same clientUuid was already saved, so a retry never records it twice.
export async function recordDelivery(delivery, config) {
  const response = await client.post('/api/deliveries', delivery, config)
  return response.data
}

// from and to are whole days (YYYY-MM-DD, Kigali time), both inclusive. Newest first.
// Reversed deliveries are left out unless includeReversed is true; lists that show the history
// ask for them, while totals and checks never count them. confirmationStatus (PENDING, CONFIRMED,
// DISPUTED) and deliveredBefore (a timestamp) narrow the list for the dashboard's follow-ups.
export async function listDeliveries({
  page = 0,
  size = 20,
  memberId,
  lotId,
  from,
  to,
  includeReversed,
  confirmationStatus,
  deliveredBefore,
} = {}) {
  const params = { page, size }
  if (includeReversed) params.includeReversed = true
  if (confirmationStatus) params.confirmationStatus = confirmationStatus
  if (deliveredBefore) params.deliveredBefore = deliveredBefore
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

// One delivery, also when it was reversed.
export async function getDelivery(id) {
  const response = await client.get(`/api/deliveries/${id}`)
  return response.data
}

// reason is WRONG_KG, WRONG_GRADE, NOT_MY_DELIVERY or OTHER; note is optional.
export async function disputeDelivery(id, { reason, note }) {
  const response = await client.post(`/api/deliveries/${id}/dispute`, { reason, note })
  return response.data
}

// Closes a dispute after the manager checked that the record was right.
export async function resolveDispute(id, note) {
  const response = await client.post(`/api/deliveries/${id}/resolve-dispute`, { note })
  return response.data
}
