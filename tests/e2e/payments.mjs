// Payments page = money in from buyers (GET /api/buyer-payments): one row per order, the split per
// farmer, the buyer filter, and the sidebar with Payments and Disburse side by side.
const digits = (text) => Number(String(text).replace(/[^0-9]/g, ''))
const dialogText = () => evaluate(`document.querySelector('[role=dialog]')?.innerText ?? ''`)
const rows = () => evaluate(`[...document.querySelectorAll('[data-testid=buyer-payments] tbody tr')].map((r) => [...r.querySelectorAll('td')].map((td) => td.innerText.trim()))`)
const bpQueries = async () => (await log()).filter((c) => c.method === 'GET' && c.path === '/api/buyer-payments').map((c) => new URLSearchParams(c.query ?? ''))
const testText = (id) => evaluate(`document.querySelector('[data-testid=${id}]')?.innerText.trim() ?? null`)
const buyerFilter = `[...document.querySelectorAll('button[aria-haspopup=menu]')].find((b) => /^(Buyer|Umuguzi)(:|$)/.test(b.getAttribute('aria-label')))`
const pickBuyer = async (label) => {
  await evaluate(`${buyerFilter}.click()`)
  await waitFor(`document.querySelectorAll('[role=menuitemradio]').length > 0`, 'buyer menu')
  await evaluate(`[...document.querySelectorAll('[role=menuitemradio]')].find((o) => o.innerText.trim() === ${JSON.stringify(label)}).click()`)
  await sleep(600)
}
const withoutLotShare = (text) => text.replaceAll('Paid through lot share', '')

