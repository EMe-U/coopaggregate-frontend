import { listGrades } from '../api/grades'
import { listMembers } from '../api/members'
import { readCache, writeCache } from './db'

const MEMBERS_PAGE_SIZE = 100

// Saves every active member so the member picker can search them without internet.
export async function refreshMemberCache() {
  const members = []
  let page = 0
  let totalPages = 1
  while (page < totalPages) {
    const data = await listMembers({ active: true, page, size: MEMBERS_PAGE_SIZE })
    members.push(...data.content)
    totalPages = data.totalPages
    page++
  }
  await writeCache('members', members)
}

// Matches the same fields as the backend search: name, member number, phone and national ID.
// Phones are stored as +2507XXXXXXXX, so the leading 0 of a typed 07... number is dropped.
export async function searchCachedMembers(search, limit) {
  const members = (await readCache('members')) ?? []
  const text = search.toLowerCase()
  const digits = search.replace(/\D/g, '').replace(/^0/, '')
  return members
    .filter(
      (member) =>
        member.fullName.toLowerCase().includes(text) ||
        member.memberCode.toLowerCase().includes(text) ||
        (digits !== '' && member.phone?.includes(digits)) ||
        member.nationalId?.includes(search),
    )
    .slice(0, limit)
}

// Grades from the server, saved for later; without internet, the last saved copy.
export async function loadGrades() {
  try {
    const grades = await listGrades()
    await writeCache('grades', grades)
    return grades
  } catch (error) {
    // The server answered with an error, so a saved copy could be out of date.
    if (error.response) throw error
    const cached = await readCache('grades')
    if (!cached) throw error
    return cached
  }
}

// Called on app start and whenever the connection comes back. Failures are ignored: the
// previous copy stays and the next refresh tries again.
export function refreshOfflineCache() {
  refreshMemberCache().catch(() => {})
  loadGrades().catch(() => {})
}
