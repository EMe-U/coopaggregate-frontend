import client from './client'

export async function listLots({ status, gradeId, page = 0, size = 20 } = {}) {
  const params = { page, size }
  if (status) params.status = status
  if (gradeId) params.gradeId = gradeId

  const response = await client.get('/api/lots', { params })
  return response.data
}

// Loads every page of lots with the given status, for pickers that must show all of them.
export async function listAllLots(status) {
  const lots = []
  let page = 0
  let totalPages = 1
  while (page < totalPages) {
    const data = await listLots({ status, page, size: 100 })
    lots.push(...data.content)
    totalPages = data.totalPages
    page++
  }
  return lots
}

export async function getLot(id) {
  const response = await client.get(`/api/lots/${id}`)
  return response.data
}

export async function getStock() {
  const response = await client.get('/api/lots/stock')
  return response.data
}

export async function closeLot(id) {
  const response = await client.patch(`/api/lots/${id}/close`)
  return response.data
}

// Returns the open lot for the grade, or null when none is open (204): the next delivery
// of this grade then starts a new lot.
export async function findOpenLot(gradeId) {
  const response = await client.get('/api/lots/open', { params: { gradeId } })
  return response.status === 204 ? null : response.data
}

export async function listLosses(lotId) {
  const response = await client.get(`/api/lots/${lotId}/losses`)
  return response.data
}

export async function recordLoss(lotId, loss) {
  const response = await client.post(`/api/lots/${lotId}/losses`, loss)
  return response.data
}
