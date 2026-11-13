// Shared start of the headless Chrome tests: launch Chrome, CDP helpers, check().
// tests/run.mjs joins this file, helpers.mjs, one suite and tail.mjs into one script and runs it.
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Screenshots are saved in this folder (tests/output).
const SCRATCH = process.argv[2]
// CHROME_PATH wins; otherwise the usual install places, then "google-chrome" on the PATH.
const CHROME = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].find((path) => existsSync(path)) || 'google-chrome'
const APP = 'http://localhost:4181'
const API = 'http://localhost:4199'
const PORT = 9337
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`)
}

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`, '--no-first-run',
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'coop-t-'))}`, '--window-size=1280,1100', 'about:blank',
])
for (let i = 0; i < 50; i++) {
  try { await fetch(`http://127.0.0.1:${PORT}/json/version`); break } catch { await sleep(200) }
}
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()
const ws = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl)
await new Promise((resolve) => ws.addEventListener('open', resolve))
let messageId = 0
const waiting = new Map()
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  if (message.id && waiting.has(message.id)) {
    waiting.get(message.id)(message)
    waiting.delete(message.id)
  }
})
function cdp(method, params = {}) {
  const id = ++messageId
  ws.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) =>
    waiting.set(id, (message) => (message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result))))
}
async function evaluate(expression) {
  const result = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? 'evaluate failed')
  return result.result.value
}
async function waitFor(expression, label, timeout = 10000) {
  const end = Date.now() + timeout
  while (Date.now() < end) {
    try { if (await evaluate(`!!(${expression})`)) return true } catch {}
    await sleep(200)
  }
  throw new Error('timed out waiting for ' + label)
}
const soft = (promise) => promise.then(() => true, () => false)
const has = (text) => `document.body.innerText.includes(${JSON.stringify(text)})`
async function screenshot(name) {
  const { data } = await cdp('Page.captureScreenshot', { format: 'png' })
  writeFileSync(join(SCRATCH, name), Buffer.from(data, 'base64'))
}
const setOffline = (offline) =>
  cdp('Network.emulateNetworkConditions', { offline, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
const go = (path) => evaluate(`(() => { history.pushState({}, '', '${path}'); dispatchEvent(new PopStateEvent('popstate')) })()`)
const log = async () => (await fetch(`${API}/__log`)).json()

