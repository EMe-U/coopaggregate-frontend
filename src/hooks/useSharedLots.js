import { useEffect, useState } from 'react'
import { getLot } from '../api/lots'

// The ids, among the given lots, of those that have been shared. Their deliveries can no longer be
// reversed or corrected, because the lot's money was divided by the kg of all its deliveries. A
// delivery with sold kg is refused too, but only the server knows that (it answers 409). Each lot
// is looked up once, and again when reloadKey changes.
export default function useSharedLots(lotIds, reloadKey) {
  const key = [...new Set(lotIds)].sort((a, b) => a - b).join(',')
  const [shared, setShared] = useState(() => new Set())

  useEffect(() => {
    if (key === '') {
      setShared(new Set())
      return
    }
    let ignore = false
    const ids = key.split(',').map(Number)
    // A lot that cannot be loaded is not marked; the server still refuses with a 409 message.
    Promise.all(ids.map((id) => getLot(id).then((lot) => (lot.status === 'SHARED' ? id : null), () => null))).then(
      (sharedIds) => {
        if (!ignore) setShared(new Set(sharedIds.filter((id) => id !== null)))
      },
    )
    return () => {
      ignore = true
    }
  }, [key, reloadKey])

  return shared
}
