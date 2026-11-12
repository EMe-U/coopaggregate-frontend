import client from './client'

// Sales are by grade, first in first out by lot: the older lots first, then the fixed-size lots in
// the order they were filled, shared in proportion inside a lot. Each lot portion used credits its
// member. The backend answers 201 for a new sale and
// 200 when one with the same clientUuid was already saved, so a retry never sells twice. A 400
// (not enough kg, a price not above the deduction) saves nothing; its message is shown as it is.
// Lots cannot be skipped: a sale always uses the oldest lot first.
export async function recordSale(sale) {
  const response = await client.post('/api/sales', sale)
  return response.data
}

// One buyer order with several grades, each grade once. If one item fails, nothing is saved.
export async function recordSaleOrder(order) {
  const response = await client.post('/api/sales/orders', order)
  return response.data
}

// Read-only: the lot portions a sale of this grade would use, in the order they are taken, with
// each member's gross, deduction and net. enough is false with a message when there are not enough
// sellable kg.
export async function previewSale(gradeId, { quantityKg, pricePerKg }) {
  const params = { quantityKg, pricePerKg }
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
