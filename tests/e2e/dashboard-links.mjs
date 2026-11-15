// Dashboard "Needs attention": the disputed count matches the list its link opens (status=DISPUTED).
const set = (body) => fetch(`${API}/__set`, { method: 'POST', body: JSON.stringify(body) })
const listQueries = async () => (await log()).filter((c) => c.method === 'GET' && c.path === '/api/deliveries').map((c) => new URLSearchParams(c.query ?? ''))
const rowCodes = () => evaluate(`[...document.querySelectorAll('tbody tr')].map((r) => r.children[0].innerText.trim())`)

try {
  await cdp('Runtime.enable')
  await cdp('Page.enable')
  await desktop()
  await set({
    config: { pendingOver48: 0 },
    deliveries: [
      { id: 20, receiptCode: 'RCT-0020', memberId: 2, quantityKg: 11, confirmationStatus: 'DISPUTED', disputeReason: 'WRONG_KG', disputedAt: '2026-11-01T10:00:00Z', lots: [] },
      // Waiting: delivered 5 days ago but synced 47 hours ago (not late yet); synced 50 hours ago (late); late but reversed.
      { id: 30, receiptCode: 'RCT-0030', memberId: 1, quantityKg: 5, confirmationStatus: 'PENDING', confirmationMethod: null, confirmedAt: null, deliveredAt: new Date(Date.now() - 120 * 3600e3).toISOString(), syncedAt: new Date(Date.now() - 47 * 3600e3).toISOString(), lots: [] },
      { id: 33, receiptCode: 'RCT-0033', memberId: 2, quantityKg: 6, confirmationStatus: 'PENDING', confirmationMethod: null, confirmedAt: null, deliveredAt: new Date(Date.now() - 50 * 3600e3).toISOString(), syncedAt: new Date(Date.now() - 50 * 3600e3).toISOString(), lots: [] },
      { id: 32, receiptCode: 'RCT-0032', memberId: 2, quantityKg: 4, confirmationStatus: 'PENDING', confirmationMethod: null, confirmedAt: null, reversed: true, reversalReason: 'Mistake', deliveredAt: new Date(Date.now() - 60 * 3600e3).toISOString(), syncedAt: new Date(Date.now() - 60 * 3600e3).toISOString(), lots: [] },
      // Disputed, then reversed: neither the count nor the list has it.
      { id: 21, receiptCode: 'RCT-0021', memberId: 1, quantityKg: 7, confirmationStatus: 'DISPUTED', disputeReason: 'WRONG_KG', reversed: true, reversalReason: 'Wrong member', lots: [] },
    ],
  })
  await open('/dashboard', 'en', 'Needs attention')
  await waitFor(has('disputed deliveries'), 'disputed item')
  const countText = await evaluate(`[...document.querySelectorAll('li')].find((l) => l.innerText.includes('disputed deliver')).innerText`)
  const count = Number(/([0-9]+) disputed/.exec(countText)?.[1])
  check('dashboard: "2 disputed deliveries" (the reversed one is not counted)', count === 2, countText)

  await clickButton('Check disputes')
  await waitFor(`location.pathname === '/deliveries' && document.querySelectorAll('tbody tr').length > 0`, 'disputed list')
  await sleep(400)
  check('link opens /deliveries?status=DISPUTED', (await evaluate('location.search')) === '?status=DISPUTED')
  const q = (await listQueries()).at(-1)
  check('the list asks status=DISPUTED (not the old confirmationStatus), no includeReversed', q.get('status') === 'DISPUTED' && !q.get('confirmationStatus') && !q.get('includeReversed') && !q.get('deliveredBefore'), q.toString())
  const codes = await rowCodes()
  check('the list has as many rows as the count, all disputed', codes.length === count && codes.join(',') === 'RCT-0020,RCT-0008', codes.join(','))
  check('every row shows Disputed', await evaluate(`[...document.querySelectorAll('tbody tr')].every((r) => r.innerText.includes('Disputed'))`))
  check('title "Disputed deliveries"', (await body()).includes('Disputed deliveries'))

  // Waiting over 48 hours: counted and listed from when the server saved the delivery.
  await open('/dashboard', 'en', 'Needs attention')
  await waitFor(has('over 48 hours'), 'late item')
  const lateText = await evaluate(`[...document.querySelectorAll('li')].find((l) => l.innerText.includes('over 48 hours')).innerText`)
  const lateCount = Number(/([0-9]+) deliver/.exec(lateText)?.[1])
  check('dashboard: late count leaves out the one synced 47 h ago and the reversed one', lateCount === 2, lateText)
  const clickedAt = Date.now()
  await clickButton('See deliveries')
  await waitFor(`location.pathname === '/deliveries' && document.querySelectorAll('tbody tr').length > 0`, 'late list')
  await sleep(400)
  check('link opens /deliveries?status=PENDING&olderThanHours=48', (await evaluate('location.search')) === '?status=PENDING&olderThanHours=48')
  const late = (await listQueries()).at(-1)
  const cutoff = Date.parse(late.get('createdBefore'))
  check('the list asks status=PENDING and createdBefore = now - 48 h (ISO, UTC)', late.get('status') === 'PENDING' && late.get('createdBefore').endsWith('Z') && Math.abs(cutoff - (clickedAt - 48 * 3600e3)) < 5000 && !late.get('confirmationStatus') && !late.get('deliveredBefore'), late.toString())
  const lateCodes = await rowCodes()
  check('the list has as many rows as the count: RCT-0033 and RCT-0004', lateCodes.length === lateCount && [...lateCodes].sort().join(',') === 'RCT-0004,RCT-0033', lateCodes.join(','))
  check('title "Waiting for confirmation over 48 hours"', (await body()).includes('Waiting for confirmation over 48 hours'))
  // Paging keeps the same cutoff.
  check('one request per load, cutoff not recomputed', (await listQueries()).filter((p) => p.get('createdBefore')).every((p) => p.get('createdBefore') === late.get('createdBefore')))

  check('no page errors', errs.length === 0, errs.join(' || '))
