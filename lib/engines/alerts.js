import { parseCSV, parseTSV, parseNum } from '../parsers.js'

const TODAY = new Date('2026-04-28')

export async function runAlertsEngine() {
  const ledger = parseCSV('InventoryLedger.csv')
  const flex = parseCSV('Flex-Shipments.csv')
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
    const totalShipments = rows.reduce((s, r) => s + Math.abs(parseNum(r['Customer Shipments'])), 0)
    const totalReturns = rows.reduce((s, r) => s + Math.abs(parseNum(r['Customer Returns'])), 0)
    const sorted = [...rows].sort((a, b) => new Date(a['Date']) - new Date(b['Date']))
    const currentStock = parseNum(sorted[sorted.length - 1]['Ending Warehouse Balance'])
    const netVelocity = Math.max(0, (totalShipments - totalReturns) / 2)

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
          message: `"${data.msku}" will stock out in ${Math.round(daysRemaining)} days (~${stockoutDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}). Daily velocity: ${netVelocity.toFixed(1)} units/day.`,
          recommended_action: `Dispatch ${Math.round(netVelocity * 30)} units by ${new Date(TODAY.getTime() + (daysRemaining - 10) * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}.`,
          metric_value: Math.round(daysRemaining),
          metric_unit: 'days_remaining',
        })
      }
    }
  }

  // ---- ALERT 2: Shipment Delays (from Flex-Shipments.csv) ----
  let totalShipments = 0
  let delayedCount = 0
  let totalDelayDays = 0
  let overdueCount = 0
  let overdueValue = 0

  for (const row of flex) {
    totalShipments++
    const exsd = row['ExSD'] || row['Expected Ship Date'] || ''
    const actualDate = row['Actual Shipout Date'] || ''
    const status = (row['Status'] || '').toLowerCase()
    const orderValue = parseNum(row['Order Value'])
    const creationDate = row['Shipment Creation Date'] || ''

    if (actualDate && exsd) {
      const exp = new Date(exsd)
      const act = new Date(actualDate)
      if (!isNaN(exp) && !isNaN(act)) {
        const delayDays = Math.round((act - exp) / 86400000)
        if (delayDays > 0) {
          delayedCount++
          totalDelayDays += delayDays
        }
      }
    } else if (!actualDate && (status === 'confirmed' || status === 'manifested')) {
      if (creationDate) {
        const created = new Date(creationDate)
        if (!isNaN(created)) {
          const daysSince = Math.round((TODAY - created) / 86400000)
          if (daysSince > 2) {
            overdueCount++
            overdueValue += orderValue
          }
        }
      }
    }
  }

  const delayRate = totalShipments > 0 ? (delayedCount / totalShipments) * 100 : 0
  const avgDelayDays = delayedCount > 0 ? (totalDelayDays / delayedCount).toFixed(1) : 0

  if (delayRate > 20) {
    alerts.push({
      id: 'delay_spike',
      type: 'SHIPMENT_DELAY',
      severity: 'WARNING',
      message: `${delayRate.toFixed(1)}% of shipments in the last 24 days were delayed. Avg delay: ${avgDelayDays} days.`,
      recommended_action: 'Review shipment planning and carrier performance. Consider buffer stock.',
      overdue_pending_count: overdueCount,
      overdue_pending_value: overdueValue,
      metric_value: parseFloat(delayRate.toFixed(1)),
      metric_unit: 'delay_rate_pct',
    })
  }

  if (overdueCount > 5) {
    alerts.push({
      id: 'overdue_pending',
      type: 'SHIPMENT_DELAY',
      severity: 'CRITICAL',
      message: `${overdueCount} shipments are overdue (created >2 days ago, not yet shipped). At-risk order value: ₹${overdueValue.toLocaleString()}.`,
      recommended_action: 'Immediately escalate with carrier/warehouse team.',
      overdue_pending_count: overdueCount,
      overdue_pending_value: overdueValue,
      metric_value: overdueCount,
      metric_unit: 'overdue_count',
    })
  }

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

  return {
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
}
