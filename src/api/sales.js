import client from './client'

// Returns the saved sale. The backend answers 201 for a new sale and 200 when a sale with
// the same clientUuid was already saved, so a retry never records it twice.
export async function recordSale(sale) {
  const response = await client.post('/api/sales', sale)
  return response.data
}

export async function listSales({ lotId, buyerId, page = 0, size = 20 } = {}) {
  const params = { page, size }
  if (lotId) params.lotId = lotId
  if (buyerId) params.buyerId = buyerId

  const response = await client.get('/api/sales', { params })
  return response.data
}
