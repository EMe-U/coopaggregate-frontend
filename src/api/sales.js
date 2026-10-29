import client from './client'

// Sales are by grade: the backend takes the kg from the oldest confirmed batches of the grade,
// whatever their lot, and credits each batch's member. The backend answers 201 for a new sale and
// 200 when one with the same clientUuid was already saved, so a retry never sells twice. A 400
// (not enough kg, a price not above the deduction) saves nothing; its message is shown as it is.
export async function recordSale(sale) {
  const response = await client.post('/api/sales', sale)
  return response.data
}

// One buyer order with several grades, each grade once. If one item fails, nothing is saved.
export async function recordSaleOrder(order) {
  const response = await client.post('/api/sales/orders', order)
  return response.data
}

// Read-only: the batches a sale of this grade would use, oldest first, with each member's gross,
// deduction and net. enough is false with a message when there are not enough sellable kg. skip is
// a list of delivery ids to pass over.
export async function previewSale(gradeId, { quantityKg, pricePerKg, skip = [] }) {
  const params = { quantityKg, pricePerKg }
  if (skip.length > 0) params.skip = skip.join(',')
  const response = await client.get(`/api/grades/${gradeId}/sale-preview`, { params })
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
