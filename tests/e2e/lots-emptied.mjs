// Backend 424e33f and 356a412: the EMPTIED status, the Active / Sold / Emptied / All filter on Lots &
// Stock (Active by default), "Sold out" instead of a full bar, and the note that fixed-size lots are
// paid by each sale.
const set = (body) => fetch(`${API}/__set`, { method: 'POST', body: JSON.stringify(body) })
const EMPTIED_HELP = 'All deliveries were reversed or corrected before any sale. Nothing to sell or share.'
const lotRequests = async () => (await log()).filter((c) => c.method === 'GET' && c.path === '/api/lots').map((c) => new URLSearchParams(c.query).get('status'))
const codesShown = () => evaluate(`${visible('tbody tr')}.map((r) => r.querySelector('td').innerText.trim())`)
const pick = async (value) => {
  await pickFilter(0, ['active', 'SOLD', 'EMPTIED', 'all'].indexOf(value))
}
const options = async () => {
  await openFilter(0)
  const items = await evaluate(`[...document.querySelectorAll('[role=menuitemradio]')].map((o) => o.innerText.trim() + (o.getAttribute('aria-checked') === 'true' ? '*' : ''))`)
  await evaluate(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`)
  await sleep(100)
  return items
}
const badge = (code) => evaluate(`(() => { const r = ${visible('tr, li')}.find((e) => e.innerText.includes(${JSON.stringify(code)})); const b = r && [...r.querySelectorAll('span.rounded-full')].find((s) => s.title !== undefined && s.className.includes('px-2.5')); return b ? { text: b.innerText.trim(), title: b.title, cls: b.className } : null })()`)

try {
  await cdp('Runtime.enable')
  await cdp('Page.enable')
  await desktop()
  await set({
    lots: [
      { id: 30, code: 'A-2026-03', status: 'EMPTIED', deliveredKg: 0, shortfallKg: 100, remainingKg: 0, memberCount: 0, createdAt: '2026-10-05', closedAt: '2026-10-10', members: [] },
      { id: 31, code: 'A-2026-04', status: 'MYSTERY', deliveredKg: 100, remainingKg: 0, createdAt: '2026-10-06', closedAt: '2026-10-11', members: [] },
    ],
    deliveries: [{ id: 40, receiptCode: 'RCT-0040', memberId: 1, quantityKg: 50, reversed: true, deliveredAt: '2026-10-06T08:00:00Z', lots: [{ lotId: 30, lotCode: 'A-2026-03', lotStatus: 'EMPTIED', kg: 50, soldKg: 0, lostKg: 0, remainingKg: 0 }] }],
    lotShares: [
      { lotCode: 'A-2025-07', status: 'SHARED', memberKg: 300, lotKg: 300, sharePercent: 100, shareRwf: 30000 },
      { lotCode: 'A-2026-03', status: 'EMPTIED', memberKg: 50, lotKg: 50, sharePercent: null, shareRwf: null },
    ],
  })

  // 1. Default: Active, only filling and full lots, newest first.
  await open('/lots', 'en', 'A-2026-02')
  await sleep(500)
  const opts = await options()
  check('filter options: Active (default, checked) / Sold / Emptied / All', opts.join('|') === 'Active*|Sold|Emptied|All', opts.join('|'))
  check('default is Active', (await evaluate(`${filterButton(0)}.getAttribute('aria-label')`)) === 'Status: Active')
  let codes = await codesShown()
  check('Active: only filling and full lots, newest first', codes.join(',') === 'B-2026-01,A-2026-02,A-2026-01', codes.join(','))
  const asked = await lotRequests()
  check('Active asks for FILLING and FULL (the backend takes one status)', asked.includes('FILLING') && asked.includes('FULL') && !asked.includes(null), JSON.stringify(asked))
  check('Active: no sold, emptied or older lot', !codes.some((c) => ['B-2026-02', 'A-2026-03', 'A-2025-07'].includes(c)))

  // Grade filter with Active.
  await pickFilter(1, 2)
  check('Active + Grade B: only B-2026-01', (await codesShown()).join(',') === 'B-2026-01')
  await pickFilter(1, 0)

  // 2. Sold: ?status=SOLD, "Sold out" and the kg sold, no bar.
  await pick('SOLD')
  check('Sold asks ?status=SOLD and lists B-2026-02 only', (await lotRequests()).at(-1) === 'SOLD' && (await codesShown()).join(',') === 'B-2026-02')
  let row = await rowOf('B-2026-02', 'tr')
  check('Sold lot: "Sold out" and "100 kg sold", no bar', row.includes('Sold out') && row.includes('100 kg sold') && !row.includes('100 / 100') && (await evaluate(`[...document.querySelectorAll('tr')].find((r) => r.innerText.includes('B-2026-02')).querySelector('[role=meter]') === null`)), row)

  // 3. Emptied: ?status=EMPTIED, grey badge with its tooltip, "0 of 100 kg", no short warning, view only.
  await pick('EMPTIED')
  check('Emptied asks ?status=EMPTIED and lists A-2026-03 only', (await lotRequests()).at(-1) === 'EMPTIED' && (await codesShown()).join(',') === 'A-2026-03')
  let b = await badge('A-2026-03')
  check('Emptied badge: "Emptied", grey (not the Sold colour), tooltip', b?.text === 'Emptied' && b.cls.includes('slate') && !b.cls.includes('amber') && b.title === EMPTIED_HELP, JSON.stringify(b))
  row = await rowOf('A-2026-03', 'tr')
  check('Emptied lot: "0 of 100 kg", no short warning, no bar', row.includes('0 of 100 kg') && !row.includes('short') && (await evaluate(`[...document.querySelectorAll('tr')].find((r) => r.innerText.includes('A-2026-03')).querySelector('[role=meter]') === null`)), row)
  await clickButton('Actions for A-2026-03')
  await sleep(200)
  check('Emptied lot menu: View details only (no sale, no loss, no share)', (await menuItems()).join('|') === 'View details', (await menuItems()).join('|'))
  await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`)

  // 4. All: everything, the unknown status with a fallback label.
  await pick('all')
  codes = await codesShown()
  check('All: every lot, including sold, emptied and older', ['B-2026-02', 'A-2026-03', 'A-2025-07', 'A-2026-01', 'A-2026-02'].every((c) => codes.includes(c)) && (await lotRequests()).at(-1) === null, codes.join(','))
  b = await badge('A-2026-04')
  check('unknown status: "Other status", its name in the tooltip', b?.text === 'Other status' && b.title.includes('MYSTERY'), JSON.stringify(b))

  // 5. Lot detail.
  await open('/lots/30', 'en', 'A-2026-03')
  let text = await body()
  check('emptied lot page: Emptied badge, explanation, 0 of 100 kg, no short', text.includes('Emptied') && text.includes(EMPTIED_HELP) && text.includes('0 of 100 kg') && !text.includes('short'))
  check('emptied lot page: no Record sale, no Record loss, no Share', !text.includes('Record sale') && !text.includes('Record loss') && !/\bShare\b/.test(text))
  check('emptied lot page: no "paid by each sale" note (nothing was sold)', !text.includes('Members were paid by each sale'))
  await open('/lots/11', 'en', 'A-2026-01')
  text = await body()
  check('fixed-size lot page: "Members were paid by each sale. See their statements."', text.includes('Members were paid by each sale. See their statements.') && !/\bShare\b/.test(text))
  await open('/lots/14', 'en', 'B-2026-02')
  text = await body()
  check('sold lot page: note, Sold out, no full bar', text.includes('Members were paid by each sale') && text.includes('Sold out') && (await evaluate(`document.querySelector('[role=meter]') === null`)))
  await open('/lots/10', 'en', 'A-2025-07')
  check('older lot page: no "paid by each sale" note', !(await body()).includes('Members were paid by each sale'))

  // 6. Member batches and statement.
  await open('/members/1/batches', 'en', 'RCT-0040')
  b = await badge('RCT-0040')
  check('member batches: the batch in an emptied lot shows "Emptied" with its tooltip', b?.text === 'Emptied' && b.title === EMPTIED_HELP, JSON.stringify(b))
  check('member batches: other batches have no Emptied badge', !(await rowOf('RCT-0005')).includes('Emptied'))
  await open('/members/1', 'en', 'Lot shares')
  await waitFor(has('A-2026-03'), 'statement lot lines')
  const shareLine = (code) => evaluate(`${visible('tr')}.filter((r) => r.querySelector('td')?.innerText.trim() === ${JSON.stringify(code)}).map((r) => r.innerText.replace(/\\s+/g, ' ')).join(' || ')`)
  row = await shareLine('A-2026-03')
  check('statement lot line: "Emptied", not "Waiting for sale"', row.includes('Emptied') && !row.includes('Waiting') && !row.includes('||'), row)
  row = await shareLine('A-2025-07')
  check('statement lot line: a shared lot still shows its money', /30[,  ]?000/.test(row), row)

  // 7. Kinyarwanda, phone width.
  await phone()
  await open('/lots', 'rw', 'A-2026-02')
  await sleep(400)
  check('rw phone: Active by default, no sold/emptied/older lot', !(await body()).includes('B-2026-02') && !(await body()).includes('A-2026-03') && !(await body()).includes('A-2025-07'))
  const rwOpts = await options()
  check('rw phone: filter options in Kinyarwanda', rwOpts.join('|') === 'Ibikiri gukoreshwa*|Cyagurishijwe|Cyasigaye ubusa|Byose', rwOpts.join('|'))
  check('rw phone: no sideways scroll', await noSideScroll())
  await screenshot('emptied-rw-phone-active.png')
  await pick('EMPTIED')
  check('rw phone emptied: "Cyasigaye ubusa", "0 kuri 100 kg", no sideways scroll', (await body()).includes('Cyasigaye ubusa') && (await body()).includes('0 kuri 100 kg') && (await noSideScroll()))
  await screenshot('emptied-rw-phone.png')
  await pick('SOLD')
  check('rw phone sold: "Cyagurishijwe cyose" and the kg sold', (await body()).includes('Cyagurishijwe cyose') && (await body()).includes('Hagurishijwe 100 kg'))
  await open('/lots/30', 'rw', 'A-2026-03')
  check('rw phone emptied lot page: explanation, no sideways scroll', (await body()).includes("Ibyagemuwe byose byavanyweho") && (await noSideScroll()))
  await screenshot('emptied-detail-rw-phone.png')
  await open('/lots/11', 'rw', 'A-2026-01')
  check('rw phone fixed-size lot page: paid-by-sale note, no sideways scroll', (await body()).includes('Abanyamuryango bishyuwe kuri buri igurisha') && (await noSideScroll()))
  await desktop()

  check('no page errors', errs.length === 0, errs.join(' || '))
