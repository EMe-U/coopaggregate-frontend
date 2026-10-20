import { useEffect, useState } from 'react'
import { listPending, onPendingChange } from '../offline/db'
import { withoutPin } from '../offline/pending'

// Deliveries saved on this device and not yet confirmed by the server, oldest first, without
// the member's PIN (only the sync engine reads that). null until IndexedDB has been read.
export default function usePendingDeliveries() {
  const [deliveries, setDeliveries] = useState(null)

  useEffect(() => {
    let ignore = false
    function load() {
      listPending()
        .then((list) => {
          if (!ignore) setDeliveries(list.map(withoutPin))
        })
        .catch(() => {
          if (!ignore) setDeliveries([])
        })
    }
    load()
    const stopListening = onPendingChange(load)
    return () => {
      ignore = true
      stopListening()
    }
  }, [])

  return deliveries
}
