import client from './client'

// page is 0-based, like the backend.
export async function listMembers({ page = 0, size = 10, search, active } = {}) {
  const params = { page, size }
  if (search) params.search = search
  if (active !== undefined) params.active = active

  const response = await client.get('/api/members', { params })
  return response.data
}

export async function getMemberSummary() {
  const response = await client.get('/api/members/summary')
  return response.data
}

export async function getMember(id) {
  const response = await client.get(`/api/members/${id}`)
  return response.data
}

export async function createMember(member) {
  const response = await client.post('/api/members', member)
  return response.data
}

export async function updateMember(id, member) {
  const response = await client.put(`/api/members/${id}`, member)
  return response.data
}

export async function deactivateMember(id) {
  const response = await client.patch(`/api/members/${id}/deactivate`)
  return response.data
}

export async function activateMember(id) {
  const response = await client.patch(`/api/members/${id}/activate`)
  return response.data
}
