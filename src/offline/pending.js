import { addPending } from './db'

// The server gives the receipt code, so until a delivery syncs it is shown with this reference.
export function temporaryReference(clientUuid) {
  return clientUuid.slice(0, 6).toUpperCase()
}

// The same clientUuid is sent on every attempt, so the server saves the delivery only once.
export async function queueDelivery({ clientUuid, payload, member, grade }) {
  const delivery = {
    clientUuid,
    payload,
    memberName: member.fullName,
    memberNumber: member.memberCode,
    gradeName: grade.name,
    status: 'WAITING',
    attempts: 0,
    lastError: null,
    createdAt: new Date().toISOString(),
  }
  await addPending(delivery)
  return delivery
}
