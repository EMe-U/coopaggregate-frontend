import { useSyncExternalStore } from 'react'
import { getServerStatus, subscribeServerStatus } from '../api/serverStatus'

// { waking, unreachable, retryKey } from api/serverStatus.
export default function useServerStatus() {
  return useSyncExternalStore(subscribeServerStatus, getServerStatus)
}
