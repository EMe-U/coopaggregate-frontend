import { listGrades } from '../api/grades'
import { getMember, listMembers } from '../api/members'
import { readCache, readCacheEntry, writeCache } from './db'

const MEMBERS_PAGE_SIZE = 100

// Fetches from the server and saves a copy. Without internet, or when the server cannot be reached,
// returns the last saved copy instead. savedAt is null for fresh data and the time of the copy
// otherwise, so the page can say how old it is.
export async function loadWithCache(key, fetcher) {
  if (navigator.onLine) {
    try {
      const data = await fetcher()
      writeCache(key, data).catch(() => {})
      return { data, savedAt: null }
    } catch (error) {
      // The server answered with an error, so a saved copy could be out of date.
      if (error.response) throw error
    }
  }
  const entry = await readCacheEntry(key)
  if (!entry) throw new Error(`Nothing saved for ${key}`)
  return { data: entry.value, savedAt: entry.savedAt }
}

// Saves every member, in the server's order (by name), so members can be searched and listed
// without internet.
export async function refreshMemberCache() {
  const members = []
  let page = 0
  let totalPages = 1
  while (page < totalPages) {
    const data = await listMembers({ page, size: MEMBERS_PAGE_SIZE })
    members.push(...data.content)
    totalPages = data.totalPages
    page++
  }
  await writeCache('members', members)
}

// Matches the same fields as the backend search: name, member number, phone and national ID.
// Phones are stored as +2507XXXXXXXX, so the leading 0 of a typed 07... number is dropped.
function matchesSearch(member, search) {
  const text = search.toLowerCase()
  const digits = search.replace(/\D/g, '').replace(/^0/, '')
  return (
    member.fullName.toLowerCase().includes(text) ||
    member.memberCode.toLowerCase().includes(text) ||
    (digits !== '' && member.phone?.includes(digits)) ||
    member.nationalId?.includes(search)
  )
}

// Active members only: they are the ones who can deliver.
export async function searchCachedMembers(search, limit) {
  const members = (await readCache('members')) ?? []
  return members.filter((member) => member.status === 'ACTIVE' && matchesSearch(member, search)).slice(0, limit)
}

// The members list from the saved copy, as the same page shape the server returns.
// active is true, false or undefined for all. Returns null when nothing was saved yet.
async function cachedMembersPage({ page, size, search, active }) {
  const entry = await readCacheEntry('members')
  if (!entry) return null
  const matching = entry.value.filter(
    (member) =>
      (active === undefined || (member.status === 'ACTIVE') === active) && (!search || matchesSearch(member, search)),
  )
  return {
    result: {
      content: matching.slice(page * size, (page + 1) * size),
      page,
      size,
      totalElements: matching.length,
      totalPages: Math.ceil(matching.length / size),
    },
    savedAt: entry.savedAt,
  }
}

// A page of the members list from the server, or from the saved copy without internet.
export async function loadMembersPage(params) {
  if (navigator.onLine) {
    try {
      return { result: await listMembers(params), savedAt: null }
    } catch (error) {
      if (error.response) throw error
    }
  }
  const cached = await cachedMembersPage(params)
  if (!cached) throw new Error('No saved members')
  return cached
}

// A member's profile: the saved profile if it was opened before, otherwise the row from the
// saved members list.
export async function loadMember(id) {
  try {
    return await loadWithCache(`member:${id}`, () => getMember(id))
  } catch (error) {
    if (error.response) throw error
    const entry = await readCacheEntry('members')
    const member = entry?.value.find((saved) => String(saved.id) === String(id))
    if (!member) throw error
    return { data: member, savedAt: entry.savedAt }
  }
}

export async function loadGrades() {
  return (await loadWithCache('grades', listGrades)).data
}

// Called on app start and whenever the connection comes back. Failures are ignored: the
// previous copy stays and the next refresh tries again.
export function refreshOfflineCache() {
  refreshMemberCache().catch(() => {})
  loadGrades().catch(() => {})
}
