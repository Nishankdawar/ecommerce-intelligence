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

// Parse XLSX file — returns rows as array of objects (uses first sheet by default)
export function parseXLSX(filename, sheetIndex = 0) {
  const buffer = fs.readFileSync(rawPath(filename))
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const sheetName = workbook.SheetNames[sheetIndex]
  const sheet = workbook.Sheets[sheetName]
  return XLSX.utils.sheet_to_json(sheet, { defval: '' })
}
