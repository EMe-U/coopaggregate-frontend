import { useSyncExternalStore } from 'react'
import { getSyncState, subscribeSync } from '../offline/sync'

// { syncing, needsLogin } from the sync engine.
export default function useSyncState() {
  return useSyncExternalStore(subscribeSync, getSyncState)
}
