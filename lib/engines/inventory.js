import { parseCSV, parseNum } from '../parsers.js'

function addDays(d, n) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r.toISOString().split('T')[0]
}

export async function runInventoryEngine() {
  const ledger = parseCSV('InventoryLedger.csv')

  // ── Derive TODAY and numDays from actual ledger dates (Fix #1 + Fix #2) ──
  const allDates = [...new Set(
    ledger.map(r => r['Date']).filter(Boolean)
  )].sort((a, b) => new Date(a) - new Date(b))

  const TODAY = allDates.length > 0
    ? new Date(allDates[allDates.length - 1])
    : new Date()
  const numDays = Math.max(1, allDates.length) // actual days in ledger

  // Group SELLABLE rows per ASIN
  const asinMap = {}
  for (const row of ledger) {
    if ((row['Disposition'] || '').toUpperCase() !== 'SELLABLE') continue
    const asin = (row['ASIN'] || '').trim()
    if (!asin) continue
    if (!asinMap[asin]) {
      asinMap[asin] = {
        msku: row['MSKU'] || '',
        fnsku: row['FNSKU'] || '',
        title: row['Title'] || '',
        location: row['Location'] || '',
        rows: [],
      }
    }
    asinMap[asin].rows.push(row)
  }

  const skus = []
  const dead = []
  let criticalCount = 0, warningCount = 0, deadSkus = 0, deadUnits = 0

  for (const [asin, data] of Object.entries(asinMap)) {
    const rows = data.rows
    // Shipments in Amazon ledger are negative (outbound), take abs
    const totalShipments = rows.reduce((s, r) => s + Math.abs(parseNum(r['Customer Shipments'])), 0)
    const totalReturns = rows.reduce((s, r) => s + Math.abs(parseNum(r['Customer Returns'])), 0)
    const lostUnits = rows.reduce((s, r) => s + parseNum(r['Lost']), 0)
    const damagedUnits = rows.reduce((s, r) => s + parseNum(r['Damaged']), 0)

    // Latest ending balance
    const sorted = [...rows].sort((a, b) => new Date(a['Date']) - new Date(b['Date']))
    const latestRow = sorted[sorted.length - 1]
    const currentStock = parseNum(latestRow['Ending Warehouse Balance'])

    // Daily velocity: divide by actual number of days in ledger (not hardcoded 2)
    const netVelocity = Math.max(0, (totalShipments - totalReturns) / numDays)

    let daysRemaining = null
    let stockoutDate = null
    let status = 'OK'
    let recommendedQty = null
    let reorderBy = null

    if (totalShipments === 0 && currentStock > 0) {
      status = 'DEAD'
      deadSkus++
      deadUnits += currentStock
      dead.push({
        asin,
        msku: data.msku,
        title: data.title,
        units_stuck: currentStock,
        estimated_monthly_cost: currentStock * 20,
        recommended_action: 'LOWER PRICE',
        action_reason: 'No shipments recorded. Discount to drive movement or initiate removal.',
      })
      continue
    }

    if (netVelocity === 0) {
      status = 'DEAD'
      deadSkus++
      deadUnits += currentStock
      dead.push({
        asin,
        msku: data.msku,
        title: data.title,
        units_stuck: currentStock,
        estimated_monthly_cost: currentStock * 20,
        recommended_action: 'INITIATE REMOVAL',
        action_reason: 'Zero net velocity. Units are accumulating storage costs.',
      })
      continue
    }

    daysRemaining = parseFloat((currentStock / netVelocity).toFixed(1))
    stockoutDate = addDays(TODAY, daysRemaining)

    if (daysRemaining < 7) { status = 'CRITICAL'; criticalCount++ }
    else if (daysRemaining < 15) { status = 'WARNING'; warningCount++ }
    else if (daysRemaining < 30) { status = 'WATCH' }

    if (daysRemaining < 15) {
      recommendedQty = Math.round(netVelocity * 30)
      reorderBy = addDays(TODAY, Math.max(0, daysRemaining - 10))
    }

    skus.push({
      asin,
      msku: data.msku,
      fnsku: data.fnsku,
      title: data.title,
      current_stock: currentStock,
      daily_velocity: parseFloat(netVelocity.toFixed(1)),
      days_remaining: daysRemaining,
      stockout_date: stockoutDate,
      status,
      recommended_qty: recommendedQty,
      reorder_by: reorderBy,
      lost_units: lostUnits,
      damaged_units: damagedUnits,
      location: data.location,
    })
  }

  // Sort: critical first, then warning, then watch, then ok
  const order = { CRITICAL: 0, WARNING: 1, WATCH: 2, OK: 3 }
  skus.sort((a, b) => (order[a.status] ?? 4) - (order[b.status] ?? 4) || (a.days_remaining ?? 999) - (b.days_remaining ?? 999))

  return {
    summary: {
      total_skus_tracked: skus.length + dead.length,
      critical_stockout: criticalCount,
      warning_stockout: warningCount,
      dead_inventory_skus: deadSkus,
      dead_inventory_units: deadUnits,
      estimated_dead_storage_cost_monthly: deadUnits * 20,
    },
    ledger_coverage: {
      num_days: numDays,
      date_from: allDates[0] || null,
      date_to: allDates[allDates.length - 1] || null,
      accuracy: numDays >= 30 ? 'high' : numDays >= 14 ? 'medium' : 'low',
    },
    skus,
    dead_inventory: dead,
  }
}
