import client from './client'

// Returns all matching buyers sorted by name (not paged).
export async function listBuyers(search) {
  const response = await client.get('/api/buyers', { params: search ? { search } : {} })
  return response.data
}

export async function createBuyer(buyer) {
  const response = await client.post('/api/buyers', buyer)
  return response.data
}
