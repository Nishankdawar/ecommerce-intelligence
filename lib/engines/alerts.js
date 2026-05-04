import { parseCSV, parseTSV, parseNum } from '../parsers.js'
import { getCached, setCached } from '../cache.js'

export async function runAlertsEngine() {
  const _cacheKey = 'alerts'
  const _cached = getCached(_cacheKey)
  if (_cached) return _cached

  const ledger = parseCSV('InventoryLedger.csv')

  // Derive TODAY and numDays from actual ledger dates
  const allDates = [...new Set(ledger.map(r => r['Date']).filter(Boolean))]
    .sort((a, b) => new Date(a) - new Date(b))
  const TODAY = allDates.length > 0 ? new Date(allDates[allDates.length - 1]) : new Date()
  const numDays = Math.max(1, allDates.length)
  // Flex-Shipments.csv removed — it was a derived file (not a real Amazon report)
  // Shipment delay alerts require SP-API integration for real data
  const monthly = parseCSV('BusinessReport-monthly.csv')

  const alerts = []

  // ---- ALERT 1 & 3: Stockout + Dead Inventory (from Inventory Ledger) ----
  const asinMap = {}
  for (const row of ledger) {
    if ((row['Disposition'] || '').toUpperCase() !== 'SELLABLE') continue
    const asin = (row['ASIN'] || '').trim()
    if (!asin) continue
    if (!asinMap[asin]) asinMap[asin] = { msku: row['MSKU'] || '', title: row['Title'] || '', rows: [] }
    asinMap[asin].rows.push(row)
  }

  for (const [asin, data] of Object.entries(asinMap)) {
    const rows = data.rows

    // ---- Build per-warehouse breakdown ----
    const warehouseMap = {}
    for (const row of rows) {
      const loc = (row['Location'] || 'UNKNOWN').trim()
      if (!warehouseMap[loc]) warehouseMap[loc] = { rows: [] }
      warehouseMap[loc].rows.push(row)
    }
    const warehouses = Object.entries(warehouseMap).map(([location, wh]) => {
      const whSorted = [...wh.rows].sort((a, b) => new Date(a['Date']) - new Date(b['Date']))
      const stock = parseNum(whSorted[whSorted.length - 1]['Ending Warehouse Balance'])
      const shipments = wh.rows.reduce((s, r) => s + Math.abs(parseNum(r['Customer Shipments'])), 0)
      const returns_ = wh.rows.reduce((s, r) => s + Math.abs(parseNum(r['Customer Returns'])), 0)
      const velocity = Math.max(0, (shipments - returns_) / numDays)
      const daysLeft = velocity > 0 ? parseFloat((stock / velocity).toFixed(1)) : null
      const status = daysLeft === null ? 'NO_MOVEMENT' : daysLeft < 7 ? 'CRITICAL' : daysLeft < 15 ? 'WARNING' : 'OK'
      return { location, stock, daily_velocity: parseFloat(velocity.toFixed(1)), days_remaining: daysLeft, status }
    }).sort((a, b) => (a.days_remaining ?? 999) - (b.days_remaining ?? 999))

    // ---- Totals across all warehouses ----
    const totalShipments = rows.reduce((s, r) => s + Math.abs(parseNum(r['Customer Shipments'])), 0)
    const totalReturns = rows.reduce((s, r) => s + Math.abs(parseNum(r['Customer Returns'])), 0)
    const sorted = [...rows].sort((a, b) => new Date(a['Date']) - new Date(b['Date']))
    const currentStock = parseNum(sorted[sorted.length - 1]['Ending Warehouse Balance'])
    const netVelocity = Math.max(0, (totalShipments - totalReturns) / numDays)

    if (totalShipments === 0 && currentStock > 0) {
      alerts.push({
        id: `dead_${asin}`,
        type: 'DEAD_INVENTORY',
        severity: 'WARNING',
        asin,
        sku: data.msku,
        title: data.title,
        message: `${currentStock} units of "${data.msku}" have had no movement. Estimated storage cost: ₹${(currentStock * 20).toLocaleString()}/month.`,
        recommended_action: 'Consider lowering the price or initiating FBA removal.',
        metric_value: currentStock,
        metric_unit: 'units_stuck',
      })
      continue
    }

    if (netVelocity > 0) {
      const daysRemaining = currentStock / netVelocity
      if (daysRemaining < 7) {
        const stockoutDate = new Date(TODAY)
        stockoutDate.setDate(stockoutDate.getDate() + Math.round(daysRemaining))
        alerts.push({
          id: `stockout_${asin}`,
          type: 'STOCKOUT_IMMINENT',
          severity: 'CRITICAL',
          asin,
          sku: data.msku,
          title: data.title,
          current_stock: currentStock,
          daily_velocity: parseFloat(netVelocity.toFixed(1)),
          warehouses,
          message: `"${data.msku}" will stock out in ${Math.round(daysRemaining)} days (~${stockoutDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}). Daily velocity: ${netVelocity.toFixed(1)} units/day.`,
          recommended_action: `Dispatch ${Math.round(netVelocity * 30)} units to FBA immediately.`,
          metric_value: Math.round(daysRemaining),
          metric_unit: 'days_remaining',
        })
      } else if (daysRemaining < 15) {
        const stockoutDate = new Date(TODAY)
        stockoutDate.setDate(stockoutDate.getDate() + Math.round(daysRemaining))
        alerts.push({
          id: `stockout_${asin}`,
          type: 'STOCKOUT_IMMINENT',
          severity: 'WARNING',
          asin,
          sku: data.msku,
          title: data.title,
          current_stock: currentStock,
          daily_velocity: parseFloat(netVelocity.toFixed(1)),
          warehouses,
          message: `"${data.msku}" will stock out in ${Math.round(daysRemaining)} days (~${stockoutDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}). Daily velocity: ${netVelocity.toFixed(1)} units/day.`,
          recommended_action: `Dispatch ${Math.round(netVelocity * 30)} units by ${new Date(TODAY.getTime() + (daysRemaining - 10) * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}.`,
          metric_value: Math.round(daysRemaining),
          metric_unit: 'days_remaining',
        })
      }
    }
  }

  // ---- ALERT 2: Shipment Delays — requires SP-API (GET_AMAZON_FULFILLED_SHIPMENTS_DATA_GENERAL)
  // Flex-Shipments.csv was a derived file, not a real Amazon report.
  // This alert will be enabled once SP-API integration is live.
  const totalShipments = 0
  const delayedCount = 0
  const totalDelayDays = 0
  const overdueCount = 0
  const overdueValue = 0
  const delayRate = 0
  const avgDelayDays = 0

  // ---- ALERT 4: Revenue Concentration Risk ----
  const totalRevenue = monthly.reduce((s, r) => s + parseNum(r['Ordered Product Sales']), 0)
  for (const row of monthly) {
    const rev = parseNum(row['Ordered Product Sales'])
    if (totalRevenue === 0) continue
    const pct = (rev / totalRevenue) * 100
    if (pct > 50) {
      alerts.push({
        id: `concentration_${row['(Child) ASIN']}`,
        type: 'CONCENTRATION_RISK',
        severity: 'WARNING',
        asin: row['(Child) ASIN'],
        sku: row['SKU'],
        title: row['Title'],
        message: `"${row['SKU']}" accounts for ${pct.toFixed(1)}% of total monthly revenue. High dependency risk.`,
        recommended_action: 'Diversify revenue by growing complementary SKUs. Protect this SKU\'s availability.',
        metric_value: parseFloat(pct.toFixed(1)),
        metric_unit: 'revenue_pct',
      })
    } else if (pct > 30) {
      alerts.push({
        id: `concentration_${row['(Child) ASIN']}`,
        type: 'CONCENTRATION_RISK',
        severity: 'INFO',
        asin: row['(Child) ASIN'],
        sku: row['SKU'],
        title: row['Title'],
        message: `"${row['SKU']}" accounts for ${pct.toFixed(1)}% of total monthly revenue.`,
        recommended_action: 'Monitor this SKU closely. Ensure stock levels are maintained.',
        metric_value: parseFloat(pct.toFixed(1)),
        metric_unit: 'revenue_pct',
      })
    }
  }

  // Sort: CRITICAL first, then WARNING, then INFO
  const sevOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 }
  alerts.sort((a, b) => (sevOrder[a.severity] ?? 3) - (sevOrder[b.severity] ?? 3))

  const critical = alerts.filter(a => a.severity === 'CRITICAL').length
  const warning = alerts.filter(a => a.severity === 'WARNING').length
  const info = alerts.filter(a => a.severity === 'INFO').length

  const _result = {
    summary: { critical, warning, info, total: alerts.length },
    alerts,
    shipment_stats: {
      total_shipments: totalShipments,
      delayed_count: delayedCount,
      delay_rate: parseFloat(delayRate.toFixed(1)),
      avg_delay_days: parseFloat(avgDelayDays),
      overdue_pending: overdueCount,
      overdue_value: overdueValue,
    },
  }
  setCached(_cacheKey, _result)
  return _result

}
