import { recordDelivery } from '../api/deliveries'
import { getToken } from '../utils/auth'
import { listPending, removePending, updatePending } from './db'
import { withoutPin } from './pending'

const SYNC_INTERVAL_MS = 30 * 1000
const FIRST_RETRY_MS = 5 * 1000
const MAX_RETRY_MS = 5 * 60 * 1000

let running = false
// Network errors and 5xx answers in a row; each one doubles the wait before the next try.
let failuresInRow = 0
let retryAt = 0
let retryTimer = null
// The token the server answered 401 to. Syncing waits until the manager logs in again.
let rejectedToken = null
// Deliveries synced since the app opened, by clientUuid, so a "Waiting to sync" receipt can be
// replaced with the real one.
const synced = new Map()

let state = { syncing: false, needsLogin: false }
const listeners = new Set()

function setState(changes) {
  state = { ...state, ...changes }
  listeners.forEach((listener) => listener())
}

export function subscribeSync(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSyncState() {
  return state
}

export function syncedDelivery(clientUuid) {
  return synced.get(clientUuid) ?? null
}

function scheduleRetry() {
  failuresInRow++
  const delay = Math.min(FIRST_RETRY_MS * 2 ** (failuresInRow - 1), MAX_RETRY_MS)
  retryAt = Date.now() + delay
  clearTimeout(retryTimer)
  retryTimer = setTimeout(() => syncNow(), delay)
}

function resetRetry() {
  failuresInRow = 0
  retryAt = 0
  clearTimeout(retryTimer)
}

// Sends one delivery. Returns false when syncing should stop for now.
async function send(delivery) {
  const { clientUuid } = delivery
  await updatePending(clientUuid, { status: 'SYNCING' })
  try {
    const saved = await recordDelivery({ clientUuid, ...delivery.payload }, { skipAuthRedirect: true })
    // 201 for a new delivery, 200 when the server already had it; either way it is saved.
    synced.set(clientUuid, saved)
    await removePending(clientUuid)
    resetRetry()
    return true
  } catch (error) {
    const status = error.response?.status
    if (status === 401) {
      rejectedToken = getToken()
      setState({ needsLogin: true })
      await updatePending(clientUuid, { status: 'WAITING' })
      return false
    }
    const attempts = delivery.attempts + 1
    if (!error.response || status >= 500) {
      await updatePending(clientUuid, { status: 'WAITING', attempts, lastError: error.response?.data?.message ?? null })
      scheduleRetry()
      return false
    }
    // The server rejected the data (400, 404, 409). Sending it again would fail the same way,
    // so it waits for the manager to retry or discard it. The PIN is not kept on the device for
    // that: a retry saves the delivery as waiting for confirmation.
    await updatePending(clientUuid, {
      payload: withoutPin(delivery).payload,
      withPin: false,
      status: 'FAILED',
      attempts,
      lastError: error.response.data?.message || `HTTP ${status}`,
    })
    return true
  }
}

// One delivery at a time, oldest first. manual skips the wait after a failed try.
export async function syncNow({ manual = false } = {}) {
  if (running || !navigator.onLine) return
  const token = getToken()
  if (!token || token === rejectedToken) return
  if (state.needsLogin) setState({ needsLogin: false })
  if (!manual && Date.now() < retryAt) return

  running = true
  setState({ syncing: true })
  try {
    for (;;) {
      // SYNCING is included: the app may have closed while one was being sent.
      const next = (await listPending()).find((delivery) => delivery.status !== 'FAILED')
      if (!next || !(await send(next))) break
    }
  } catch {
    // IndexedDB could not be read; the next run tries again.
  } finally {
    running = false
    setState({ syncing: false })
  }
}

export async function retryDelivery(clientUuid) {
  await updatePending(clientUuid, { status: 'WAITING', lastError: null })
  await syncNow({ manual: true })
}

export function discardDelivery(clientUuid) {
  return removePending(clientUuid)
}

// Runs on app start, when the connection comes back and every 30 seconds while online.
export function startSync() {
  function handleOnline() {
    resetRetry()
    syncNow()
  }
  window.addEventListener('online', handleOnline)
  const interval = setInterval(() => syncNow(), SYNC_INTERVAL_MS)
  syncNow()
  return () => {
    window.removeEventListener('online', handleOnline)
    clearInterval(interval)
    clearTimeout(retryTimer)
  }
}
