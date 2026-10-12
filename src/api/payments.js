import client from './client'

// One row per member who has a share: share, deduction, paid so far, balance and status,
// plus the total owed and the amount paid this week for all members.
export async function getBalances({ search, status } = {}) {
  const params = {}
  if (search) params.search = search
  if (status) params.status = status

  const response = await client.get('/api/payments/balances', { params })
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
