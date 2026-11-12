import client from './client'

// One row per member who has earned money: earned (shareRwf), deduction, paid so far, balance, and
// settlement (OWED while the balance is above 0, SETTLED once it is disbursed), plus the total owed and
// the amount paid this week for all members. Not paged.
export async function getBalances({ search, status } = {}) {
  const params = {}
  if (search) params.search = search
  if (status) params.status = status

  const response = await client.get('/api/payments/balances', { params })
  return response.data
}

// Disburses a member's whole balance: amountRwf must equal it (400 otherwise, or when nothing is owed).
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

// Cancels a payment; the member is owed the amount again. Returns the reversed payment.
export async function reversePayment(id, reason) {
  const response = await client.post(`/api/payments/${id}/reverse`, { reason })
  return response.data
}
