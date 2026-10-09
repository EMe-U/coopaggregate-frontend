import client from './client'

// Returns the open lot for the grade, or null when none is open (204): the next delivery
// of this grade then starts a new lot.
export async function findOpenLot(gradeId) {
  const response = await client.get('/api/lots/open', { params: { gradeId } })
  return response.status === 204 ? null : response.data
}
