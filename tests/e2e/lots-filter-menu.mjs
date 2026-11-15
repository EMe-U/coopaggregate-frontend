// Lots & Stock: Status and Grade as plain-text menus ("Status ⌄", "Status: Sold ⌄").
const KEYS = { Enter: 13, Escape: 27, Tab: 9, ArrowDown: 40, ArrowUp: 38, Home: 36, End: 35 }
async function press(key) {
  const common = { key, code: key, windowsVirtualKeyCode: KEYS[key], nativeVirtualKeyCode: KEYS[key] }
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', ...common, ...(key === 'Enter' && { text: '\r' }) })
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', ...common })
  await sleep(150)
}
const lotQueries = async () => (await log()).filter((c) => c.method === 'GET' && /^\/api\/lots(\/active)?$/.test(c.path)).map((c) => new URLSearchParams(c.query ?? ''))
const triggerText = (n) => evaluate(`${filterButton(n)}.innerText.trim()`)
const menuOpen = () => evaluate(`document.querySelectorAll('[role=menu]').length > 0`)
const items = () => evaluate(`[...document.querySelectorAll('[role=menuitemradio]')].map((o) => o.innerText.trim() + (o.getAttribute('aria-checked') === 'true' ? '*' : ''))`)
const focused = () => evaluate(`document.activeElement.innerText.trim()`)
const focusIsTrigger = (n) => evaluate(`document.activeElement === ${filterButton(n)}`)

