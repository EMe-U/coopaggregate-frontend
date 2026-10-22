import { useEffect, useState } from 'react'
import { getLot } from '../api/lots'

// The ids, among the given lots, of those that already have sales. A delivery in such a lot can
// no longer be reversed or corrected. Each lot is looked up once, and again when reloadKey changes.
export default function useLotsWithSales(lotIds, reloadKey) {
  const key = [...new Set(lotIds)].sort((a, b) => a - b).join(',')
  const [withSales, setWithSales] = useState(() => new Set())

  useEffect(() => {
    if (key === '') {
      setWithSales(new Set())
      return
    }
    let ignore = false
    const ids = key.split(',').map(Number)
    // A lot that cannot be loaded is not marked; the server still refuses with a 409 message.
    Promise.all(ids.map((id) => getLot(id).then((lot) => (Number(lot.soldKg) > 0 ? id : null), () => null))).then(
      (soldIds) => {
        if (!ignore) setWithSales(new Set(soldIds.filter((id) => id !== null)))
      },
    )
    return () => {
      ignore = true
    }
  }, [key, reloadKey])

  return withSales
}
