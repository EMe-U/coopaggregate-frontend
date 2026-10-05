import client from './client'

export function getHealth() {
  return client.get('/api/health')
}
