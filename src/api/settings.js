import client from './client'

export async function getSettings() {
  const response = await client.get('/api/settings')
  return response.data
}

// The backend replaces all settings at once, so the caller sends every field.
export async function saveSettings(settings) {
  const response = await client.put('/api/settings', settings)
  return response.data
}

// Changes to the settings, grades, the password and member PINs, newest first.
export async function listSettingsHistory({ page = 0, size = 20 } = {}) {
  const response = await client.get('/api/settings/history', { params: { page, size } })
  return response.data
}
