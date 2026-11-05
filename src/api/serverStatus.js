import axios from 'axios'

// The backend sleeps when nobody uses it, and its first answers can then take up to two minutes.
// This follows the requests of both API clients so the pages can say so instead of looking broken:
// waking is true while a request has waited longer than SLOW_AFTER_MS, and unreachable is true
// after a GET failed without any answer from the server. Any answer clears both.
const SLOW_AFTER_MS = 8000

// Only GETs are tried again, never POST, PUT, PATCH or DELETE, which could save something twice.
const RETRY_DELAYS_MS = [2000, 5000]
const RETRY_STATUSES = [502, 503, 504]

let snapshot = { waking: false, unreachable: false, retryKey: 0 }
const listeners = new Set()
const slowRequests = new Set()
let nextRequestId = 1

function update(changes) {
  const next = { ...snapshot, ...changes }
  if (next.waking === snapshot.waking && next.unreachable === snapshot.unreachable && next.retryKey === snapshot.retryKey) return
  snapshot = next
  listeners.forEach((listener) => listener())
}

export function subscribeServerStatus(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getServerStatus() {
  return snapshot
}

// The "Try again" of the unreachable message: hides it, and retryKey tells the page to load again.
export function retryServer() {
  update({ unreachable: false, retryKey: snapshot.retryKey + 1 })
}

function finish(config) {
  const watch = config?.serverWatch
  if (!watch) return
  clearTimeout(watch.timer)
  slowRequests.delete(watch.id)
  update({ waking: slowRequests.size > 0 })
}

function canRetry(error) {
  const { config } = error
  if (!config || axios.isCancel(error) || (config.method ?? 'get').toLowerCase() !== 'get') return false
  if (!navigator.onLine) return false
  if (error.response && !RETRY_STATUSES.includes(error.response.status)) return false
  return (config.serverWatch?.attempt ?? 0) < RETRY_DELAYS_MS.length
}

// Added after the client's own interceptors, so a retried request goes through all of them again.
export function watchServer(client) {
  client.interceptors.request.use((config) => {
    // A retry keeps the timer of the first try: the wait is counted from the first request.
    if (!config.serverWatch) {
      const id = nextRequestId++
      config.serverWatch = {
        id,
        attempt: 0,
        timer: setTimeout(() => {
          slowRequests.add(id)
          update({ waking: true })
        }, SLOW_AFTER_MS),
      }
    }
    return config
  })

  client.interceptors.response.use(
    (response) => {
      finish(response.config)
      update({ unreachable: false })
      return response
    },
    async (error) => {
      if (canRetry(error)) {
        const watch = error.config.serverWatch
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[watch.attempt]))
        watch.attempt += 1
        return client(error.config)
      }
      finish(error.config)
      if (error.response) {
        update({ unreachable: false })
      } else if (!axios.isCancel(error) && navigator.onLine && (error.config?.method ?? 'get').toLowerCase() === 'get') {
        update({ unreachable: true })
      }
      return Promise.reject(error)
    },
  )
  return client
}