try {
  await cdp('Runtime.enable')
  await cdp('Page.enable')
  await desktop()

  // Sidebar: Payments and Disburse next to each other.
  await open('/payments', 'en', 'ORD-0003')
  const nav = await evaluate(`[...document.querySelectorAll('aside a, nav a')].filter((a) => a.offsetParent).map((a) => a.getAttribute('href'))`)
  const at = nav.indexOf('/payments')
  check('sidebar: Payments then Disburse, side by side', at >= 0 && nav[at + 1] === '/disburse', JSON.stringify(nav))
  check('sidebar labels: "Payments" and "Disburse"', await evaluate(`[...document.querySelectorAll('a[href="/payments"], a[href="/disburse"]')].filter((a) => a.offsetParent).map((a) => a.innerText.trim()).join('|') === 'Payments|Disburse'`))

  // No summary card, no Record payment panel.
  let text = await body()
  check('title "Payments from buyers", money in', text.includes('Payments from buyers') && text.includes('MONEY IN'))
  check('no "Amounts owed summary" and no Record payment panel', !text.includes('Amounts owed summary') && !text.includes('Record payment') && !(await evaluate(`!!document.querySelector('#payment-member, #payment-amount')`)))
  check('no "share/shared" wording', !/shar/i.test(withoutLotShare(text)), (text.match(/.{0,30}shar.{0,30}/i) ?? [''])[0])

  // One row per order, newest first, paged.
  const headers = await evaluate(`[...document.querySelectorAll('[data-testid=buyer-payments] thead th')].map((th) => th.innerText.trim())`)
  check('columns: date, order, buyer, grades, total kg, amount, method, reference', headers.slice(0, 8).join('|').toLowerCase() === 'date|order|buyer|grades|total kg|amount|method|reference', headers.join('|'))
  let list = await rows()
  check('newest first: ORD-0003, ORD-0002, ORD-0001', list.slice(0, 3).map((r) => r[1]).join(',') === 'ORD-0003,ORD-0002,ORD-0001', list.map((r) => r[1]).join(','))
  const first = list[0]
  check('row: buyer, both grades, 120 kg, 35,000, Mobile money, reference', first[2] === 'Musanze Market Ltd' && first[3] === 'Grade A · Grade B' && first[4] === '120 kg' && digits(first[5]) === 35000 && first[6] === 'Mobile money' && first[7] === 'MP777001', JSON.stringify(first))
  check('a cash order without reference', list[1][6] === 'Cash' && list[1][7] === '')
  check('method null: "Not recorded"', list[2][6] === 'Not recorded', JSON.stringify(list[2]))
  const q0 = (await bpQueries()).at(-1)
  check('asks page 0 with a page size, no buyerId', q0.get('page') === '0' && Number(q0.get('size')) > 0 && !q0.get('buyerId'), q0.toString())
  check('paged: 23 payments over more than one page', (await body()).includes('23') && (await evaluate(`[...document.querySelectorAll('button')].some((b) => /next|›|»/i.test(b.innerText + (b.getAttribute('aria-label') ?? '')))`)))
  check('every row has a ⋮ "Actions for <order>"', await evaluate(`[...document.querySelectorAll('[data-testid=buyer-payments] tbody tr')].every((r) => r.querySelector('button[aria-label^="Actions for ORD-"]'))`))

  // The split: clicking the row.
  await evaluate(`[...document.querySelectorAll('[data-testid=buyer-payments] tbody tr')][0].querySelector('td').click()`)
  await waitFor(`!!document.querySelector('[data-testid=split-farmers]')`, 'split')
  await waitFor(`document.querySelector('[data-testid=split-sales]').innerText.includes('B-2026-01')`, 'lots', 5000).catch(() => {})
  text = await dialogText()
  check('split title "Split of ORD-0003", buyer, method and reference', text.includes('Split of ORD-0003') && text.includes('Musanze Market Ltd') && text.includes('Mobile money') && text.includes('MP777001'))
  const sales = await testText('split-sales')
  check('split: each grade with its lots (from GET /api/sales/{id})', sales.includes('SAL-0031') && sales.includes('A-2026-01, A-2026-02') && sales.includes('SAL-0032') && sales.includes('B-2026-01') && (await calls(/GET \/api\/sales\/3[12]$/)).length === 2, sales)
  const farmerHeaders = await evaluate(`[...document.querySelectorAll('[data-testid=split-farmers] thead th')].map((th) => th.innerText.trim())`)
  check('split columns: farmer, kg, gross, deduction, net', farmerHeaders.join('|').toLowerCase() === 'farmer|kg|gross|deduction|net', farmerHeaders.join('|'))
  const farmers = await evaluate(`[...document.querySelectorAll('[data-testid=split-farmers] tbody tr')].map((r) => [...r.querySelectorAll('td')].map((td) => td.innerText.trim()))`)
  check('one line per farmer with name and member number', farmers.length === 2 && farmers[0][0].includes('Habimana Jean') && farmers[0][0].includes('M-0002') && farmers[1][0].includes('Mukamana Alice'), JSON.stringify(farmers))
  check('Alice: 70 kg, 21,000 − 350 = 20,650', farmers[1][1] === '70 kg' && digits(farmers[1][2]) === 21000 && digits(farmers[1][3]) === 350 && digits(farmers[1][4]) === 20650, JSON.stringify(farmers[1]))
  const sum = (i) => farmers.reduce((a, f) => a + digits(f[i]), 0)
  check('lines add up to the totals, and the totals match the row', sum(1) === digits(await testText('split-total-kg')) && digits(await testText('split-total-kg')) === 120 &&
    sum(2) === digits(await testText('split-total-gross')) && digits(await testText('split-total-gross')) === digits(first[5]) &&
    sum(3) === digits(await testText('split-total-deduction')) && sum(4) === digits(await testText('split-total-net')) && digits(await testText('split-total-net')) === 34400)
  await screenshot('money-in-split-desktop.png')
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await sleep(200)
  check('Escape closes the split', !(await evaluate(`!!document.querySelector('[role=dialog]')`)))

  // The split from ⋮ > View split, for an older lot-share sale.
  await clickButton('Actions for ORD-0001')
  await sleep(200)
  check('⋮ menu: View split', (await evaluate(`[...document.querySelectorAll('[role=menuitem]')].map((e) => e.innerText.trim()).join('|')`)) === 'View split')
  await evaluate(`[...document.querySelectorAll('[role=menuitem]')][0].click()`)
  await waitFor(`!!document.querySelector('[data-testid=split-farmers]')`, 'old split')
  const old = await evaluate(`[...document.querySelectorAll('[data-testid=split-farmers] tbody tr')].map((r) => r.innerText)`)
  check('older sale: each farmer "Paid through lot share", with kg', old.length === 2 && old.every((r) => r.includes('Paid through lot share')) && old[0].includes('27.5 kg'), JSON.stringify(old))
  check('older sale: totals 52.5 kg and 15,750; no deduction or net', (await testText('split-total-kg')) === '52.5 kg' && digits(await testText('split-total-gross')) === 15750 && (await testText('split-total-net')) === '—')
  check('older sale: method "Not recorded", lot A-2025-07', (await dialogText()).includes('Not recorded') && (await testText('split-sales')).includes('A-2025-07'))
  await evaluate(`document.querySelector('[role=dialog] button[aria-label]').click()`)
  await sleep(200)

  // Buyer filter: plain-text menu.
  check('buyer filter reads "Buyer" (plain text, no select)', (await evaluate(`${buyerFilter}.innerText.trim()`)) === 'Buyer' && (await evaluate(`document.querySelectorAll('select').length`)) === 0)
  await pickBuyer('Kigali Fresh Co')
  check('Buyer: Kigali Fresh Co asks buyerId=2, page 0', (await bpQueries()).at(-1).get('buyerId') === '2' && (await bpQueries()).at(-1).get('page') === '0')
  list = await rows()
  check('trigger "Buyer: Kigali Fresh Co", only that buyer listed', (await evaluate(`${buyerFilter}.innerText.trim()`)) === 'Buyer: Kigali Fresh Co' && list.length > 0 && list.every((r) => r[2] === 'Kigali Fresh Co'))
  await pickBuyer('All buyers')
  check('back to all buyers: no buyerId', !(await bpQueries()).at(-1).get('buyerId'))

  // Kinyarwanda, phone.
  await phone()
  await open('/payments', 'rw', 'ORD-0003')
  text = await body()
  check('rw: title and "Ntibyanditswe"', text.includes("Ubwishyu bw'abaguzi") && text.includes('Ntibyanditswe'))
  check('rw phone: cards, no sideways scroll', (await evaluate(`!!document.querySelector('[data-testid=buyer-payments-cards]')?.offsetParent`)) && (await noSideScroll()))
  await screenshot('money-in-rw-phone.png')
  await evaluate(`document.querySelector('[data-testid=buyer-payments-cards] li button').click()`)
  await waitFor(`!!document.querySelector('[data-testid=split-farmers-cards]')`, 'rw split')
  check('rw phone split: farmers, total, no sideways scroll', (await dialogText()).toLowerCase().includes('abahinzi') && (await dialogText()).includes('Igiteranyo') && (await noSideScroll()))
  await screenshot('money-in-split-rw-phone.png')
  await desktop()

  check('no page errors', errs.length === 0, errs.join(' || '))
