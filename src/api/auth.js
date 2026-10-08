import client, { LOGIN_URL } from './client'

export async function login(email, password) {
  const response = await client.post(LOGIN_URL, { email, password })
  return response.data
}

export async function getCurrentManager() {
  const response = await client.get('/api/auth/me')
  return response.data
}
