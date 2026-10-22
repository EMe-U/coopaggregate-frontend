import axios from 'axios'

// The public pages never use the manager's session: this client sends no token and has no 401
// redirect, so an expired login can neither break them nor send a buyer to the manager's login.
const publicClient = axios.create({ baseURL: import.meta.env.VITE_API_URL })

// Active grades: { code, name, nameRw, description, sizeInfo, packaging }. No prices or stock.
export async function listPublicGrades() {
  const response = await publicClient.get('/api/public/grades')
  return response.data
}

// { cooperativeName, location, cooperativeEmail, minOrderKg }; any of the first three can be null.
export async function getPublicInfo() {
  const response = await publicClient.get('/api/public/info')
  return response.data
}

// { name, phone, email, gradeCode, quantityKg, note, website }. Answers 201 { code, status}.
// website is the honeypot field: it stays empty for people.
export async function sendPurchaseRequest(request) {
  const response = await publicClient.post('/api/public/requests', request)
  return response.data
}

// { code, status, message }. A wrong code or phone is a 404 "Request not found."
export async function getRequestStatus(code, phone) {
  const response = await publicClient.get(`/api/public/requests/${encodeURIComponent(code)}`, { params: { phone } })
  return response.data
}
