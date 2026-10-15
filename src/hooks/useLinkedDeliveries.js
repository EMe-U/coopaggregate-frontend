import { useEffect, useState } from 'react'
import { getDelivery } from '../api/deliveries'

// A corrected delivery and the one it replaced point at each other by id. This finds the other
// delivery's receipt code and member: from the rows already shown, or from the server when it is
// on another page. Returns linked(id) -> { id, receiptCode, memberId, onPage } or null while loading.
export default function useLinkedDeliveries(deliveries) {
  const shown = new Map(deliveries.map((delivery) => [delivery.id, delivery]))
  const missingKey = [
    ...new Set(
      deliveries
        .flatMap((delivery) => [delivery.correctsId, delivery.correctedById])
        .filter((id) => id != null && !shown.has(id)),
    ),
  ].join(',')
  const [fetched, setFetched] = useState(() => new Map())

  useEffect(() => {
    if (missingKey === '') return
    let ignore = false
    const ids = missingKey.split(',').map(Number)
    Promise.all(ids.map((id) => getDelivery(id).catch(() => null))).then((found) => {
      if (!ignore) setFetched(new Map(found.filter(Boolean).map((delivery) => [delivery.id, delivery])))
    })
    return () => {
      ignore = true
    }
  }, [missingKey])

  return function linked(id) {
    const delivery = shown.get(id) ?? fetched.get(id)
    if (!delivery) return null
    return { id, receiptCode: delivery.receiptCode, memberId: delivery.memberId, onPage: shown.has(id) }
  }
}
