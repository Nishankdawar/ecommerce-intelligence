import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

// Maps canonical engine filenames → actual filenames in new_data folder
const FILE_MAP = {
  'BusinessReport-monthly.csv':  'BusinessReport-JAN TO APR.csv',
  'InventoryLedger.csv':         'inv_ledger.csv',
  'AllListings.txt':             'All+Listings+Report_04-24-2026.txt',
}

function rawPath(filename) {
  const actual = FILE_MAP[filename] || filename
  return path.join(process.cwd(), 'data', 'new_data', actual)
}

export function fileExists(filename) {
  // Special case: settlement data — check raw TXT folder (local) OR pre-computed JSONs (production)
  if (filename === 'settlement-march-2026.xlsx') {
    const paymentsDir = path.join(process.cwd(), 'data', 'new_data', 'amazon_payments')
    if (fs.existsSync(paymentsDir) && fs.readdirSync(paymentsDir).some(f => f.endsWith('.txt'))) {
      return true
    }
    // On production: raw TXT files are gitignored but result JSONs are committed
    const processedDir = path.join(process.cwd(), 'data', 'processed')
    return fs.existsSync(processedDir) &&
      fs.readdirSync(processedDir).some(f => f.startsWith('settlement_result_') && f.endsWith('.json'))
  }
  const actual = FILE_MAP[filename] || filename
  return fs.existsSync(path.join(process.cwd(), 'data', 'new_data', actual))
}

export function parseCSV(filename, options = {}) {
  const content = fs.readFileSync(rawPath(filename), 'utf-8')
  const result = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    ...options,
  })
  return result.data
}

export function parseTSV(filename) {
  return parseCSV(filename, { delimiter: '\t' })
}

// Parse number fields that may have commas, ₹, %, spaces
export function parseNum(val) {
  if (val === null || val === undefined || val === '') return 0
  const cleaned = String(val).replace(/[₹,%\s]/g, '').replace(/,/g, '').trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

// Parse percentage string → float (e.g. "19.04%" → 19.04)
export function parsePct(val) {
  return parseNum(val)
}

// Read all MTR B2C files (MTR-B2C-*.csv or MTR_B2C-*.csv) from new_data first, then raw
// Returns { rows, availableMonths, fileCount }
export function parseAllMTRB2C() {
  const searchDir = path.join(process.cwd(), 'data', 'new_data')
  const allFiles = fs.readdirSync(searchDir)
  const mtrFiles = allFiles
    .filter(f => f.match(/^MTR[-_]B2C[-_].*\.csv$/i))
    .sort()

  const rows = []
  const availableMonths = []

  for (const file of mtrFiles) {
    const content = fs.readFileSync(path.join(searchDir, file), 'utf-8')

    const result = Papa.parse(content, { header: true, skipEmptyLines: true })
    rows.push(...result.data)
    // Handle both formats:
    // MTR-B2C-Jan-2026.csv → Jan-2026
    // MTR_B2C-JANUARY-2026-xxx.csv → Jan-2026
    const shortMatch = file.match(/MTR[-_]B2C[-_]([A-Za-z]{3})[a-z]*[-_](\d{4})/i)
    if (shortMatch) availableMonths.push(`${shortMatch[1].charAt(0).toUpperCase() + shortMatch[1].slice(1, 3).toLowerCase()}-${shortMatch[2]}`)
  }

  return { rows, availableMonths, fileCount: mtrFiles.length }
}

const PROCESSED_DIR = path.join(process.cwd(), 'data', 'processed')

function settlementJsonPath(month) {
  return path.join(PROCESSED_DIR, `settlement_${month}.json`)
}

// Build processed JSON from raw TXT files — called once, result cached to disk
function buildSettlementJson() {
  const paymentsDir = path.join(process.cwd(), 'data', 'new_data', 'amazon_payments')
  if (!fs.existsSync(paymentsDir)) return {}

  const files = fs.readdirSync(paymentsDir)
    .filter(f => f.endsWith('.txt') && !f.startsWith('.'))
    .sort()

  const monthRows = {}

  for (const file of files) {
    const content = fs.readFileSync(path.join(paymentsDir, file), 'utf-8')
    const result = Papa.parse(content, { header: true, delimiter: '\t', skipEmptyLines: true })
    if (!result.data.length || !('settlement-id' in result.data[0])) continue

    const firstRow = result.data[0]
    const depositRaw = String(firstRow['deposit-date'] || '')
    const ddmm = depositRaw.match(/^(\d{2})\.(\d{2})\.(\d{4})/)
    const month = ddmm ? `${ddmm[3]}-${ddmm[2]}` : null
    if (!month) continue

    if (!monthRows[month]) monthRows[month] = []
    monthRows[month].push(...result.data)
  }

  // Write one JSON file per month to data/processed/
  if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true })
  for (const [month, rows] of Object.entries(monthRows)) {
    fs.writeFileSync(settlementJsonPath(month), JSON.stringify(rows))
  }

  return monthRows
}

// Read all settlement data — uses pre-processed JSON if available, else builds them
// Returns { rows, availableMonths, monthRows }
export function parseAllSettlement() {
  const paymentsDir = path.join(process.cwd(), 'data', 'new_data', 'amazon_payments')
  if (!fs.existsSync(paymentsDir)) {
    return { rows: [], availableMonths: [], monthRows: {} }
  }

  // Check which months already have raw-row JSON (settlement_YYYY-MM.json only, NOT settlement_result_*.json)
  const existingJsons = fs.existsSync(PROCESSED_DIR)
    ? fs.readdirSync(PROCESSED_DIR).filter(f => /^settlement_\d{4}-\d{2}\.json$/.test(f))
    : []

  let monthRows = {}

  if (existingJsons.length > 0) {
    // Read from pre-processed JSON files (fast)
    for (const file of existingJsons) {
      const month = file.replace('settlement_', '').replace('.json', '')
      const rows = JSON.parse(fs.readFileSync(path.join(PROCESSED_DIR, file), 'utf-8'))
      monthRows[month] = rows
    }
  } else {
    // First time: parse all TXT files and write JSONs (slow, but only once)
    monthRows = buildSettlementJson()
  }

  const availableMonths = Object.keys(monthRows).sort()
  const allRows = availableMonths.flatMap(m => monthRows[m])

  return { rows: allRows, availableMonths, monthRows }
}

// Force re-process settlement files (called after new files are uploaded)
export function reprocessSettlement() {
  // Delete existing processed JSONs
  if (fs.existsSync(PROCESSED_DIR)) {
    fs.readdirSync(PROCESSED_DIR)
      .filter(f => f.startsWith('settlement_') && f.endsWith('.json'))
      .forEach(f => fs.unlinkSync(path.join(PROCESSED_DIR, f)))
  }
  return buildSettlementJson()
}

// Parse XLSX file — returns rows as array of objects (uses first sheet by default)
export function parseXLSX(filename, sheetIndex = 0) {
  const buffer = fs.readFileSync(rawPath(filename))
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const sheetName = workbook.SheetNames[sheetIndex]
  const sheet = workbook.Sheets[sheetName]
  return XLSX.utils.sheet_to_json(sheet, { defval: '' })
}
