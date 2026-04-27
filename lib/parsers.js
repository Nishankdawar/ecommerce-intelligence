import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'

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
