// Runs the browser tests against the mock API.
//
//   node tests/run.mjs            every suite
//   node tests/run.mjs lots sales the suites whose file is lots.mjs or starts with "lots-", and sales.mjs
//
// Steps: build the app with VITE_API_URL pointing at the mock (port 4199), serve the build with
// vite preview (port 4181), then for each suite start a fresh mock, run the suite in headless Chrome
// and stop the mock. Builds, joined scripts and screenshots go to tests/output (not committed).
import { spawn } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const TESTS = dirname(fileURLToPath(import.meta.url))
const ROOT = dirname(TESTS)
const OUT = join(TESTS, 'output')
const DIST = join(OUT, 'dist')
const E2E = join(TESTS, 'e2e')
const HARNESS = join(E2E, 'harness')
const VITE = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')
const APP = 'http://localhost:4181'
const API = 'http://localhost:4199'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const all = readdirSync(E2E).filter((file) => file.endsWith('.mjs')).map((file) => file.slice(0, -4)).sort()
const wanted = process.argv.slice(2)
const suites = wanted.length ? all.filter((name) => wanted.some((w) => name === w || name.startsWith(`${w}-`))) : all
if (!suites.length) {
  console.error(`No suite matches ${wanted.join(', ')}. Suites: ${all.join(', ')}`)
  process.exit(1)
}

function run(args, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd: ROOT, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    child.stdout.on('data', (data) => (output += data))
    child.stderr.on('data', (data) => (output += data))
    child.on('close', (code) => resolve({ code, output }))
  })
}

function start(args) {
  const child = spawn(process.execPath, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] })
  let output = ''
  child.stdout.on('data', (data) => (output += data))
  child.stderr.on('data', (data) => (output += data))
  child.output = () => output
  return child
}

async function waitUntilUp(url, child, label) {
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) throw new Error(`${label} stopped:\n${child.output()}`)
    try {
      await fetch(url)
      return
    } catch {
      await sleep(250)
    }
  }
  throw new Error(`${label} did not start:\n${child.output()}`)
}

mkdirSync(OUT, { recursive: true })

console.log('Building the app against the mock API...')
// A variable already set in the environment wins over the .env file, so the build calls the mock.
const build = await run([VITE, 'build', '--outDir', DIST, '--emptyOutDir'], { VITE_API_URL: API })
if (build.code !== 0) {
  console.error(build.output)
  process.exit(1)
}
// Sets a placeholder login token and the language, then opens the page given in ?to=.
writeFileSync(
  join(DIST, 'set-token.html'),
  '<script>localStorage.setItem("token","placeholder");localStorage.setItem("language",new URLSearchParams(location.search).get("lang")||"en");location.replace(new URLSearchParams(location.search).get("to"))</script>',
)

const preview = start([VITE, 'preview', '--outDir', DIST, '--port', '4181', '--strictPort'])
const totals = []
try {
  await waitUntilUp(APP, preview, 'vite preview')
  const head = ['head.mjs', 'helpers.mjs'].map((file) => readFileSync(join(HARNESS, file), 'utf8')).join('\n')
  const tail = readFileSync(join(HARNESS, 'tail.mjs'), 'utf8')

  for (const suite of suites) {
    console.log(`\n== ${suite}`)
    const mock = start([join(TESTS, 'mock', 'api.mjs')])
    try {
      await waitUntilUp(`${API}/__log`, mock, 'mock API')
      const script = join(OUT, `${suite}.run.mjs`)
      writeFileSync(script, `${head}\n${readFileSync(join(E2E, `${suite}.mjs`), 'utf8')}\n${tail}`)
      const { output } = await run([script, OUT])
      for (const line of output.split('\n')) if (/^(FAIL|NOTE)/.test(line)) console.log(line)
      const summary = output.match(/(\d+)\/(\d+) checks passed/)
      const passed = summary ? Number(summary[1]) : 0
      const total = summary ? Number(summary[2]) : 0
      if (!summary) console.log(output)
      console.log(`${passed}/${total} checks passed`)
      totals.push({ suite, passed, total })
    } finally {
      mock.kill()
      await new Promise((resolve) => (mock.exitCode !== null ? resolve() : mock.once('exit', resolve)))
    }
  }
} finally {
  preview.kill()
}

console.log('\nSuite                 Passed')
for (const { suite, passed, total } of totals) console.log(`${suite.padEnd(22)}${passed}/${total}`)
const passed = totals.reduce((sum, t) => sum + t.passed, 0)
const total = totals.reduce((sum, t) => sum + t.total, 0)
console.log(`${'All'.padEnd(22)}${passed}/${total}`)
process.exit(totals.every((t) => t.total > 0 && t.passed === t.total) ? 0 : 1)
