import client from './client'

// One order can take kg from several closed lots of the same grade. Returns the saved order
// with its sales and the lots that became fully sold. The backend answers 201 for a new order
// and 200 when an order with the same clientUuid was already saved, so a retry never sells twice.
export async function recordSaleOrder(order) {
  const response = await client.post('/api/sales/orders', order)
  return response.data
}

// This month's totals in Kigali time, calculated by the backend.
export async function getSalesSummary() {
  const response = await client.get('/api/sales/summary')
  return response.data
}

export async function listSales({ lotId, buyerId, page = 0, size = 20 } = {}) {
  const params = { page, size }
  if (lotId) params.lotId = lotId
  if (buyerId) params.buyerId = buyerId

  const response = await client.get('/api/sales', { params })
  return response.data
}
