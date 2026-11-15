// The list opens on active lots; these checks are about every lot, so "All" is chosen.
const showAll = async () => {
  await pickFilter(0, 3)
}

try {
  await cdp('Runtime.enable')
  await cdp('Page.enable')
  await desktop()

  // Lots & Stock, English, desktop.
  await open('/lots', 'en', 'A-2026-02')
  await showAll()
  await waitFor(has('Older lot'), 'badges')
  let text = await body()
  check('no Close anywhere on Lots & Stock', !/\bclose/i.test(text.replace(/Close menu/g, '')))
  check('fill level of the lot being filled: 72 / 100 kg', (await rowOf('A-2026-02', 'tr')).includes('72 / 100 kg'))
  check('badges Filling / Full / Sold / Older lot', ['A-2026-02|Filling', 'A-2026-01|Full', 'B-2026-02|Sold', 'A-2025-07|Older lot'].every((pair) => {
    const [code, badge] = pair.split('|')
    return text.split('\n').some(() => true) && true
  }) && (await rowOf('A-2026-02', 'tr')).includes('Filling') && (await rowOf('A-2026-01', 'tr')).includes('Full')
    && (await rowOf('B-2026-02', 'tr')).includes('Sold') && (await rowOf('A-2025-07', 'tr')).includes('Older lot'))
  check('shortfall line only where shortfallKg > 0', (await rowOf('B-2026-01', 'tr')).includes('20 kg short') && !(await rowOf('A-2026-01', 'tr')).includes('short'))
  check('older lot shows its kg without a size', (await rowOf('A-2025-07', 'tr')).includes('300 kg') && !(await rowOf('A-2025-07', 'tr')).includes('/ '))
  check('meter on the filling lot at 72%', await evaluate(`[...document.querySelectorAll('[role=meter]')].some((e) => e.getAttribute('aria-valuenow') === '72' && e.firstElementChild.style.width === '72%')`))
  check('stock card counts: filling and full', text.includes('1 filling · 2 full lots'))
  await clickButton('Actions for A-2026-02')
  await sleep(200)
  const items = await menuItems()
  check('menu of a filling lot: view, record sale, record loss, no close', items.join('|') === 'View details|Record sale|Record loss', items.join('|'))
  await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`)
  await clickButton('Actions for B-2026-02')
  await sleep(200)
  const soldItems = await menuItems()
  check('menu of a sold lot: view only', soldItems.join('|') === 'View details', soldItems.join('|'))
  await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`)
  await screenshot('a-lots-desktop.png')

  // Phone width.
  await phone()
  await sleep(500)
  check('phone: fill level and shortfall in the cards', (await rowOf('A-2026-02', 'li')).includes('72 / 100 kg') && (await rowOf('B-2026-01', 'li')).includes('20 kg short'))
  check('phone: no sideways scroll on Lots', await noSideScroll())
  await screenshot('a-lots-phone.png')

  // Lot detail of the full lot with a loss.
  await desktop()
  await open('/lots/11', 'en', 'Members in this lot')
  text = await body()
  check('detail: no Close', !/close lot|closing/i.test(text))
  check('detail: Record loss and Record sale stay', text.includes('Record loss') && text.includes('Record sale'))
  check('detail: fill level 100 / 100 kg and full date', text.includes('100 / 100 kg') && /Full \d/.test(text))
  const alice = await rowOf('Mukamana Alice', 'tr')
  check('detail: member row with kg, sold, lost, left', /60 kg\s+0 kg\s+6 kg\s+54 kg/.test(alice), alice)
  check('detail: header columns Sold, Lost, Left', /Kg\s+Sold\s+Lost\s+Left/.test(text))
  check('detail: each member\'s share of the losses', text.includes("Each member's share of the losses") && /Habimana Jean\s*M-0002\s*4 kg/.test(text))
  check('detail: the lot\'s deliveries include the split delivery with its kg in this lot', /RCT-0002[\s\S]*40 kg\s*of 70 kg/.test(text))
  check('lot filter: deliveries asked with lotId=11', (await calls(/GET \/api\/deliveries$/)).some((c) => c.query.includes('lotId=11')))
  await screenshot('a-detail-desktop.png')

  await open('/lots/13', 'en', 'Members in this lot')
  check('detail of a full lot with a shortfall: shortfall line', (await body()).includes('20 kg short'))
  await open('/lots/10', 'en', 'Members in this lot')
  text = await body()
  check('detail of an older lot: badge and kg only', text.includes('Older lot') && text.includes('300 kg') && !text.includes('/ 100'))

  // Kinyarwanda, phone.
  await phone()
  await open('/lots', 'rw', 'A-2026-02')
  await showAll()
  text = await body()
  check('rw: badges Kiruzuzwa / Cyuzuye / Ikirundo cya kera', text.includes('Kiruzuzwa') && text.includes('Cyuzuye') && text.includes('Ikirundo cya kera'))
  check('rw: shortfall "Haburamo 20 kg"', text.includes('Haburamo 20 kg'))
  check('rw: no "Funga ikirundo"', !text.includes('Funga ikirundo'))
  check('rw phone: no sideways scroll', await noSideScroll())
  await screenshot('a-lots-rw-phone.png')
  await open('/lots/11', 'rw', 'M-0002')
  text = await body()
  check('rw detail: loss shares title and columns', text.includes('Uruhare rwa buri munyamuryango') && text.includes('Bisigaye'))
  check('rw detail phone: no sideways scroll', await noSideScroll())
  await screenshot('a-detail-rw-phone.png')

  check('no request to a close endpoint', (await calls(/close/)).length === 0)
  check('no page errors', errs.length === 0, errs.join(' || '))
