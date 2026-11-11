import client from './client'

export async function listLots({ status, gradeId, page = 0, size = 20 } = {}) {
  const params = { page, size }
  if (status) params.status = status
  if (gradeId) params.gradeId = gradeId

  const response = await client.get('/api/lots', { params })
  return response.data
}

// Loads every page of lots with the given status (and grade, when given), for pickers that must
// show all of them.
export async function listAllLots(status, gradeId) {
  const lots = []
  let page = 0
  let totalPages = 1
  while (page < totalPages) {
    const data = await listLots({ status, gradeId, page, size: 100 })
    lots.push(...data.content)
    totalPages = data.totalPages
    page++
  }
  return lots
}

// The lots in use: being filled or full.
export const ACTIVE_LOT_STATUSES = ['FILLING', 'FULL']

// One page of the lots in use. The backend filters by one status at a time, so all the lots of both
// are loaded, put in the backend's order (newest first) and cut into a page of the same shape.
export async function listActiveLots({ gradeId, page = 0, size = 20 } = {}) {
  const lots = (await Promise.all(ACTIVE_LOT_STATUSES.map((status) => listAllLots(status, gradeId))))
    .flat()
    .sort((a, b) => b.id - a.id)
  return {
    content: lots.slice(page * size, (page + 1) * size),
    page,
    size,
    totalElements: lots.length,
    totalPages: Math.ceil(lots.length / size),
  }
}

export async function getLot(id) {
  const response = await client.get(`/api/lots/${id}`)
  return response.data
}

export async function getStock() {
  const response = await client.get('/api/lots/stock')
  return response.data
}

// Returns the lot being filled for the grade, { id, code, gradeName, totalKg, capacityKg }, or null
// when there is none (204): the next confirmed delivery of this grade then starts one.
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
