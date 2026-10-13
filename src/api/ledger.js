import client from './client'

// Newest entries first. from and to are whole days (YYYY-MM-DD, Kigali time), both inclusive.
export async function listLedger({ type, memberId, lotId, from, to, search, page = 0, size = 20 } = {}) {
  const params = { page, size }
  if (type) params.type = type
  if (memberId) params.memberId = memberId
  if (lotId) params.lotId = lotId
  if (from) params.from = from
  if (to) params.to = to
  if (search) params.search = search

  const response = await client.get('/api/ledger', { params })
  return response.data
}

// Recomputes every hash on the backend: { valid, checkedEntries, firstBrokenEntryId }.
export async function verifyLedger() {
  const response = await client.get('/api/ledger/verify')
  return response.data
}

export async function getLedgerSummary() {
  const response = await client.get('/api/ledger/summary')
  return response.data
}

// Adds a REVERSAL entry that cancels the given one; the original stays in the ledger.
export async function reverseEntry(id, reason) {
  const response = await client.post(`/api/ledger/${id}/reverse`, { reason })
  return response.data
}

const SEARCH_PAGE_SIZE = 100

// There is no endpoint for a single entry. The unfiltered list is sorted by id from newest to
// oldest, so a binary search over its pages finds the page that holds the entry in a few requests.
export async function findLedgerEntry(id) {
  let low = 0
  let high = (await listLedger({ page: 0, size: SEARCH_PAGE_SIZE })).totalPages - 1
  while (low <= high) {
    const page = Math.floor((low + high) / 2)
    const { content } = await listLedger({ page, size: SEARCH_PAGE_SIZE })
    if (content.length === 0) return null
    const found = content.find((entry) => entry.id === id)
    if (found) return found
    // Pages hold descending ids: a smaller id lives further back, a larger one further forward.
    if (id < content[content.length - 1].id) low = page + 1
    else if (id > content[0].id) high = page - 1
    else return null
  }
  return null
}
