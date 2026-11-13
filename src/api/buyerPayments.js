import client from './client'

// Money in: a buyer pays each order once, in full, so each order is one buyer payment. Newest first.
// Each row has the buyer, method and reference (null for orders saved before they were recorded), the
// sales of each grade, and farmers: what each member was credited from the order, one line per member.
// A sale from before sales by grade paid its members through the lot share: those members have kg but
// no money, and totalDeductionRwf and totalNetRwf are null.
export async function listBuyerPayments({ buyerId, page = 0, size = 20 } = {}) {
  const params = { page, size }
  if (buyerId) params.buyerId = buyerId

  const response = await client.get('/api/buyer-payments', { params })
  return response.data
}

// One buyer payment (an order), the same as its row in the list.
export async function getBuyerPayment(orderId) {
  const response = await client.get(`/api/buyer-payments/${orderId}`)
  return response.data
}
