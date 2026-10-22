import { openDB } from 'idb'

const DB_NAME = 'coopaggregate'
const DB_VERSION = 1

// pendingDeliveries holds deliveries saved on this device that the server has not confirmed yet:
// { clientUuid, payload: { memberId, gradeId, quantityKg, deliveredAt }, memberName, memberNumber,
//   gradeName, status: WAITING | SYNCING | FAILED, attempts, lastError, createdAt }
// cache holds copies of server lists (members, grades) for use without internet: { key, value, savedAt }
const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    db.createObjectStore('pendingDeliveries', { keyPath: 'clientUuid' })
    db.createObjectStore('cache', { keyPath: 'key' })
  },
})

// Lets the top bar and the deliveries list refresh when the queue changes.
const changes = new EventTarget()

function notifyChange() {
  changes.dispatchEvent(new Event('change'))
}

export function onPendingChange(listener) {
  changes.addEventListener('change', listener)
  return () => changes.removeEventListener('change', listener)
}

export async function addPending(delivery) {
  const db = await dbPromise
  await db.put('pendingDeliveries', delivery)
  notifyChange()
}

// Oldest first, the order they are sent in.
export async function listPending() {
  const db = await dbPromise
  const deliveries = await db.getAll('pendingDeliveries')
  return deliveries.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function updatePending(clientUuid, fields) {
  const db = await dbPromise
  const delivery = await db.get('pendingDeliveries', clientUuid)
  // It may have been discarded while a request for it was running.
  if (!delivery) return
  await db.put('pendingDeliveries', { ...delivery, ...fields })
  notifyChange()
}

export async function removePending(clientUuid) {
  const db = await dbPromise
  await db.delete('pendingDeliveries', clientUuid)
  notifyChange()
}

export async function readCache(key) {
  return (await readCacheEntry(key))?.value ?? null
}

// { value, savedAt }, or null when nothing was saved under this key.
export async function readCacheEntry(key) {
  const db = await dbPromise
  return (await db.get('cache', key)) ?? null
}

export async function writeCache(key, value) {
  const db = await dbPromise
  await db.put('cache', { key, value, savedAt: new Date().toISOString() })
}