try {
  await cdp('Runtime.enable')
  await cdp('Page.enable')
  await desktop()
  await open('/lots', 'en', 'A-2026-02')
  await sleep(500)

  // Look: plain words on the right, no box, no select.
  check('no <select> on the page', await evaluate(`document.querySelectorAll('select').length === 0`))
  check('defaults read "Status" and "Grade" (no value)', (await triggerText(0)) === 'Status' && (await triggerText(1)) === 'Grade', `${await triggerText(0)} / ${await triggerText(1)}`)
  const look = await evaluate(`(() => { const b = ${filterButton(0)}; const cs = getComputedStyle(b); const card = b.closest('section').getBoundingClientRect(); const r = b.getBoundingClientRect(); const g = ${filterButton(1)}.getBoundingClientRect(); return { border: cs.borderTopWidth, bg: cs.backgroundColor, chevron: !!b.querySelector('svg'), gapRight: Math.round(card.right - g.right), order: r.right <= g.left, h: r.height } })()`)
  check('no border or box, with a chevron', look.border === '0px' && /rgba\(0, 0, 0, 0\)|transparent/.test(look.bg) && look.chevron, JSON.stringify(look))
  check('on the right, Status then Grade, 44 px tall', look.gapRight < 40 && look.order && look.h >= 44, JSON.stringify(look))
  check('screen reader name carries the value', (await evaluate(`${filterButton(0)}.getAttribute('aria-label')`)) === 'Status: Active' && (await evaluate(`${filterButton(0)}.getAttribute('aria-haspopup')`)) === 'menu')

  // Mouse: click the word, the menu opens under it with a check on the current option.
  await openFilter(0)
  check('Status menu: Active ✓ / Sold / Emptied / All', (await items()).join('|') === 'Active*|Sold|Emptied|All', (await items()).join('|'))
  const place = await evaluate(`(() => { const b = ${filterButton(0)}.getBoundingClientRect(); const m = document.querySelector('[role=menu]').getBoundingClientRect(); return { below: m.top >= b.bottom - 1, alignedRight: Math.abs(m.right - b.right) < 2, onScreen: m.bottom <= innerHeight } })()`)
  check("menu opens under the word, fully on screen", place.below && place.alignedRight && place.onScreen, JSON.stringify(place))
  check('only the current option shows the check mark', await evaluate(`[...document.querySelectorAll('[role=menuitemradio]')].every((o) => (getComputedStyle(o.querySelector('svg')).visibility === 'visible') === (o.getAttribute('aria-checked') === 'true'))`))
  check('opening focuses the current option', (await focused()) === 'Active')
  await screenshot('filtermenu-open-desktop.png')
  await evaluate(`[...document.querySelectorAll('[role=menuitemradio]')][1].click()`)
  await sleep(600)
  check('choosing Sold closes the menu', !(await menuOpen()))
  check('trigger reads "Status: Sold"', (await triggerText(0)) === 'Status: Sold', await triggerText(0))
  check('list asks ?status=SOLD', (await lotQueries()).at(-1).get('status') === 'SOLD')
  check('the list shows only sold lots', (await body()).includes('B-2026-02') && !(await body()).includes('A-2026-01'))

  // The chevron opens it too; clicking outside closes it.
  await evaluate(`${filterButton(0)}.querySelector('svg').dispatchEvent(new MouseEvent('click', { bubbles: true }))`)
  await sleep(150)
  check('clicking the chevron opens the menu, Sold ✓', (await menuOpen()) && (await items()).join('|') === 'Active|Sold*|Emptied|All')
  await evaluate(`document.querySelector('h2').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))`)
  await sleep(150)
  check('clicking outside closes it', !(await menuOpen()))
  // Escape closes and returns to the word.
  await openFilter(0)
  await press('Escape')
  check('Escape closes it and focus returns to "Status: Sold"', !(await menuOpen()) && (await focusIsTrigger(0)))
  // Choosing the same option changes nothing.
  const before = (await lotQueries()).length
  await pickFilter(0, 1)
  check('choosing the current option sends no new request', (await lotQueries()).length === before)

  // Keyboard: Tab to Grade, Enter opens, arrows move, Home / End, Enter chooses.
  await press('Tab')
  check('Tab moves from Status to Grade', await focusIsTrigger(1))
  await press('Enter')
  check('Enter opens Grade, on "All" (checked)', (await menuOpen()) && (await focused()) === 'All' && (await items())[0] === 'All*', (await items()).join('|'))
  await press('ArrowDown')
  check('ArrowDown moves to Grade A', (await focused()) === 'Grade A')
  await press('End')
  check('End goes to the last grade', (await focused()) === 'Grade B')
  await press('Home')
  check('Home goes back to All', (await focused()) === 'All')
  await press('ArrowUp')
  check('ArrowUp from the first wraps to the last', (await focused()) === 'Grade B')
  await press('Enter')
  await sleep(500)
  check('Enter chooses Grade B: menu closed, "Grade: Grade B", focus back on the word', !(await menuOpen()) && (await triggerText(1)) === 'Grade: Grade B' && (await focusIsTrigger(1)), await triggerText(1))
  const q = (await lotQueries()).at(-1)
  check('list asks status=SOLD and gradeId=2, page 0', q.get('status') === 'SOLD' && q.get('gradeId') === '2' && q.get('page') === '0', q.toString())
  await press('ArrowDown')
  check('ArrowDown on the word opens the menu on the current option', (await menuOpen()) && (await focused()) === 'Grade B')
  await press('Tab')
  check('Tab closes the menu and stays on the word', !(await menuOpen()) && (await focusIsTrigger(1)))
  await screenshot('filtermenu-values-desktop.png')

  // Back to the defaults: the words alone again, Active asks /active.
  await pickFilter(0, 0)
  await pickFilter(1, 0)
  check('back to defaults: "Status" and "Grade"', (await triggerText(0)) === 'Status' && (await triggerText(1)) === 'Grade')
  check('Active asks the active lots, no gradeId', (await lotQueries()).slice(-2).every((p) => !p.get('gradeId') && p.get('status') !== 'SOLD'))

  // Phone: on the right, inside the screen, the menu too.
  await phone()
  await open('/lots', 'rw', 'A-2026-02')
  await sleep(500)
  check('rw defaults: "Uko gihagaze" and "Urwego"', (await triggerText(0)) === 'Uko gihagaze' && (await triggerText(1)) === 'Urwego', `${await triggerText(0)} / ${await triggerText(1)}`)
  await pickFilter(0, 1)
  await pickFilter(1, 1)
  const t0 = await triggerText(0)
  const t1 = await triggerText(1)
  check('rw values: "Uko gihagaze: …" and "Urwego: …"', t0.startsWith('Uko gihagaze: ') && t1.startsWith('Urwego: '), `${t0} / ${t1}`)
  check('phone: both words inside the screen', await evaluate(`[0, 1].every((n) => { const r = [...document.querySelectorAll('button[aria-haspopup=menu]')].filter((b) => b.offsetParent && /^(Uko gihagaze|Urwego)(:|$)/.test(b.getAttribute('aria-label')))[n].getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth })`))
  await openFilter(1)
  check('phone: menu inside the screen', await evaluate(`(() => { const m = document.querySelector('[role=menu]').getBoundingClientRect(); return m.left >= 0 && m.right <= innerWidth })()`))
  await screenshot('filtermenu-rw-phone.png')
  await press('Escape')
  check('phone: no sideways scroll', await noSideScroll())

  check('no page errors', errs.length === 0, errs.join(' || '))
