} catch (error) {
  check('test run', false, error.message)
  await screenshot('error.png').catch(() => {})
} finally {
  ws.close()
  chrome.kill()
  const failed = results.filter((r) => !r.ok).length
  console.log(`\n${results.length - failed}/${results.length} checks passed`)
  process.exit(failed ? 1 : 0)
}
