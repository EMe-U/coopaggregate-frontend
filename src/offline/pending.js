import { addPending } from './db'

// The server gives the receipt code, so until a delivery syncs it is shown with this reference.
export function temporaryReference(clientUuid) {
  return clientUuid.slice(0, 6).toUpperCase()
}

// The member's PIN, when they typed one, waits in payload.confirmationPin until the delivery
// syncs; the whole entry is then deleted. Copies kept for display never carry it.
export function withoutPin(delivery) {
  const { confirmationPin, ...payload } = delivery.payload
  return { ...delivery, payload }
}

// The same clientUuid is sent on every attempt, so the server saves the delivery only once.
// Returns the queued delivery without the PIN.
export async function queueDelivery({ clientUuid, payload, member, grade }) {
  const delivery = {
    clientUuid,
    payload,
    withPin: Boolean(payload.confirmationPin),
    memberName: member.fullName,
    memberNumber: member.memberCode,
    gradeName: grade.name,
    status: 'WAITING',
    attempts: 0,
    lastError: null,
    createdAt: new Date().toISOString(),
  }
  await addPending(delivery)
  return withoutPin(delivery)
}
