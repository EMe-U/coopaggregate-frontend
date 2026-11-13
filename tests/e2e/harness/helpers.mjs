const errs = []
ws.addEventListener('message', (event) => {
  const m = JSON.parse(event.data)
  if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.exception?.description?.slice(0, 300))
})
const body = () => evaluate('document.body.innerText')
const desktop = () => cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
const phone = () => cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
const noSideScroll = () => evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth')
let started = false
// Opens a page in a language. The first visit sets the token through set-token.html.
async function open(path, lang, ready) {
  if (!started) {
    started = true
    await cdp('Page.navigate', { url: `${APP}/set-token.html?lang=${lang}&to=${encodeURIComponent(path)}` })
    await waitFor('location.pathname !== "/set-token.html"', 'token', 15000)
  } else {
    await evaluate(`localStorage.setItem('language', '${lang}')`)
    await cdp('Page.navigate', { url: `${APP}${path}` })
  }
  await waitFor(`document.readyState === 'complete'`, 'load', 15000)
  if (ready) await waitFor(has(ready), `${path} ${ready}`, 15000).catch((e) => { console.log('FAIL  page errors: ' + errs.join(' || ') + ' | text: ' + (globalThis.lastText ?? '')); throw e })
  await sleep(300)
}
const visible = (selector) => `[...document.querySelectorAll(${JSON.stringify(selector)})].filter((e) => e.offsetParent)`
const rowOf = (text, selector = 'tr, li') => evaluate(`${visible(selector)}.filter((e) => e.innerText.includes(${JSON.stringify(text)})).map((e) => e.innerText).join(' || ')`)
const clickButton = (text) => evaluate(`(() => { const b = ${visible('button, a')}.find((e) => e.innerText.trim() === ${JSON.stringify(text)} || e.getAttribute('aria-label') === ${JSON.stringify(text)}); if (!b) return false; b.click(); return true })()`)
const menuItems = () => evaluate(`[...document.querySelectorAll('[role=menuitem]')].map((e) => e.innerText.trim())`)
const calls = async (pattern) => (await log()).filter((c) => pattern.test(`${c.method} ${c.path}`))
// Lots & Stock filters (plain-text menus): n is 0 for Status, 1 for Grade.
const filterButton = (n) => `[...document.querySelectorAll('button[aria-haspopup=menu]')].filter((b) => b.offsetParent && /^(Status|Grade|Uko gihagaze|Urwego)(:|$)/.test(b.getAttribute('aria-label')))[${n}]`
const openFilter = async (n) => {
  await evaluate(`${filterButton(n)}.click()`)
  await waitFor(`document.querySelectorAll('[role=menuitemradio]').length > 0`, 'filter menu')
}
// Chooses the item at index i of filter n (Status: 0 Active, 1 Sold, 2 Emptied, 3 All; Grade: 0 All, then the grades).
const pickFilter = async (n, i) => {
  await openFilter(n)
  await evaluate(`document.querySelectorAll('[role=menuitemradio]')[${i}].click()`)
  await sleep(600)
}
