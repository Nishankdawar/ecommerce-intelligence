import { parseAllSettlement, parseNum } from '../parsers.js'
import { getCached, setCached } from '../cache.js'
import fs from 'fs'
import path from 'path'

const PROCESSED_DIR = path.join(process.cwd(), 'data', 'processed')


export async function runFeeBreakdownEngine(month = null) {
  const _cacheKey = `feeBreakdown_${month || 'latest'}`
  const _cached = getCached(_cacheKey)
  if (_cached) return _cached

  // Check pre-computed result JSON on disk
  const _rMonth = month || 'latest'
  const _rPath = path.join(PROCESSED_DIR, `feeBreakdown_result_${_rMonth}.json`)
  if (fs.existsSync(_rPath)) {
    const _diskResult = JSON.parse(fs.readFileSync(_rPath, 'utf-8'))
    setCached(_cacheKey, _diskResult)
    return _diskResult
  }

  const { rows: allS, availableMonths: settlementMonths, monthRows } = parseAllSettlement()
  const selectedMonth = month && settlementMonths.includes(month) ? month : settlementMonths[settlementMonths.length - 1]
  const settlement = selectedMonth ? (monthRows[selectedMonth] || []) : allS
  const coverage = { available_months: settlementMonths, selected_month: selectedMonth, is_partial: settlement.length < 500 }

  const catalogFees = {
    commission: 0, fba_fulfillment: 0, closing_fee: 0,
    tech_fee: 0, easy_ship: 0, chargeback: 0, promo: 0,
    tcs: 0, tds: 0,
  }
  let totalRevenue = 0

  const skuMap = {}

  for (const row of settlement) {
    const sku = (row['sku'] || '').trim()
    const desc = (row['amount-description'] || '').trim()
    const amt = parseNum(row['amount'])
    const txType = (row['transaction-type'] || '').trim()
    if (!sku || txType === 'Transfer') continue

    if (!skuMap[sku]) skuMap[sku] = {
      sku, revenue: 0,
      commission: 0, fba_fulfillment: 0, closing_fee: 0,
      tech_fee: 0, easy_ship: 0, chargeback: 0, promo: 0,
      tcs: 0, tds: 0,
    }
    const s = skuMap[sku]

    if (desc === 'Principal' || desc === 'Product Tax' || desc === 'Shipping' || desc === 'Shipping tax') {
      s.revenue += amt; totalRevenue += amt
    } else if (desc === 'Commission' || desc === 'Refund commission' ||
               desc === 'Commission CGST' || desc === 'Commission SGST' || desc === 'Commission IGST' ||
               desc === 'Refund commission IGST') {
      s.commission += amt; catalogFees.commission += amt
    } else if (desc.startsWith('FBA Weight Handling Fee') || desc.startsWith('FBA Pick & Pack Fee') || desc.startsWith('FBAInboundTransportationFee')) {
      s.fba_fulfillment += amt; catalogFees.fba_fulfillment += amt
    } else if (desc.startsWith('Fixed closing fee')) {
      s.closing_fee += amt; catalogFees.closing_fee += amt
    } else if (desc.startsWith('Technology Fee') || desc.startsWith('TechnologyFee')) {
      s.tech_fee += amt; catalogFees.tech_fee += amt
    } else if (desc.includes('Easy Ship')) {
      s.easy_ship += amt; catalogFees.easy_ship += amt
    } else if (desc.includes('Chargeback')) {
      s.chargeback += amt; catalogFees.chargeback += amt
    } else if (desc === 'Promo rebates' || desc === 'Shipping discount') {
      s.promo += amt; catalogFees.promo += amt
    } else if (desc.startsWith('TCS')) {
      s.tcs += amt; catalogFees.tcs += amt
    } else if (desc === 'TDS (Section 194-O)') {
      s.tds += amt; catalogFees.tds += amt
    }
  }

  function pct(fee, rev) {
    return rev > 0 ? parseFloat(((-fee / rev) * 100).toFixed(2)) : 0
  }

  const totalFeesAmt = Object.values(catalogFees).reduce((s, v) => s + v, 0)

  const catalog_summary = {
    total_revenue: parseFloat(totalRevenue.toFixed(2)),
    total_fees: parseFloat((-totalFeesAmt).toFixed(2)),
    fee_pct_of_revenue: pct(totalFeesAmt, totalRevenue),
    by_type: [
      { type: 'Commission', amount: parseFloat((-catalogFees.commission).toFixed(2)), pct: pct(catalogFees.commission, totalRevenue) },
      { type: 'FBA Fulfillment', amount: parseFloat((-catalogFees.fba_fulfillment).toFixed(2)), pct: pct(catalogFees.fba_fulfillment, totalRevenue) },
      { type: 'Closing Fee', amount: parseFloat((-catalogFees.closing_fee).toFixed(2)), pct: pct(catalogFees.closing_fee, totalRevenue) },
      { type: 'Technology Fee', amount: parseFloat((-catalogFees.tech_fee).toFixed(2)), pct: pct(catalogFees.tech_fee, totalRevenue) },
      { type: 'Easy Ship', amount: parseFloat((-catalogFees.easy_ship).toFixed(2)), pct: pct(catalogFees.easy_ship, totalRevenue) },
      { type: 'Promo Rebates', amount: parseFloat((-catalogFees.promo).toFixed(2)), pct: pct(catalogFees.promo, totalRevenue) },
      { type: 'TCS', amount: parseFloat((-catalogFees.tcs).toFixed(2)), pct: pct(catalogFees.tcs, totalRevenue) },
      { type: 'TDS', amount: parseFloat((-catalogFees.tds).toFixed(2)), pct: pct(catalogFees.tds, totalRevenue) },
    ].filter(t => t.amount > 0).sort((a, b) => b.amount - a.amount),
  }

  const skus = Object.values(skuMap)
    .filter(s => s.revenue > 0)
    .map(s => {
      const totalFee = s.commission + s.fba_fulfillment + s.closing_fee + s.tech_fee + s.easy_ship + s.promo + s.tcs + s.tds
      return {
        sku: s.sku,
        revenue: parseFloat(s.revenue.toFixed(2)),
        total_fees: parseFloat((-totalFee).toFixed(2)),
        fee_pct: pct(totalFee, s.revenue),
        commission: parseFloat((-s.commission).toFixed(2)),
        commission_pct: pct(s.commission, s.revenue),
        fba_fulfillment: parseFloat((-s.fba_fulfillment).toFixed(2)),
        fba_pct: pct(s.fba_fulfillment, s.revenue),
        closing_fee: parseFloat((-s.closing_fee).toFixed(2)),
        tech_fee: parseFloat((-s.tech_fee).toFixed(2)),
        promo: parseFloat((-s.promo).toFixed(2)),
        tcs: parseFloat((-s.tcs).toFixed(2)),
        tds: parseFloat((-s.tds).toFixed(2)),
      }
    })
    .sort((a, b) => b.fee_pct - a.fee_pct)


  const _result = { coverage, catalog_summary, skus }
  // Write result to disk for GitHub deployment (no TXT files needed on server)
  if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true })
  const _outPath = path.join(PROCESSED_DIR, `feeBreakdown_result_${month || 'latest'}.json`)
  fs.writeFileSync(_outPath, JSON.stringify(_result))
  setCached(_cacheKey, _result)
  return _result
}
