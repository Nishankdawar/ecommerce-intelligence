import { parseAllSettlement, parseNum } from '../parsers.js'
import { getCached, setCached } from '../cache.js'
import fs from 'fs'
import path from 'path'

const PROCESSED_DIR = path.join(process.cwd(), 'data', 'processed')

function resultPath(month) {
  return path.join(PROCESSED_DIR, `settlement_result_${month}.json`)
}

export async function runSettlementEngine(month = null) {
  const _cacheKey = `settlement_${month || 'latest'}`

  // 1. Check in-memory cache
  const _cached = getCached(_cacheKey)
  if (_cached) return _cached

  // 2. Get available months to resolve selected month
  const { availableMonths, monthRows } = parseAllSettlement()
  const selectedMonth = month && availableMonths.includes(month)
    ? month : availableMonths[availableMonths.length - 1]

  // 3. Check pre-computed result JSON on disk
  const rPath = selectedMonth ? resultPath(selectedMonth) : null
  if (rPath && fs.existsSync(rPath)) {
    const result = JSON.parse(fs.readFileSync(rPath, 'utf-8'))
    // Update coverage with all available months
    result.coverage.available_months = availableMonths
    setCached(_cacheKey, result)
    return result
  }

  const rows = selectedMonth ? (monthRows[selectedMonth] || []) : []

  // Coverage info to return
  const coverage = {
    available_months: availableMonths,
    selected_month: selectedMonth,
    total_rows_in_month: rows.length,
    is_partial: rows.length < 500,
  }

  // Get settlement metadata from first rows
  const settlementMeta = {}
  for (const row of rows) {
    const sid = row['settlement-id']
    if (!sid) continue
    if (!settlementMeta[sid]) {
      settlementMeta[sid] = {
        settlement_id: sid,
        start_date: row['settlement-start-date'] || '',
        end_date: row['settlement-end-date'] || '',
        deposit_date: row['deposit-date'] || '',
        total_amount: parseNum(row['total-amount']),
      }
    }
  }

  // Aggregate per settlement cycle
  const cycleMap = {}
  const orderMap = {} // per-order detail

  for (const row of rows) {
    const sid = row['settlement-id']
    const orderId = (row['order-id'] || '').trim()
    const sku = (row['sku'] || '').trim()
    const desc = (row['amount-description'] || '').trim()
    const amtType = (row['amount-type'] || '').trim()
    const txType = (row['transaction-type'] || '').trim()
    const amt = parseNum(row['amount'])
    const postedDate = row['posted-date'] || ''

    if (!sid) continue

    if (!cycleMap[sid]) cycleMap[sid] = {
      settlement_id: sid,
      ...settlementMeta[sid],
      revenue: 0, shipping: 0,
      commission: 0, fba_fees: 0, closing_fees: 0, tech_fees: 0,
      promo: 0, tcs: 0, tds: 0,
      refunds: 0, reimbursements: 0, other: 0,
      order_count: new Set(),
    }

    const c = cycleMap[sid]

    if (orderId) c.order_count.add(orderId)

    if (desc === 'Principal' || desc === 'Product Tax') c.revenue += amt
    else if (desc === 'Shipping' || desc === 'Shipping tax') c.shipping += amt
    else if (desc === 'Commission' || desc === 'Refund commission' || desc === 'Commission CGST' || desc === 'Commission SGST' || desc === 'Commission IGST' || desc === 'Refund commission IGST') c.commission += amt
    else if (desc.startsWith('FBA Weight Handling Fee') || desc.startsWith('FBA Pick & Pack Fee') || desc.startsWith('FBAInboundTransportationFee')) c.fba_fees += amt
    else if (desc.startsWith('Fixed closing fee')) c.closing_fees += amt
    else if (desc.startsWith('Technology Fee') || desc.startsWith('TechnologyFee')) c.tech_fees += amt
    else if (desc === 'Promo rebates' || desc === 'Shipping discount' || desc === 'Product tax discount' || desc === 'Shipping tax discount') c.promo += amt
    else if (desc.startsWith('TCS')) c.tcs += amt
    else if (desc === 'TDS (Section 194-O)') c.tds += amt
    else if (['REVERSAL_REIMBURSEMENT','Reimbursement for Lost packages','FREE_REPLACEMENT_REFUND_ITEMS'].includes(desc)) c.reimbursements += amt
    else if (txType === 'Refund' && desc === 'Principal') c.refunds += amt
    else c.other += amt

    // Per-order map
    if (orderId && sku) {
      if (!orderMap[orderId]) orderMap[orderId] = {
        order_id: orderId, sku, posted_date: postedDate,
        settlement_id: sid,
        revenue: 0, commission: 0, fba_fees: 0, closing_fee: 0,
        tech_fee: 0, promo: 0, tcs: 0, tds: 0,
        reimbursements: 0, refunds: 0,
      }
      const o = orderMap[orderId]
      if (desc === 'Principal' || desc === 'Product Tax' || desc === 'Shipping' || desc === 'Shipping tax') o.revenue += amt
      else if (desc === 'Commission' || desc === 'Refund commission' || desc === 'Commission CGST' || desc === 'Commission SGST' || desc === 'Commission IGST' || desc === 'Refund commission IGST') o.commission += amt
      else if (desc.startsWith('FBA Weight Handling Fee') || desc.startsWith('FBA Pick & Pack Fee') || desc.startsWith('FBAInboundTransportationFee')) o.fba_fees += amt
      else if (desc.startsWith('Fixed closing fee')) o.closing_fee += amt
      else if (desc.startsWith('Technology Fee') || desc.startsWith('TechnologyFee')) o.tech_fee += amt
      else if (desc === 'Promo rebates' || desc === 'Shipping discount' || desc === 'Product tax discount' || desc === 'Shipping tax discount') o.promo += amt
      else if (desc.startsWith('TCS')) o.tcs += amt
      else if (desc === 'TDS (Section 194-O)') o.tds += amt
      else if (['REVERSAL_REIMBURSEMENT','Reimbursement for Lost packages','FREE_REPLACEMENT_REFUND_ITEMS'].includes(desc)) o.reimbursements += amt
      else if (txType === 'Refund' && desc === 'Principal') o.refunds += amt
    }
  }

  // Build cycles array
  const cycles = Object.values(cycleMap).map(c => {
    const gross = c.revenue + c.shipping
    const total_fees = c.commission + c.fba_fees + c.closing_fees + c.tech_fees + c.promo + c.tcs + c.tds
    const expected_deposit = gross + total_fees + c.reimbursements + c.refunds + c.other
    const diff = c.total_amount - expected_deposit

    return {
      settlement_id: c.settlement_id,
      start_date: c.start_date,
      end_date: c.end_date,
      deposit_date: c.deposit_date,
      // total_amount not in this export — use computed net as the deposit amount
      net_settlement: parseFloat(expected_deposit.toFixed(2)),
      order_count: c.order_count.size,
      waterfall: {
        gross_revenue: parseFloat(gross.toFixed(2)),
        commission: parseFloat(c.commission.toFixed(2)),
        fba_fees: parseFloat(c.fba_fees.toFixed(2)),
        closing_fees: parseFloat(c.closing_fees.toFixed(2)),
        tech_fees: parseFloat(c.tech_fees.toFixed(2)),
        promo: parseFloat(c.promo.toFixed(2)),
        tcs: parseFloat(c.tcs.toFixed(2)),
        tds: parseFloat(c.tds.toFixed(2)),
        refunds: parseFloat(c.refunds.toFixed(2)),
        reimbursements: parseFloat(c.reimbursements.toFixed(2)),
        other: parseFloat(c.other.toFixed(2)),
      },
    }
  }).sort((a, b) => String(a.deposit_date).localeCompare(String(b.deposit_date)))

  // Build orders array with net proceeds
  const orders = Object.values(orderMap).map(o => {
    const total_fees = o.commission + o.fba_fees + o.closing_fee + o.tech_fee + o.promo + o.tcs + o.tds
    const net_proceeds = o.revenue + total_fees + o.reimbursements + o.refunds
    const margin_pct = o.revenue > 0 ? parseFloat(((net_proceeds / o.revenue) * 100).toFixed(1)) : 0
    return {
      ...o,
      commission: parseFloat(o.commission.toFixed(2)),
      fba_fees: parseFloat(o.fba_fees.toFixed(2)),
      closing_fee: parseFloat(o.closing_fee.toFixed(2)),
      tech_fee: parseFloat(o.tech_fee.toFixed(2)),
      promo: parseFloat(o.promo.toFixed(2)),
      tcs: parseFloat(o.tcs.toFixed(2)),
      tds: parseFloat(o.tds.toFixed(2)),
      revenue: parseFloat(o.revenue.toFixed(2)),
      total_fees: parseFloat((-total_fees).toFixed(2)),
      net_proceeds: parseFloat(net_proceeds.toFixed(2)),
      margin_pct,
    }
  }).sort((a, b) => a.posted_date.localeCompare(b.posted_date))

  const totalDeposit = cycles.reduce((s, c) => s + c.net_settlement, 0)
  const agg = (key) => cycles.reduce((s, c) => s + (c.waterfall[key] || 0), 0)


  const _result = {
    coverage,
    summary: {
      total_settlements: cycles.length,
      total_deposit: parseFloat(totalDeposit.toFixed(2)),
      gross_revenue: parseFloat(agg('gross_revenue').toFixed(2)),
      commission: parseFloat((-agg('commission')).toFixed(2)),
      fba_fees: parseFloat((-agg('fba_fees')).toFixed(2)),
      closing_fees: parseFloat((-agg('closing_fees')).toFixed(2)),
      tech_fees: parseFloat((-agg('tech_fees')).toFixed(2)),
      promo_rebates: parseFloat((-agg('promo')).toFixed(2)),
      total_tds_deducted: parseFloat((-agg('tds')).toFixed(2)),
      total_tcs_deducted: parseFloat((-agg('tcs')).toFixed(2)),
      total_reimbursements: parseFloat(agg('reimbursements').toFixed(2)),
      other_deductions: parseFloat((-agg('other')).toFixed(2)),
      total_fees: parseFloat((-(agg('commission') + agg('fba_fees') + agg('closing_fees') + agg('tech_fees') + agg('promo'))).toFixed(2)),
      total_orders: orders.length,
    },
    cycles,
    orders,
  }
  // Write computed result to disk so future server starts skip re-parsing 247 files
  if (rPath) {
    if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true })
    fs.writeFileSync(rPath, JSON.stringify(_result))
  }
  setCached(_cacheKey, _result)
  return _result
}
