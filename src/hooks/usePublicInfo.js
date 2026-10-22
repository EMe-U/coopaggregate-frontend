import { useEffect, useState } from 'react'
import { getPublicInfo, listPublicGrades } from '../api/public'

// What the public pages show about the cooperative and its grades. Each part has its own state:
// { data, error }, with data null while loading. reload tries both again.
export default function usePublicInfo() {
  const [info, setInfo] = useState({ data: null, error: false })
  const [grades, setGrades] = useState({ data: null, error: false })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false
    setInfo({ data: null, error: false })
    setGrades({ data: null, error: false })
    getPublicInfo()
      .then((data) => !ignore && setInfo({ data, error: false }))
      .catch(() => !ignore && setInfo({ data: null, error: true }))
    listPublicGrades()
      .then((data) => !ignore && setGrades({ data, error: false }))
      .catch(() => !ignore && setGrades({ data: null, error: true }))
    return () => {
      ignore = true
    }
  }, [reloadKey])

  return { info, grades, reload: () => setReloadKey((key) => key + 1) }
}
