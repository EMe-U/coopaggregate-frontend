import client from './client'

export const LOGIN_URL = '/api/auth/login'

export async function login(email, password) {
  const response = await client.post(LOGIN_URL, { email, password })
  return response.data
}

export async function getCurrentManager() {
  const response = await client.get('/api/auth/me')
  return response.data
}
