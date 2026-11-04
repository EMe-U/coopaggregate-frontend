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

// Whether identity verification is configured: { available, required }, both the same. When it is
// not, no new member can be registered.
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

// Completes it: { verificationId, verified, method, fullName, phone, useBefore }. A state works only
// once. Errors carry a code (VERIFICATION_UNKNOWN, VERIFICATION_EXPIRED, VERIFICATION_USED,
// ALREADY_MEMBER, CLAIMS_MISSING, PHONE_NOT_RWANDAN, NAME_TOO_LONG, PROVIDER_FAILED, NOT_CONFIGURED).
export async function completeIdentityVerification(code, state) {
  const response = await client.post('/api/members/verify/callback', { code, state })
  return response.data
}

// Tells the backend the provider sent the manager back with an error instead of a code, so the
// state is used up and the outcome is written to the change history. Always succeeds.
export async function cancelIdentityVerification(state, error) {
  await client.post('/api/members/verify/cancel', { state, error })
}
