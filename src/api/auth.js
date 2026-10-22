import client, { LOGIN_URL } from './client'

export async function login(email, password) {
  const response = await client.post(LOGIN_URL, { email, password })
  return response.data
}

export async function getCurrentManager() {
  const response = await client.get('/api/auth/me')
  return response.data
}

// A wrong current password answers 400 with a message, so the login redirect does not run.
export async function changePassword(currentPassword, newPassword) {
  await client.post('/api/auth/change-password', { currentPassword, newPassword })
}
