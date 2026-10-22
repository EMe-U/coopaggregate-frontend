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

// Gross share, deductions, paid and owed amounts, all calculated by the backend.
export async function getMemberStatement(id) {
  const response = await client.get(`/api/members/${id}/statement`)
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

// Starts an identity check: { provider, authorizationUrl, state, expiresAt }. authorizationUrl is
// null for the MOCK provider, which is completed straight away with any code.
export async function startIdentityVerification() {
  const response = await client.post('/api/members/verify/start')
  return response.data
}

// Completes it: { verificationId, verified, method, useBefore }. 400 for an unknown or expired
// state, 409 when it was already used or the person is already a member, 503 when the real
// provider is not set up yet.
export async function completeIdentityVerification(code, state) {
  const response = await client.post('/api/members/verify/callback', { code, state })
  return response.data
}
