import client from './client'

// Active grades only, ordered by code.
export async function listGrades() {
  const response = await client.get('/api/grades')
  return response.data
}
