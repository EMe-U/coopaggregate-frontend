// The status filter buttons stay inside the screen at phone widths, on every page that uses them.
const fits = () => evaluate(`(() => {
  const box = document.querySelector('input[type=search]').closest('.rounded-xl').getBoundingClientRect()
  const buttons = [...document.querySelectorAll('button[aria-pressed]')]
  return buttons.length >= 2 && buttons.every((b) => { const r = b.getBoundingClientRect(); return r.left >= box.left - 0.5 && r.right <= box.right + 0.5 && r.right <= window.innerWidth })
})()`)
try {
  await cdp('Runtime.enable')
  await cdp('Page.enable')
  for (const width of [320, 375, 390]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true })
    for (const lang of ['en', 'rw']) {
      for (const path of ['/buyer-requests', '/members', '/disputes']) {
        await open(path, lang, null)
        await waitFor(`!!document.querySelector('button[aria-pressed]')`, path)
        await sleep(300)
        check(`${width}px ${lang} ${path}: every status button inside the card and the screen, no sideways scroll`, (await fits()) && (await noSideScroll()))
        if (width === 375 && path === '/buyer-requests') await screenshot(`filters-${lang}-375.png`)
      }
    }
  }
  await desktop()
  for (const path of ['/buyer-requests', '/members', '/disputes']) {
    await open(path, 'en', null)
    await waitFor(`!!document.querySelector('button[aria-pressed]')`, path)
    await sleep(300)
    check(`desktop ${path}: buttons on one line next to the search`, await evaluate(`(() => { const tops = [...document.querySelectorAll('button[aria-pressed]')].map((b) => Math.round(b.getBoundingClientRect().top)); return new Set(tops).size === 1 && Math.abs(tops[0] - document.querySelector('input[type=search]').getBoundingClientRect().top) < 12 })()`))
  }
  await screenshot('filters-desktop.png')
  // Clicking still filters.
  await open('/buyer-requests', 'en', null)
  await waitFor(`!!document.querySelector('button[aria-pressed]')`, 'br')
  await clickButton('Rejected')
  await sleep(500)
  check('Rejected pressed and asked for', (await evaluate(`[...document.querySelectorAll('button[aria-pressed=true]')].map((b) => b.innerText.trim()).join()`)) === 'Rejected' && (await log()).some((c) => c.path === '/api/buyer-requests' && /status=REJECTED/i.test(c.query)))
  check('no page errors', errs.length === 0, errs.join(' || '))
