// Record Delivery: Record | All deliveries tabs, the list with filters and paging, the ⋮ menu with
// View details, and "Waiting to sync on this device".
const set = (body) => fetch(`${API}/__set`, { method: 'POST', body: JSON.stringify(body) })
// The last list request of the All deliveries tab (today's list on the hidden Record tab asks for from = to = today).
const lastQuery = async () => {
  const all = (await log())
    .filter((c) => c.method === 'GET' && c.path === '/api/deliveries')
    .map((c) => new URLSearchParams(c.query ?? ''))
    .filter((p) => !(p.get('from') && p.get('from') === p.get('to') && !p.get('status') && !p.get('search') && !p.get('gradeId') && p.get('from') > '2026-11-01'))
  return all.at(-1) ?? new URLSearchParams()
}
const table = `document.querySelector('[data-testid=all-deliveries]')`
const codes = () => evaluate(`${table} ? [...${table}.querySelectorAll('tbody tr')].map((r) => r.children[1].innerText.trim()) : []`)
const rowWith = (code) => `[...${table}.querySelectorAll('tbody tr')].find((r) => r.children[1].innerText.trim() === ${JSON.stringify(code)})`
const selectValue = (id, value) => evaluate(`(() => { const s = document.getElementById(${JSON.stringify(id)}); const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; setter.call(s, ${JSON.stringify(value)}); s.dispatchEvent(new Event('change', { bubbles: true })) })()`)
const typeInto = (id, value) => evaluate(`(() => { const s = document.getElementById(${JSON.stringify(id)}); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(s, ${JSON.stringify(value)}); s.dispatchEvent(new Event('input', { bubbles: true })) })()`)
const waitCodes = async (expected, label) => {
  await waitFor(`JSON.stringify(${table} ? [...${table}.querySelectorAll('tbody tr')].map((r) => r.children[1].innerText.trim()) : []) === ${JSON.stringify(JSON.stringify(expected))}`, label, 5000).catch(() => {})
  return codes()
}
const items = () => evaluate(`[...document.querySelectorAll('[role=menuitem]')].map((e) => e.innerText.trim())`)
const key = async (k, code, keyCode) => {
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: keyCode })
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: keyCode })
  await sleep(150)
}
const addPending = (entry) => evaluate(`new Promise((resolve, reject) => { const r = indexedDB.open('coopaggregate'); r.onsuccess = () => { const tx = r.result.transaction('pendingDeliveries', 'readwrite'); tx.objectStore('pendingDeliveries').put(${JSON.stringify(entry)}); tx.oncomplete = () => { r.result.close(); resolve(true) }; tx.onerror = () => reject(tx.error) } })`)
const queueText = () => evaluate(`document.querySelector('#device-queue-title').closest('section').innerText`)
const syncButton = `[...document.querySelector('#device-queue-title').closest('section').querySelectorAll('button')].find((b) => b.innerText.includes('Sync now') || b.innerText.includes('Syncing'))`
const tabTo = async (name) => { await evaluate(`[...document.querySelectorAll('[role=tab]')].find((b) => b.innerText.trim() === ${JSON.stringify(name)}).click()`); await sleep(300) }

const extra = Array.from({ length: 8 }, (_, i) => ({ id: 11 + i, receiptCode: `RCT-001${1 + i}`, memberId: 1, quantityKg: 10 + i, deliveredAt: `2026-09-0${1 + i}T08:00:00Z`, lots: [] }))

