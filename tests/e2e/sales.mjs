const type = (selector, value) => evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); const proto = e.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : e.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(e, ${JSON.stringify(value)}); e.dispatchEvent(new Event(e.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })) })()`)
const set = (body) => fetch(`${API}/__set`, { method: 'POST', body: JSON.stringify(body) })
const lotHeadings = () => evaluate(`[...document.querySelectorAll('tr')].filter((r) => r.offsetParent && /^(Lot|Ikirundo) [A-Z]-\\d{4}-\\d\\d/.test(r.innerText.trim())).map((r) => r.innerText.trim().split(' · ')[0].replace(/^(Lot|Ikirundo) /, ''))`)

// Sets the n-th visible labelled input of the sale form (kg, price, kg, price...).
const setKg = (n, value) => evaluate(`(() => { const e = [...document.querySelectorAll('form input')].filter((x) => x.offsetParent && x.getAttribute('aria-label'))[${n}]; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(e, ${JSON.stringify(value)}); e.dispatchEvent(new Event('input', { bubbles: true })) })()`)

async function fillSale(lang) {
  await open('/sales?grade=Grade%20A', lang, 'Musanze')
  await type('#buyer-search', 'Mus')
  await waitFor(`[...document.querySelectorAll('button')].some((b) => b.innerText.includes('Musanze Market Ltd'))`, 'buyer result')
  await evaluate(`[...document.querySelectorAll('button')].find((b) => b.innerText.includes('Musanze Market Ltd')).click()`)
  await sleep(200)
  if (!(await evaluate(`document.querySelector('select').value === '1'`))) await type('select', '1')
  const inputs = await evaluate(`[...document.querySelectorAll('form input')].filter((e) => e.offsetParent).map((e) => e.getAttribute('aria-label'))`)
  await evaluate(`(() => { const inputs = [...document.querySelectorAll('form input')].filter((e) => e.offsetParent && e.getAttribute('aria-label')); const set = (e, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(e, v); e.dispatchEvent(new Event('input', { bubbles: true })) }; set(inputs[0], '100'); set(inputs[1], '300') })()`)
  await evaluate(`document.querySelector('form button[type=submit]').click()`)
  await waitFor(`[...document.querySelectorAll('tr')].some((r) => r.innerText.includes('RCT-'))`, 'preview lines', 15000)
  return inputs
}

try {
  await cdp('Runtime.enable')
  await cdp('Page.enable')
  await desktop()

  // Preview: lines grouped by lot, always the oldest lot first, nothing to skip.
  await fillSale('en')
  let text = await body()
  check('preview: one lot heading A-2025-07 with its kg', JSON.stringify(await lotHeadings()) === '["A-2025-07"]' && /Lot A-2025-07 · 100 kg from 1 delivery/.test(text), JSON.stringify(await lotHeadings()))
  check('preview: no "Skip lot" or "Skip" button, no reason field', (await evaluate(`[...document.querySelectorAll('button')].filter((b) => /^Skip/.test(b.innerText.trim())).length`)) === 0 && !(await evaluate(`!!document.querySelector('textarea')`)))
  check('preview text: the sale uses the oldest lots first', text.includes('A sale always uses the oldest lots first.'))
  check('preview asked without skip params', (await calls(/sale-preview$/)).every((c) => !/skip/i.test(c.query)))
  const saveDisabled = () => evaluate(`[...document.querySelectorAll('button')].find((b) => b.innerText.includes('Save sale')).disabled`)
  check('save enabled straight away (no reason needed)', !(await saveDisabled()))
  // How did the buyer pay? Asked before Save: method required, reference for Mobile money and Bank.
  text = await body()
  check('"How did the buyer pay?" with Cash / Mobile money / Bank, none chosen', text.includes('How did the buyer pay?') && (await evaluate(`[...document.querySelectorAll('[role=radio]')].map((b) => b.innerText.trim() + (b.getAttribute('aria-checked') === 'true' ? '*' : '')).join('|')`)) === 'Cash|Mobile money|Bank')
  await clickButton('Save sale')
  await sleep(300)
  check('Save without a method: "Choose how the buyer paid", nothing sent', (await body()).includes('Choose how the buyer paid') && (await calls(/POST \/api\/sales$/)).length === 0)
  await clickButton('Mobile money')
  await clickButton('Save sale')
  await sleep(300)
  check('Mobile money without reference: "Enter the transaction reference", nothing sent', (await body()).includes('Enter the transaction reference') && (await calls(/POST \/api\/sales$/)).length === 0)
  check('Mobile money: label "Reference #" (required)', (await evaluate(`document.querySelector('label[for=sale-payment-reference]').innerText.trim()`)) === 'Reference #')
  // The reference: hint, 6 to 40 safe characters, the backend's 409 when already used.
  const HINT = 'Transaction ID from MoMo or the bank, e.g. MP241113.1045.A12345'
  check('reference hint under the field, linked to it; at most 40 characters', (await evaluate(`document.getElementById(document.querySelector('#sale-payment-reference').getAttribute('aria-describedby')).innerText.trim()`)) === HINT && (await evaluate(`document.querySelector('#sale-payment-reference').maxLength`)) === 40)
  await type('#sale-payment-reference', 'MP-9')
  await clickButton('Save sale')
  await sleep(300)
  check('too short: "Use 6 to 40 characters…", nothing sent', (await body()).includes('Use 6 to 40 characters: letters, digits, dot (.), dash (-) or slash (/) only.') && (await calls(/POST \/api\/sales$/)).length === 0)
  await type('#sale-payment-reference', 'mp777001')
  await clickButton('Save sale')
  await waitFor(has('was already used'), 'sale 409')
  check('409 shown as it is: "Reference mp777001 was already used for ORD-0003."', (await body()).includes('Reference mp777001 was already used for ORD-0003.') && (await calls(/POST \/api\/sales$/)).at(-1).status === 409)
  // Kept now: changing the settings below clears the mock's request log.
  const uuid409 = (await calls(/POST \/api\/sales$/)).at(-1).body.clientUuid
  await type('#sale-payment-reference', 'MP-900')
  await screenshot('c-preview-desktop.png')

  // A backend error is shown as it is; the refusal to skip is translated.
  await set({ config: { saleErrors: [{ status: 400, message: 'A MOMO buyer payment needs the transaction reference.' }, { status: 400, message: 'Only 50 kg of Grade A can be sold now, but 100 kg were asked for.' }, { status: 400, message: 'Lots cannot be skipped: sales always use the oldest lot first.' }] } })
  await clickButton('Save sale')
  await waitFor(has('buyer payment needs'), 'payment 400')
  check('payment 400 shown as it is', (await body()).includes('A MOMO buyer payment needs the transaction reference.'))
  await clickButton('Save sale')
  await waitFor(has('Only 50 kg'), 'backend error')
  check('backend 400 shown as it is', (await body()).includes('Only 50 kg of Grade A can be sold now, but 100 kg were asked for.'))
  await clickButton('Save sale')
  await waitFor(has('Lots cannot be skipped'), 'no-skip error')
  check('400 "Lots cannot be skipped..." shown as the app message', (await body()).includes('Lots cannot be skipped: a sale always uses the oldest lots first.'))
  await clickButton('Save sale')
  await waitFor(has('saved'), 'result', 10000)
  const posts = await calls(/POST \/api\/sales$/)
  const sent = posts.at(-1).body
  check('POST /api/sales has no skip fields', !Object.keys(sent).some((k) => /skip/i.test(k)), JSON.stringify(sent))
  check('POST /api/sales sends paymentMethod MOMO and paymentReference MP-900', sent.paymentMethod === 'MOMO' && sent.paymentReference === 'MP-900', JSON.stringify(sent))
  const sameRequest = posts.filter((p) => p.body.paymentReference === 'MP-900')
  check('retries after the errors keep the same clientUuid; the 409 attempt (another reference) had its own', sameRequest.length === 4 && sameRequest.every((p) => p.body.clientUuid === sameRequest[0].body.clientUuid) && uuid409 !== sameRequest[0].body.clientUuid)
  check('result: one lot A-2025-07', JSON.stringify(await lotHeadings()) === '["A-2025-07"]', JSON.stringify(await lotHeadings()))
  await screenshot('c-result-desktop.png')

  // More than the oldest lot holds: the next lots follow, in order.
  await fillSale('en')
  await clickButton('Back')
  await sleep(200)
  await setKg(0, '250')
  await evaluate(`document.querySelector('form button[type=submit]').click()`)
  await waitFor(`document.body.innerText.includes('Lot A-2026-01')`, 'preview 250')
  check('250 kg: A-2025-07 first, then the next lot', JSON.stringify((await lotHeadings()).slice(0, 2)) === '["A-2025-07","A-2026-01"]', JSON.stringify(await lotHeadings()))

  // Not enough: the backend message as it is.
  await clickButton('Back')
  await sleep(200)
  await setKg(0, '500')
  await evaluate(`document.querySelector('form button[type=submit]').click()`)
  await waitFor(has('can be sold now'), 'shortage')
  text = await body()
  check('not enough: backend message as it is, save disabled', /Only [\d.]+ kg of Grade A can be sold now, but 500 kg were asked for\./.test(text) && (await saveDisabled()))

  // An order with two grades: no skip fields in any item.
  await clickButton('Back')
  await sleep(200)
  await setKg(0, '100')
  await clickButton('Add another grade')
  await sleep(200)
  await evaluate(`(() => { const sel = [...document.querySelectorAll('form select')].filter((e) => e.offsetParent); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(sel[1], '2'); sel[1].dispatchEvent(new Event('change', { bubbles: true })) })()`)
  await sleep(200)
  await setKg(2, '10')
  await setKg(3, '300')
  await evaluate(`document.querySelector('form button[type=submit]').click()`)
  await waitFor(`[...document.querySelectorAll('button')].some((b) => b.innerText.includes('Save sale') && !b.disabled)`, 'order preview', 15000)
  check('order preview asked without skip params', (await calls(/sale-preview$/)).every((c) => !/skip/i.test(c.query)))
  await clickButton('Cash')
  await sleep(100)
  check('Cash: reference "(optional)"', (await evaluate(`document.querySelector('label[for=sale-payment-reference]').innerText.trim()`)) === 'Reference # (optional)')
  await clickButton('Save sale')
  await waitFor(has('ORD-NEW1'), 'order result', 10000)
  const order = (await calls(/POST \/api\/sales\/orders$/)).at(-1).body
  check('POST /api/sales/orders: two items, no skip fields anywhere', order.items.length === 2 && !/skip/i.test(JSON.stringify(order)), JSON.stringify(order))
  check('POST /api/sales/orders: paymentMethod CASH, paymentReference null, once for the order', order.paymentMethod === 'CASH' && order.paymentReference === null && order.items.every((i) => !('paymentMethod' in i)), JSON.stringify(order))
  // The saved sales are payments received on the Payments page, with their method.
  await open('/payments', 'en', 'ORD-NEW')
  const received = await evaluate(`[...document.querySelectorAll('[data-testid=buyer-payments] tbody tr')].slice(0, 2).map((r) => r.innerText)`)
  check('Payments page: the order (Cash) and the sale (Mobile money, MP-900) on top', received[0].includes('Cash') && received[1].includes('Mobile money') && received[1].includes('MP-900'), JSON.stringify(received))

  // History: the saved sale grouped by lot.
  await open('/sales', 'en', 'SAL-7K2Q')
  await clickButton('3 batches')
  await waitFor(has('Lot A-2026-02'), 'history lines')
    check('history: lines grouped by lot with RCT-0002 twice', JSON.stringify(await lotHeadings()) === '["A-2026-01","A-2026-02"]' && (await evaluate(`[...document.querySelectorAll('tr')].filter((r) => r.offsetParent && !r.querySelector('table') && r.innerText.includes('RCT-0002')).length`)) === 2)

  // Member batches: several lots per batch.
  await open('/members/2/batches', 'en', 'RCT-0002')
  const batchRow = await rowOf('RCT-0002', 'tr')
  check('member batches: RCT-0002 lists both lots on one line', batchRow.includes('A-2026-01 · A-2026-02'), batchRow)
  check('member batches: waiting batch "After confirmation"', (await rowOf('RCT-0004', 'tr')).includes('After confirmation'))
  await screenshot('c-batches-desktop.png')

  // Statement: credit lines with the portion's lot code; deliveries with their lots.
  await open('/members/2', 'en', 'SAL-7K2Q')
  const credits = await evaluate(`[...document.querySelectorAll('tr')].filter((r) => r.offsetParent && r.innerText.includes('SAL-7K2Q')).map((r) => r.innerText)`)
  check('statement: two credit lines for RCT-0002, one per lot code', credits.length === 2 && credits[0].includes('A-2026-01') && credits[1].includes('A-2026-02'), JSON.stringify(credits))
  check('statement deliveries: RCT-0002 with both lots', (await rowOf('RCT-0002', 'tr')).includes('A-2026-01 · A-2026-02'))

  // Disputes.
  await open('/disputes', 'en', 'RCT-0009')
  check('disputes: before confirmation "After confirmation"', (await rowOf('RCT-0008', 'tr')).includes('After confirmation'))
  check('disputes: after confirmation, both lots', (await rowOf('RCT-0009', 'tr')).includes('A-2026-01 · A-2026-02'))
  await screenshot('c-disputes-desktop.png')

  // Ledger.
  await open('/ledger', 'en', 'RCT-0002')
  check('ledger: delivery in two lots shows both codes, no single link', (await rowOf('RCT-0002', 'tr')).includes('A-2026-01 · A-2026-02') && !(await evaluate(`[...document.querySelectorAll('tr')].find((r) => r.innerText.includes('RCT-0002')).querySelector('a[href="/lots/11"]')`)))
  check('ledger: a single lot stays a link', await evaluate(`[...document.querySelectorAll('tr')].some((r) => r.innerText.includes('Wet') || r.innerText.includes('Loss') ? !!r.querySelector('a[href="/lots/11"]') : false)`))
  check('ledger: waiting delivery has no lot', /RCT-0004[^]*–/.test(await rowOf('RCT-0004', 'tr')))
  await screenshot('c-ledger-desktop.png')

  // Kinyarwanda, phone.
  await phone()
  await fillSale('rw')
  text = await body()
  check('rw preview: "Ikirundo A-2025-07", no skip button', JSON.stringify(await lotHeadings()) === '["A-2025-07"]' && !text.includes('Simbuka ikirundo'))
  check('rw preview text: oldest lots first', text.includes('Igurisha rihera buri gihe ku birundo bya kera.'))
  check('rw: "Umuguzi yishyuye ate?" with the three methods inside the screen', text.includes('Umuguzi yishyuye ate?') && (await evaluate(`[...document.querySelectorAll('[role=radio]')].every((b) => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth })`)))
  check('rw: the reference hint in Kinyarwanda', text.includes("Nimero y'igikorwa yo kuri MoMo cyangwa muri banki, urugero MP241113.1045.A12345"))
  await clickButton('Mobile money')
  await type('#sale-payment-reference', 'MP')
  await clickButton('Bika igurisha')
  await sleep(300)
  check('rw: the 6-40 error in Kinyarwanda, inside the screen', (await body()).includes('Koresha inyuguti 6 kugeza kuri 40') && (await noSideScroll()))
  check('rw phone: sales page no sideways scroll', await noSideScroll())
  await screenshot('c-preview-rw-phone.png')
  for (const [path, ready, name] of [['/members/2/batches', 'RCT-0002', 'batches'], ['/members/2', 'SAL-7K2Q', 'statement'], ['/disputes', 'RCT-0009', 'disputes'], ['/ledger', 'RCT-0002', 'ledger']]) {
    await open(path, 'rw', ready)
    check(`rw phone: ${name} no sideways scroll`, await noSideScroll())
    if (name === 'disputes') check('rw disputes: "Nyuma yo kwemezwa"', (await body()).includes('Nyuma yo kwemezwa'))
    if (name === 'batches') check('rw phone batches: both lots in the card', (await rowOf('RCT-0002', 'li')).includes('A-2026-01 · A-2026-02'))
    await screenshot(`c-${name}-rw-phone.png`)
  }
  check('no request ever sent a skip parameter or field', (await log()).every((c) => !/skip/i.test(c.query ?? '') && !/skip/i.test(JSON.stringify(c.body ?? {}))))
  check('no page errors', errs.length === 0, errs.join(' || '))
