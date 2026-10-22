import client from './client'

// Buyers' purchase requests, newest first. status is PENDING, ACCEPTED or REJECTED; search matches
// the request code, the buyer's name or phone.
export async function listBuyerRequests({ status, search, page = 0, size = 15 } = {}) {
  const params = { page, size }
  if (status) params.status = status
  if (search) params.search = search

  const response = await client.get('/api/buyer-requests', { params })
  return response.data
}

// One request with the buyer's contact details, note and the message the buyer can read.
export async function getBuyerRequest(id) {
  const response = await client.get(`/api/buyer-requests/${id}`)
  return response.data
}

// publicMessage is optional: leaving it out keeps the earlier message. The same status without a
// new message answers 409.
export async function changeRequestStatus(id, { status, publicMessage }) {
  const body = { status }
  if (publicMessage) body.publicMessage = publicMessage
  const response = await client.patch(`/api/buyer-requests/${id}/status`, body)
  return response.data
}
