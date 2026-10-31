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

// The member's batches (one per delivery), newest first, with kg and money totals over all of them.
// status is all (default) or unsold (only batches with kg left).
export async function getMemberBatches(id, { status, page = 0, size = 20 } = {}) {
  const params = { page, size }
  if (status && status !== 'all') params.status = status
  const response = await client.get(`/api/members/${id}/batches`, { params })
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

// Whether identity verification can be used: { available, required }. Required but not available
// means a new member cannot be registered until the setting is switched off.
export async function getIdentityVerificationStatus() {
  const response = await client.get('/api/members/verify/status')
  return response.data
}

// Starts an identity check: { provider, authorizationUrl, state, expiresAt }. The member is sent to
// authorizationUrl and comes back on /identity/callback. 503 when verification is not available.
export async function startIdentityVerification() {
  const response = await client.post('/api/members/verify/start')
  return response.data
}

// Completes it: { verificationId, verified, method, useBefore }. A state works only once. 400 for an
// unknown or expired state, 409 when it was already used or the person is already a member, 502
// when the provider failed, 503 when verification is not available.
export async function completeIdentityVerification(code, state) {
  const response = await client.post('/api/members/verify/callback', { code, state })
  return response.data
}
