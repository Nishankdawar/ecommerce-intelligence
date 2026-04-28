import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

function rawPath(filename) {
  return path.join(process.cwd(), 'data', 'raw', filename)
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

// Parse XLSX file — returns rows as array of objects (uses first sheet by default)
export function parseXLSX(filename, sheetIndex = 0) {
  const buffer = fs.readFileSync(rawPath(filename))
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const sheetName = workbook.SheetNames[sheetIndex]
  const sheet = workbook.Sheets[sheetName]
  return XLSX.utils.sheet_to_json(sheet, { defval: '' })
}
