import client from './client'

// For a SOLD lot this is the calculated split; for a SHARED lot it is the saved split.
export async function getSharePreview(lotId) {
  const response = await client.get(`/api/lots/${lotId}/share-preview`)
  return response.data
}

export async function shareLot(lotId) {
  const response = await client.post(`/api/lots/${lotId}/share`)
  return response.data
}
