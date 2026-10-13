import client from './client'

// Counts and totals for the overview page. weeklyDeliveries holds the last 4 weeks, oldest first.
export async function getDashboard() {
  const response = await client.get('/api/dashboard')
  return response.data
}
