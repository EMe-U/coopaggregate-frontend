import axios from 'axios'
import { clearToken, getToken } from '../utils/auth'

export const LOGIN_URL = '/api/auth/login'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

client.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    // A 401 from the login request means wrong credentials, which the login page shows itself.
    const isLoginRequest = error.config?.url === LOGIN_URL
    if (error.response?.status === 401 && !isLoginRequest) {
      clearToken()
      // This runs outside React, so we cannot use the router's navigate here.
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default client
