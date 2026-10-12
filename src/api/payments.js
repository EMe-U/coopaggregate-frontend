import client from './client'

export async function getOwed(search) {
  const response = await client.get('/api/payments/owed', { params: search ? { search } : {} })
  return response.data
}

// The backend answers 201 for a new payment and 200 when a payment with the same clientUuid
// was already saved, so a retry never pays a member twice.
export async function recordPayment(payment) {
  const response = await client.post('/api/payments', payment)
  return response.data
}

export async function listPayments({ memberId, method, page = 0, size = 20 } = {}) {
  const params = { page, size }
  if (memberId) params.memberId = memberId
  if (method) params.method = method

  const response = await client.get('/api/payments', { params })
  return response.data
}
