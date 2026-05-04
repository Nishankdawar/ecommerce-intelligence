import { parseAllSettlement, parseNum, parseAllMTRB2C } from '../parsers.js'
import { getCached, setCached } from '../cache.js'
import fs from 'fs'
import path from 'path'

const PROCESSED_DIR = path.join(process.cwd(), 'data', 'processed')


export async function runRefundsEngine(month = null) {
  const _cacheKey = `refunds_${month || 'latest'}`
  const _cached = getCached(_cacheKey)
  if (_cached) return _cached

  // Check pre-computed result JSON on disk
  // Resolve 'latest' by scanning available files rather than relying on a latest.json
  const _resolveMonth = (m) => {
    if (m) return m
    if (!fs.existsSync(PROCESSED_DIR)) return null
    const files = fs.readdirSync(PROCESSED_DIR)
      .filter(f => f.match(/^refunds_result_\d{4}-\d{2}\.json$/))
      .sort()
    return files.length > 0 ? files[files.length-1].replace('refunds_result_', '').replace('.json', '') : null
  }
  const _resolvedMonth = _resolveMonth(month)
  const _rPath = _resolvedMonth ? path.join(PROCESSED_DIR, `refunds_result_${_resolvedMonth}.json`) : null
  if (_rPath && fs.existsSync(_rPath)) {
    const _diskResult = JSON.parse(fs.readFileSync(_rPath, 'utf-8'))
    setCached(_cacheKey, _diskResult)
    return _diskResult
  }

  const { rows: allMtrRows } = parseAllMTRB2C()
  const { rows: allS, availableMonths: settlementMonths, monthRows } = parseAllSettlement()
  const selectedMonth = month && settlementMonths.includes(month) ? month : settlementMonths[settlementMonths.length - 1]
  const settlement = selectedMonth ? (monthRows[selectedMonth] || []) : allS
  const coverage = { available_months: settlementMonths, selected_month: selectedMonth, is_partial: settlement.length < 500 }

  // Filter MTR rows to selected month so each month shows its own refund data
  const mtrB2C = selectedMonth
    ? allMtrRows.filter(r => (r['Invoice Date'] || r['Order Date'] || '').slice(0, 7) === selectedMonth)
    : allMtrRows

  // From MTR: refund rows per SKU
  const mtrRefundMap = {}
  const mtrShipmentMap = {}

  for (const row of mtrB2C) {
    const sku = (row['Sku'] || '').trim()
    const type = row['Transaction Type'] || ''
    if (!sku) continue

    if (type === 'Shipment') {
      if (!mtrShipmentMap[sku]) mtrShipmentMap[sku] = { units: 0, revenue: 0, title: row['Item Description'] || '' }
      mtrShipmentMap[sku].units += parseNum(row['Quantity'])
      mtrShipmentMap[sku].revenue += parseNum(row['Principal Amount'])
    }

    if (type === 'Refund') {
      if (!mtrRefundMap[sku]) mtrRefundMap[sku] = {
        sku, title: row['Item Description'] || '', asin: row['Asin'] || '',
        refund_count: 0, refund_units: 0, refund_amount: 0,
      }
      mtrRefundMap[sku].refund_count++
      mtrRefundMap[sku].refund_units += parseNum(row['Quantity'])
      mtrRefundMap[sku].refund_amount += Math.abs(parseNum(row['Invoice Amount']))
    }
  }

  // From settlement: refund commission paid per SKU (you pay commission even on refunds)
  const settlementRefundCommission = {}
  const settlementRefundAmt = {}
  for (const row of settlement) {
    const sku = (row['sku'] || '').trim()
    const desc = (row['amount-description'] || '').trim()
    const txType = (row['transaction-type'] || '').trim()
    const amt = parseNum(row['amount'])
    if (!sku) continue

    if (txType === 'Refund') {
      if (!settlementRefundAmt[sku]) settlementRefundAmt[sku] = 0
      if (desc === 'Principal') settlementRefundAmt[sku] += Math.abs(amt)
    }
    if (desc === 'Refund commission') {
      if (!settlementRefundCommission[sku]) settlementRefundCommission[sku] = 0
      settlementRefundCommission[sku] += Math.abs(amt)
    }
  }

  // Combine
  const allSkus = new Set([...Object.keys(mtrRefundMap), ...Object.keys(settlementRefundAmt)])
  const skus = []

  let totalRefundAmt = 0, totalRefundCommission = 0, totalRefundUnits = 0

  for (const sku of allSkus) {
    const mtr = mtrRefundMap[sku] || { refund_count: 0, refund_units: 0, refund_amount: 0, title: '', asin: '' }
    const refund_commission = settlementRefundCommission[sku] || 0
    const true_cost = mtr.refund_amount + refund_commission
    const shipment = mtrShipmentMap[sku] || { units: 0, revenue: 0 }
    const return_rate = shipment.units > 0 ? parseFloat(((mtr.refund_units / shipment.units) * 100).toFixed(1)) : 0
    const revenue_impact_pct = shipment.revenue > 0 ? parseFloat(((true_cost / shipment.revenue) * 100).toFixed(1)) : 0

    totalRefundAmt += mtr.refund_amount
    totalRefundCommission += refund_commission
    totalRefundUnits += mtr.refund_units

    skus.push({
      sku, title: mtr.title || mtrShipmentMap[sku]?.title || '', asin: mtr.asin,
      refund_count: mtr.refund_count,
      refund_units: mtr.refund_units,
      refund_amount: parseFloat(mtr.refund_amount.toFixed(2)),
      refund_commission: parseFloat(refund_commission.toFixed(2)),
      true_cost: parseFloat(true_cost.toFixed(2)),
      return_rate,
      revenue_impact_pct,
      shipped_units: shipment.units,
      shipped_revenue: parseFloat(shipment.revenue.toFixed(2)),
    })
  }

  skus.sort((a, b) => b.true_cost - a.true_cost)


  const _result = {
    coverage,
    summary: {
      total_refund_orders: skus.reduce((s, r) => s + r.refund_count, 0),
      total_refund_units: totalRefundUnits,
      total_refund_amount: parseFloat(totalRefundAmt.toFixed(2)),
      total_refund_commission: parseFloat(totalRefundCommission.toFixed(2)),
      total_true_cost: parseFloat((totalRefundAmt + totalRefundCommission).toFixed(2)),
      skus_with_refunds: skus.length,
    },
    skus,
  }
  // Write result to disk for GitHub deployment (no TXT files needed on server)
  if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true })
  const _outPath = path.join(PROCESSED_DIR, `refunds_result_${month || 'latest'}.json`)
  fs.writeFileSync(_outPath, JSON.stringify(_result))
  setCached(_cacheKey, _result)
  return _result
}
