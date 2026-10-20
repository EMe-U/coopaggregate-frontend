import client from './client'

// Ordered by code. Only active grades unless includeInactive is true (the settings page edits all).
export async function listGrades({ includeInactive } = {}) {
  const response = await client.get('/api/grades', { params: includeInactive ? { includeInactive: true } : {} })
  return response.data
}

// The code is fixed; everything else can be edited. floorPricePerKg null means no minimum.
export async function updateGrade(id, { name, nameRw, active, floorPricePerKg, description, sizeInfo, packaging }) {
  const response = await client.put(`/api/grades/${id}`, {
    name,
    nameRw,
    active,
    floorPricePerKg,
    description,
    sizeInfo,
    packaging,
  })
  return response.data
}
