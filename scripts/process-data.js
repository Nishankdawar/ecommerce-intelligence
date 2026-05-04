/**
 * process-data.js
 *
 * Run this script locally to pre-compute all financial engine outputs.
 * Reads the 247 payment TXT files and generates compact result JSONs.
 * Commit the generated JSONs to GitHub — no TXT files needed on the server.
 *
 * Usage:
 *   node scripts/process-data.js
 *
 * Output: data/processed/{engine}_result_{month}.json
 */

const BASE_URL = 'http://localhost:3000'
const MONTHS = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05']
const ENGINES = ['settlement', 'profitability', 'fee-breakdown', 'refunds', 'warehouse-optimization']

async function processAll() {
  console.log('Processing all financial engines for all months...')
  console.log('Make sure the dev server is running on port 3000\n')

  // First bust the cache so everything re-computes fresh
  await fetch(`${BASE_URL}/api/cache-bust`, { method: 'POST' })
  console.log('Cache cleared\n')

  let total = 0
  let errors = 0

  for (const engine of ENGINES) {
    for (const month of MONTHS) {
      process.stdout.write(`  ${engine} / ${month} ... `)
      try {
        const res = await fetch(`${BASE_URL}/api/engines/${engine}?month=${month}`)
        if (res.ok) {
          const data = await res.json()
          if (data._unavailable) {
            console.log('SKIPPED (data not available)')
          } else {
            console.log('✓')
            total++
          }
        } else {
          console.log(`FAILED (${res.status})`)
          errors++
        }
      } catch (err) {
        console.log(`ERROR: ${err.message}`)
        errors++
      }
    }
    console.log('')
  }

  console.log(`\nDone. ${total} result JSONs written to data/processed/`)
  if (errors > 0) console.log(`⚠ ${errors} errors — check the output above`)

  // Clean up large raw row intermediate files (settlement_YYYY-MM.json)
  const { readdirSync, statSync, unlinkSync } = await import('fs')
  const { join } = await import('path')
  const rawRowFiles = readdirSync('data/processed').filter(f => /^settlement_\d{4}-\d{2}\.json$/.test(f))
  rawRowFiles.forEach(f => { unlinkSync(join('data/processed', f)); })
  if (rawRowFiles.length > 0) console.log(`\nCleaned up ${rawRowFiles.length} large intermediate files`)

  // Show result files only (exclude raw row cache)
  const files = readdirSync('data/processed').filter(f => f.endsWith('.json') && f.includes('_result_'))
  let totalSize = 0
  console.log('\nGenerated result files (commit these to GitHub):')
  files.sort().forEach(f => {
    const size = statSync(join('data/processed', f)).size
    totalSize += size
    console.log(`  ${f.padEnd(45)} ${(size/1024).toFixed(0)}KB`)
  })
  console.log(`\nTotal to commit: ${(totalSize/1024/1024).toFixed(1)}MB across ${files.length} files`)
}

processAll().catch(console.error)
