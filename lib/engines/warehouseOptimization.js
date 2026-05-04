import { parseAllSettlement, parseNum, parseAllMTRB2C } from '../parsers.js'
import { getCached, setCached } from '../cache.js'
import fs from 'fs'
import path from 'path'

const PROCESSED_DIR = path.join(process.cwd(), 'data', 'processed')


export async function runWarehouseOptimizationEngine(month = null) {
  const _cacheKey = `warehouseOpt_${month || 'latest'}`
  const _cached = getCached(_cacheKey)
  if (_cached) return _cached

  // Check pre-computed result JSON on disk
  // Resolve 'latest' by scanning available files rather than relying on a latest.json
  const _resolveMonth = (m) => {
    if (m) return m
    if (!fs.existsSync(PROCESSED_DIR)) return null
    const files = fs.readdirSync(PROCESSED_DIR)
      .filter(f => f.match(/^warehouseOpt_result_\d{4}-\d{2}\.json$/))
      .sort()
    return files.length > 0 ? files[files.length-1].replace('warehouseOpt_result_', '').replace('.json', '') : null
  }
  const _resolvedMonth = _resolveMonth(month)
  const _rPath = _resolvedMonth ? path.join(PROCESSED_DIR, `warehouseOpt_result_${_resolvedMonth}.json`) : null
  if (_rPath && fs.existsSync(_rPath)) {
    const _diskResult = JSON.parse(fs.readFileSync(_rPath, 'utf-8'))
    setCached(_cacheKey, _diskResult)
    return _diskResult
  }

  const { rows: mtrB2C } = parseAllMTRB2C()
  const { rows: allS, availableMonths: settlementMonths, monthRows } = parseAllSettlement()
  const selectedMonth = month && settlementMonths.includes(month) ? month : settlementMonths[settlementMonths.length - 1]
  const settlement = selectedMonth ? (monthRows[selectedMonth] || []) : allS
  const coverage = { available_months: settlementMonths, selected_month: selectedMonth, is_partial: settlement.length < 500 }

  // Build per-order FBA fee from settlement
  const orderFeeMap = {}
  for (const row of settlement) {
    const orderId = (row['order-id'] || '').trim()
    const desc = (row['amount-description'] || '').trim()
    const amt = parseNum(row['amount'])
    if (!orderId) continue
    if (['FBA Weight Handling Fee','FBA Pick & Pack Fee'].includes(desc)) {
      if (!orderFeeMap[orderId]) orderFeeMap[orderId] = 0
      orderFeeMap[orderId] += Math.abs(amt)
    }
  }

  // From MTR shipments: build demand + fulfillment geography per SKU
  const skuMap = {}

  for (const row of mtrB2C) {
    if ((row['Transaction Type'] || '') !== 'Shipment') continue
    if ((row['Fulfillment Channel'] || '') !== 'AFN') continue // FBA only

    const sku = (row['Sku'] || '').trim()
    const asin = (row['Asin'] || '').trim()
    const title = (row['Item Description'] || '').trim()
    const fromState = (row['Ship From State'] || '').trim().toUpperCase()
    const toState = (row['Ship To State'] || '').trim().toUpperCase()
    const orderId = (row['Order Id'] || '').trim()
    const igst = parseNum(row['Igst Rate'])
    const isCrossState = igst > 0 // cross-state if IGST applies
    const fbaFee = orderFeeMap[orderId] || 0

    if (!sku || !fromState || !toState) continue

    if (!skuMap[sku]) skuMap[sku] = {
      sku, asin, title,
      demand_by_state: {},   // toState → order count
      supply_by_state: {},   // fromState → order count
      cross_state_orders: 0,
      intra_state_orders: 0,
      cross_state_fee: 0,
      intra_state_fee: 0,
      total_orders: 0,
    }

    const s = skuMap[sku]
    s.total_orders++
    s.demand_by_state[toState] = (s.demand_by_state[toState] || 0) + 1
    s.supply_by_state[fromState] = (s.supply_by_state[fromState] || 0) + 1

    if (isCrossState) {
      s.cross_state_orders++
      s.cross_state_fee += fbaFee
    } else {
      s.intra_state_orders++
      s.intra_state_fee += fbaFee
    }
  }

  // Compute per-SKU opportunity
  const skus = []

  for (const s of Object.values(skuMap)) {
    if (s.total_orders < 3) continue

    // Top demand state
    const topDemandEntries = Object.entries(s.demand_by_state).sort((a, b) => b[1] - a[1])
    const topDemandState = topDemandEntries[0]?.[0] || ''
    const topDemandOrders = topDemandEntries[0]?.[1] || 0

    // Current fulfillment states
    const topSupplyEntries = Object.entries(s.supply_by_state).sort((a, b) => b[1] - a[1])
    const topSupplyState = topSupplyEntries[0]?.[0] || ''

    // Fee differential
    const avgCrossStateFee = s.cross_state_orders > 0 ? s.cross_state_fee / s.cross_state_orders : 0
    const avgIntraStateFee = s.intra_state_orders > 0 ? s.intra_state_fee / s.intra_state_orders : 0

    // Orders from top demand state that were fulfilled cross-state
    let crossFromTopDemand = 0
    for (const row of mtrB2C) {
      if ((row['Transaction Type'] || '') !== 'Shipment') continue
      if ((row['Sku'] || '').trim() !== s.sku) continue
      const toState = (row['Ship To State'] || '').trim().toUpperCase()
      const fromState = (row['Ship From State'] || '').trim().toUpperCase()
      if (toState === topDemandState && fromState !== topDemandState) crossFromTopDemand++
    }

    // Estimated monthly saving: if those cross-state orders became intra-state
    const feeSaving = avgCrossStateFee > avgIntraStateFee
      ? crossFromTopDemand * (avgCrossStateFee - avgIntraStateFee)
      : 0

    const cross_state_pct = s.total_orders > 0
      ? parseFloat(((s.cross_state_orders / s.total_orders) * 100).toFixed(1))
      : 0

    skus.push({
      sku: s.sku, asin: s.asin, title: s.title,
      total_orders: s.total_orders,
      top_demand_state: topDemandState,
      top_demand_orders: topDemandOrders,
      top_supply_state: topSupplyState,
      cross_state_orders: s.cross_state_orders,
      intra_state_orders: s.intra_state_orders,
      cross_state_pct,
      avg_cross_state_fee: parseFloat(avgCrossStateFee.toFixed(2)),
      avg_intra_state_fee: parseFloat(avgIntraStateFee.toFixed(2)),
      fee_per_order_saving: parseFloat((avgCrossStateFee - avgIntraStateFee).toFixed(2)),
      cross_orders_from_top_demand: crossFromTopDemand,
      estimated_monthly_saving: parseFloat(feeSaving.toFixed(2)),
      recommendation: feeSaving > 0
        ? `Send ${Math.ceil(crossFromTopDemand * 1.2)} units to Amazon's ${topDemandState} FC to serve local demand intra-state.`
        : topDemandState === topSupplyState
          ? 'Already well-positioned — top demand state matches top fulfillment state.'
          : 'Low fee differential — redistribution may not be cost-effective.',
      demand_by_state: Object.entries(s.demand_by_state)
        .sort((a, b) => b[1] - a[1]).slice(0, 8)
        .map(([state, orders]) => ({ state, orders })),
      supply_by_state: Object.entries(s.supply_by_state)
        .sort((a, b) => b[1] - a[1]).slice(0, 5)
        .map(([state, orders]) => ({ state, orders })),
    })
  }

  skus.sort((a, b) => b.estimated_monthly_saving - a.estimated_monthly_saving)

  const totalSaving = skus.reduce((s, r) => s + r.estimated_monthly_saving, 0)
  const totalCrossState = skus.reduce((s, r) => s + r.cross_state_orders, 0)
  const totalOrders = skus.reduce((s, r) => s + r.total_orders, 0)
  const skusWithOpportunity = skus.filter(s => s.estimated_monthly_saving > 0).length

  // Catalog-level state demand
  const catalogDemand = {}
  const catalogSupply = {}
  for (const s of skus) {
    for (const d of s.demand_by_state) {
      catalogDemand[d.state] = (catalogDemand[d.state] || 0) + d.orders
    }
    for (const sup of s.supply_by_state) {
      catalogSupply[sup.state] = (catalogSupply[sup.state] || 0) + sup.orders
    }
  }


  const _result = {
    coverage,
    summary: {
      total_skus_analyzed: skus.length,
      skus_with_opportunity: skusWithOpportunity,
      total_estimated_monthly_saving: parseFloat(totalSaving.toFixed(2)),
      cross_state_order_pct: totalOrders > 0 ? parseFloat(((totalCrossState / totalOrders) * 100).toFixed(1)) : 0,
      total_orders_analyzed: totalOrders,
    },
    skus,
    catalog_demand: Object.entries(catalogDemand).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([state, orders]) => ({ state, orders })),
    catalog_supply: Object.entries(catalogSupply).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([state, orders]) => ({ state, orders })),
  }
  // Write result to disk for GitHub deployment (no TXT files needed on server)
  if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true })
  const _outPath = path.join(PROCESSED_DIR, `warehouseOpt_result_${month || 'latest'}.json`)
  fs.writeFileSync(_outPath, JSON.stringify(_result))
  setCached(_cacheKey, _result)
  return _result
}
