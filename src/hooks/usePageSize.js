import { useSearchParams } from 'react-router-dom'

export const PAGE_SIZE = 15
const MAX_PAGE_SIZE = 100

// The page size for every paginated list. In development, ?size= in the URL overrides it
// (for example /ledger?size=5) so paging can be tested with only a few records.
export default function usePageSize() {
  const [searchParams] = useSearchParams()
  if (!import.meta.env.DEV) return PAGE_SIZE

  const size = Number(searchParams.get('size'))
  return Number.isInteger(size) && size > 0 ? Math.min(size, MAX_PAGE_SIZE) : PAGE_SIZE
}