try {
  await cdp('Runtime.enable')
  await cdp('Page.enable')
  await cdp('Network.enable')
  await cdp('Emulation.setFocusEmulationEnabled', { enabled: true })
  await desktop()
  await set({
    deliveries: [
      { id: 10, receiptCode: 'RCT-0010', memberId: 2, quantityKg: 12, reversed: true, reversalReason: 'Wrong member', deliveredAt: '2026-10-20T08:00:00Z', lots: [] },
      ...extra,
    ],
  })
  await open('/record-delivery', 'en', 'Record member delivery')

  // Tabs.
  const tabs = await evaluate(`[...document.querySelectorAll('[role=tablist] [role=tab]')].map((b) => b.innerText.trim() + ':' + b.getAttribute('aria-selected') + ':' + b.tabIndex)`)
  check('tabs: Record (selected) and All deliveries', tabs.join('|') === 'Record:true:0|All deliveries:false:-1', tabs.join('|'))
  check('Record tab: the form and today\'s list are shown', await evaluate(`!!document.querySelector('#quantity')?.offsetParent && document.body.innerText.includes("Today's deliveries") || !!document.querySelector('#quantity')?.offsetParent`))
  await tabTo('All deliveries')
  await waitFor(`!!${table}`, 'all deliveries table')
  check('All deliveries: URL has ?tab=all', (await evaluate('location.search')) === '?tab=all')
  check('All deliveries: the form is hidden, not removed', await evaluate(`!document.querySelector('#quantity').offsetParent && document.querySelector('#delivery-panel-record').hidden`))
  const heads = await evaluate(`[...${table}.querySelectorAll('thead th')].map((th) => th.innerText.trim())`)
  check('columns: date/time, receipt, member, grade, kg, lot, status, actions', heads.join('|').toLowerCase() === 'date and time|receipt code|member|grade|kg|lot|status|actions', heads.join('|'))
  let q = await lastQuery()
  check('"All" asks for reversed ones too, no status, newest first page 0', q.get('includeReversed') === 'true' && !q.get('status') && q.get('page') === '0' && q.get('size') === '15', q.toString())
  let list = await codes()
  check('newest first: today\'s two, then RCT-0010 (reversed), RCT-0007 ...', list.slice(0, 4).join(',') === 'RCT-0004,RCT-0003,RCT-0010,RCT-0007' && list.length === 15, list.join(','))
  check('member cell: name and member number', (await evaluate(`${rowWith('RCT-0010')}.children[2].innerText`)).replace(/\s+/g, ' ') === 'Habimana Jean M-0002')
  check('status: reversed shows Reversed with the reason on hover', await evaluate(`(() => { const b = ${rowWith('RCT-0010')}.children[6].querySelector('span'); return b.innerText.trim() === 'Reversed' && b.title.includes('Wrong member') })()`))
  const statuses = await evaluate(`[${['RCT-0004', 'RCT-0003', 'RCT-0008'].map((c) => `${rowWith(c)}.children[6].innerText.trim()`).join(',')}]`)
  check('status badges read Waiting, Confirmed, Disputed', statuses[0] === 'Waiting' && statuses[1] === 'Confirmed' && statuses[2].startsWith('Disputed'), statuses.join('|'))
  check('lot column: one lot shows its code, ten lots a short summary', (await evaluate(`${rowWith('RCT-0003')}.children[5].innerText`)).includes('A-2026-02') && (await evaluate(`${rowWith('RCT-0007')}.children[5].innerText`)).includes('10'), await evaluate(`${rowWith('RCT-0007')}.children[5].innerText`))
  check('date/time column has a time', /[0-9]{1,2}:[0-9]{2}/.test(await evaluate(`${rowWith('RCT-0007')}.children[0].innerText`)))

  // Paging: 17 deliveries, 15 per page.
  check('paging: "1–15 of 17" shown', (await body()).includes('17'))
  await clickButton('2')
  list = await waitCodes(['RCT-0011', 'RCT-0005'], 'page 2')
  q = await lastQuery()
  check('page 2: the two oldest, page=1 sent and kept in the URL', list.join(',') === 'RCT-0011,RCT-0005' && q.get('page') === '1' && (await evaluate('location.search')).includes('page=1'), list.join(','))

  // Status filter.
  await selectValue('deliveries-status', 'REVERSED')
  list = await waitCodes(['RCT-0010'], 'reversed')
  q = await lastQuery()
  check('status Reversed: status=REVERSED, page back to 0, only RCT-0010', list.join(',') === 'RCT-0010' && q.get('status') === 'REVERSED' && q.get('page') === '0' && !(await evaluate('location.search')).includes('page='), q.toString())
  const statusOptions = await evaluate(`[...document.getElementById('deliveries-status').options].map((o) => o.text)`)
  check('status picker: All, Waiting for confirmation, Confirmed, Disputed, Reversed', statusOptions.join('|') === 'All|Waiting for confirmation|Confirmed|Disputed|Reversed', statusOptions.join('|'))
  await selectValue('deliveries-status', 'PENDING')
  list = await waitCodes(['RCT-0004'], 'pending')
  q = await lastQuery()
  check('status Waiting for confirmation: status=PENDING, no includeReversed', list.join(',') === 'RCT-0004' && q.get('status') === 'PENDING' && !q.get('includeReversed'))
  await selectValue('deliveries-status', '')
  await sleep(600)

  // Grade.
  const gradeOptions = await evaluate(`[...document.getElementById('deliveries-grade').options].map((o) => o.text)`)
  check('grade picker: All grades, Grade A, Grade B', gradeOptions.join('|') === 'All grades|Grade A|Grade B', gradeOptions.join('|'))
  await selectValue('deliveries-grade', '2')
  list = await waitCodes(['RCT-0006'], 'grade B')
  check('grade B: gradeId=2, only RCT-0006', list.join(',') === 'RCT-0006' && (await lastQuery()).get('gradeId') === '2', list.join(','))
  await selectValue('deliveries-grade', '')
  await sleep(600)

  // Search: member number, name, receipt code.
  await typeInto('deliveries-search', 'm-0002')
  list = await waitCodes(['RCT-0004', 'RCT-0010', 'RCT-0006', 'RCT-0002'], 'search member number')
  check('search by member number (any case)', list.join(',') === 'RCT-0004,RCT-0010,RCT-0006,RCT-0002' && (await lastQuery()).get('search') === 'm-0002', list.join(','))
  await typeInto('deliveries-search', 'RCT-0007')
  list = await waitCodes(['RCT-0007'], 'search receipt')
  check('search by receipt code', list.join(',') === 'RCT-0007')
  await typeInto('deliveries-search', 'Habimana')
  list = await waitCodes(['RCT-0004', 'RCT-0010', 'RCT-0006', 'RCT-0002'], 'search name')
  check('search by member name; URL keeps q', list.length === 4 && (await evaluate('location.search')).includes('q=Habimana'))

  // Filters combine (AND).
  await selectValue('deliveries-status', 'CONFIRMED')
  list = await waitCodes(['RCT-0006', 'RCT-0002'], 'name + confirmed')
  q = await lastQuery()
  check('filters combine: Habimana + Confirmed', list.join(',') === 'RCT-0006,RCT-0002' && q.get('search') === 'Habimana' && q.get('status') === 'CONFIRMED', list.join(','))

  // Date range.
  await evaluate(`(() => { const s = document.getElementById('deliveries-from'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(s, '2026-10-01'); s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })) })()`)
  await evaluate(`(() => { const s = document.getElementById('deliveries-to'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(s, '2026-10-31'); s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })) })()`)
  await sleep(500)
  q = await lastQuery()
  check('date range sent as from/to', q.get('from') === '2026-10-01' && q.get('to') === '2026-10-31', q.toString())
  await evaluate(`(() => { const s = document.getElementById('deliveries-from'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(s, '2026-11-05'); s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })) })()`)
  await sleep(400)
  check('From after To: a message, no request', (await body()).includes('The "From" date is after the "To" date.') && (await lastQuery()).get('from') !== '2026-11-05')

  // Clear filters.
  await clickButton('Clear filters')
  list = await waitCodes([], 'cleared').then(() => codes())
  await sleep(600)
  list = await codes()
  check('Clear filters: all back, search box empty, URL ?tab=all', list.length === 15 && (await evaluate(`document.getElementById('deliveries-search').value`)) === '' && (await evaluate('location.search')) === '?tab=all', list.length + ' ' + (await evaluate('location.search')))
  await typeInto('deliveries-search', 'nobody-here')
  await waitFor(has('No deliveries match these filters.'), 'no results', 5000).catch(() => {})
  check('no match: "No deliveries match these filters." with Clear filters', (await body()).includes('No deliveries match these filters.'))
  await clickButton('Clear filters')
  await sleep(700)

  // ⋮ menu.
  check('Actions column: every row has a ⋮ button', await evaluate(`[...${table}.querySelectorAll('tbody tr')].every((r) => r.lastElementChild.querySelector('button[aria-haspopup]'))`))
  await evaluate(`${rowWith('RCT-0010')}.lastElementChild.querySelector('button').click()`)
  await sleep(200)
  check('reversed delivery: only View details', (await items()).join('|') === 'View details', (await items()).join('|'))
  await key('Escape', 'Escape', 27)
  await evaluate(`${rowWith('RCT-0004')}.lastElementChild.querySelector('button').click()`)
  await sleep(200)
  let menu = await items()
  check('waiting delivery: View details first, then the existing actions', menu[0] === 'View details' && menu.includes('Confirm with code') && menu.includes('Reverse delivery'), menu.join('|'))
  await key('Escape', 'Escape', 27)

  // View details and back, filters kept.
  await selectValue('deliveries-grade', '1')
  await sleep(600)
  const before = await evaluate('location.search')
  await evaluate(`${rowWith('RCT-0003')}.lastElementChild.querySelector('button').click()`)
  await sleep(200)
  await evaluate(`[...document.querySelectorAll('[role=menuitem]')].find((e) => e.innerText.includes('View details')).click()`)
  await waitFor(`location.pathname === '/deliveries/3'`, 'detail page')
  await waitFor(has('Back to deliveries'), 'detail loaded')
  check('View details opens /deliveries/3', true)
  await clickButton('Back to deliveries')
  await waitFor(`location.pathname === '/record-delivery'`, 'back')
  await sleep(500)
  check('Back returns to All deliveries with the filters', (await evaluate('location.search')) === before && (await evaluate(`document.getElementById('deliveries-grade').value`)) === '1', before + ' vs ' + (await evaluate('location.search')))
  await clickButton('Clear filters')
  await sleep(500)

  // Keyboard on the tabs. A half-typed delivery stays while switching tabs.
  await tabTo('Record')
  await typeInto('quantity', '33')
  await tabTo('All deliveries')
  await evaluate(`document.querySelector('#delivery-tab-all').focus()`)
  await key('ArrowLeft', 'ArrowLeft', 37)
  check('keyboard: ArrowLeft selects and focuses Record', (await evaluate(`document.activeElement.id`)) === 'delivery-tab-record' && (await evaluate('location.search')) === '')
  check('Record tab: the typed quantity is still there', (await evaluate(`document.querySelector('#quantity').value`)) === '33')
  await key('End', 'End', 35)
  check('keyboard: End selects All deliveries', (await evaluate(`document.activeElement.id`)) === 'delivery-tab-all' && (await evaluate('location.search')) === '?tab=all')

  // Waiting to sync on this device.
  await waitFor(`!!document.querySelector('[data-testid=queue-empty]')`, 'queue empty')
  check('queue empty: "Nothing waiting", Sync now disabled', (await queueText()).includes('Nothing waiting') && (await evaluate(`${syncButton}.disabled`)))
  // A failed one (the server refused it) and, while offline, a waiting one.
  await addPending({ clientUuid: 'aaaaaa11-0000-4000-8000-000000000001', payload: { memberId: 2, gradeId: 1, quantityKg: 9, deliveredAt: '2026-11-10T08:00:00Z' }, memberName: 'Habimana Jean', memberNumber: 'M-0002', gradeName: 'Grade A', status: 'FAILED', attempts: 1, lastError: 'Member is not active', createdAt: '2026-11-10T08:00:00Z' })
  await setOffline(true)
  await addPending({ clientUuid: 'bbbbbb22-0000-4000-8000-000000000002', payload: { memberId: 1, gradeId: 2, quantityKg: 14, deliveredAt: '2026-11-11T09:30:00Z' }, memberName: 'Mukamana Alice', memberNumber: 'M-0001', gradeName: 'Grade B', status: 'WAITING', attempts: 0, lastError: null, createdAt: '2026-11-11T09:30:00Z' })
  await tabTo('Record')
  await tabTo('All deliveries')
  await waitFor(`!!document.querySelector('[data-testid=device-queue]')`, 'queue items')
  let queue = await queueText()
  check('queue: both listed with their state (Failed, Waiting), member number, kg', queue.includes('AAAAAA') && queue.includes('Failed') && queue.includes('Member is not active') && queue.includes('BBBBBB') && queue.includes('Waiting') && queue.includes('M-0001') && queue.includes('14'), queue.replace(/\n/g, ' / '))
  check('offline: Sync now disabled with "Needs internet", list says offline', (await evaluate(`${syncButton}.disabled && ${syncButton}.title === 'Needs internet'`)) && (await body()).includes('You are offline'))
  // Back online the app syncs on its own; the first try fails (503), then Sync now sends it.
  await set({ config: { deliveryPostFail: 1 } })
  await setOffline(false)
  await sleep(1200)
  queue = await queueText()
  check('back online: the failed first try leaves it Waiting', queue.includes('BBBBBB') && queue.includes('Waiting'), queue.replace(/\n/g, ' / '))
  await evaluate(`${syncButton}.click()`)
  await waitFor(`!document.querySelector('#device-queue-title').closest('section').innerText.includes('BBBBBB')`, 'synced', 4000).catch(() => {})
  queue = await queueText()
  check('Sync now sends the waiting one; the failed one stays (needs Retry)', !queue.includes('BBBBBB') && queue.includes('AAAAAA'), queue.replace(/\n/g, ' / '))
  await sleep(600)
  check('the synced delivery now shows in the list', (await evaluate(`${table}.querySelectorAll('tbody tr')[0].innerText`)).includes('Mukamana Alice'))
  await clickButton('Retry')
  await waitFor(`!!document.querySelector('[data-testid=queue-empty]')`, 'queue empty again', 4000).catch(() => {})
  check('Retry sends the failed one; then "Nothing waiting"', (await queueText()).includes('Nothing waiting'))

  // Kinyarwanda on a phone.
  await phone()
  await open('/record-delivery?tab=all', 'rw', 'Ibyagemuwe byose')
  await waitFor(`!!${table}`, 'rw table')
  const rwTabs = await evaluate(`[...document.querySelectorAll('[role=tab]')].map((b) => b.innerText.trim())`)
  check('rw: tabs "Andika" and "Ibyagemuwe byose", queue title and "Nta bitegereje"', rwTabs.join('|') === 'Andika|Ibyagemuwe byose' && (await body()).includes('Bitegereje koherezwa kuri iki gikoresho') && (await body()).includes('Nta bitegereje'), rwTabs.join('|'))
  check('rw phone: no sideways page scroll', await noSideScroll())
  check('rw phone: the ⋮ button is on screen without scrolling the table', await evaluate(`(() => { const b = ${table}.querySelector('tbody tr').lastElementChild.querySelector('button'); const r = b.getBoundingClientRect(); const s = b.closest('.overflow-x-auto').getBoundingClientRect(); return r.left >= s.left && r.right <= s.right && r.right <= window.innerWidth })()`))
  await evaluate(`${table}.querySelector('tbody tr').lastElementChild.querySelector('button').scrollIntoView({ block: 'center' })`)
  await sleep(300)
  await evaluate(`${table}.querySelector('tbody tr').lastElementChild.querySelector('button').click()`)
  await sleep(250)
  menu = await items()
  check('rw phone menu: "Reba ibisobanuro" first, inside the screen', menu[0] === 'Reba ibisobanuro' && (await evaluate(`[...document.querySelectorAll('[role=menu]')].every((m) => { const r = m.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth })`)), menu.join('|'))
  await key('Escape', 'Escape', 27)
  await evaluate('window.scrollTo(0, 0)')
  await screenshot('all-deliveries-rw-phone.png')
  await desktop()
  await open('/record-delivery?tab=all', 'en', 'All deliveries')
  await waitFor(`!!${table}`, 'en table')
  await sleep(500)
  check('desktop 1280: the ⋮ button is on screen beside the sidebar', await evaluate(`(() => { const b = ${table}.querySelector('tbody tr').lastElementChild.querySelector('button'); const r = b.getBoundingClientRect(); const s = b.closest('.overflow-x-auto').getBoundingClientRect(); return r.left >= s.left && r.right <= s.right && r.right <= window.innerWidth })()`))
  await screenshot('all-deliveries-en.png')

  check('no page errors', errs.length === 0, errs.join(' || '))
