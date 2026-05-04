import { parseCSV, parseNum, parsePct } from '../parsers.js'
import { getCached, setCached } from '../cache.js'

export async function runSkuHealthEngine() {
  const _cacheKey = 'skuHealth'
  const _cached = getCached(_cacheKey)
  if (_cached) return _cached

  const monthly = parseCSV('BusinessReport-monthly.csv')
  const ledger = parseCSV('InventoryLedger.csv')

  // Derive number of days from actual ledger dates
  const numLedgerDays = Math.max(1, new Set(
    ledger.map(r => r['Date']).filter(Boolean)
  ).size)

  // Build inventory map per ASIN (SELLABLE only)
  const inventoryMap = {}
  for (const row of ledger) {
    if ((row['Disposition'] || '').toUpperCase() !== 'SELLABLE') continue
    const asin = (row['ASIN'] || '').trim()
    if (!asin) continue
    if (!inventoryMap[asin]) {
      inventoryMap[asin] = { returns: 0, shipments: 0, dates: {}, endingBalances: [] }
    }
    const map = inventoryMap[asin]
    map.returns += Math.abs(parseNum(row['Customer Returns']))
    map.shipments += Math.abs(parseNum(row['Customer Shipments']))
    const date = row['Date'] || ''
    const balance = parseNum(row['Ending Warehouse Balance'])
    if (date) {
      if (!map.dates[date]) map.dates[date] = balance
      else map.dates[date] = Math.max(map.dates[date], balance)
    }
    map.endingBalances.push({ date, balance })
  }

  // Compute inventory derived fields
  const invDerived = {}
  for (const [asin, inv] of Object.entries(inventoryMap)) {
    const returnRate = inv.shipments > 0 ? inv.returns / inv.shipments : 0
    const dailyVelocity = inv.shipments / numLedgerDays
    const sortedDates = Object.keys(inv.dates).sort()
    const latestDate = sortedDates[sortedDates.length - 1]
    const currentStock = latestDate ? inv.dates[latestDate] : 0
    const daysCover = dailyVelocity > 0 ? currentStock / dailyVelocity : null
    invDerived[asin] = { returnRate, dailyVelocity, currentStock, daysCover }
  }

  // Compute catalog avg conversion
  const convRates = monthly.map(r => parsePct(r['Unit Session Percentage'])).filter(v => v > 0)
  const catalogAvgConversion = convRates.length > 0 ? convRates.reduce((a, b) => a + b, 0) / convRates.length : 1

  // Percentile rank for traffic
  const sessions = monthly.map(r => ({ asin: r['(Child) ASIN'], val: parseNum(r['Sessions - Total']) }))
  sessions.sort((a, b) => a.val - b.val)
  const totalSKUs = sessions.length
  const sessionRankMap = {}
  sessions.forEach((s, i) => { sessionRankMap[s.asin] = i })

  const results = []

  for (const row of monthly) {
    const asin = (row['(Child) ASIN'] || '').trim()
    const sku = (row['SKU'] || '').trim()
    const title = (row['Title'] || '').trim()

    const totalSessions = parseNum(row['Sessions - Total'])
    const b2bSessions = parseNum(row['Sessions - Total - B2B'])

    const unitSessionPct = parsePct(row['Unit Session Percentage'])
    const b2bConvPct = parsePct(row['Unit Session Percentage - B2B'])

    const featuredOfferPct = parsePct(row['Featured Offer Percentage'])

    const totalRevenue = parseNum(row['Ordered Product Sales'])
    const b2bRevenue = parseNum(row['Ordered Product Sales - B2B'])
    const totalUnits = parseNum(row['Units Ordered'])
    const b2bUnits = parseNum(row['Units Ordered - B2B'])

    // 1. Conversion Score
    const convScore = Math.min(100, (unitSessionPct / catalogAvgConversion) * 50)

    // 2. Traffic Score
    const rank = sessionRankMap[asin] ?? 0
    const trafficScore = (rank / (totalSKUs - 1 || 1)) * 100

    // 3. Buy Box Score
    let buyBoxScore = 10
    if (featuredOfferPct >= 95) buyBoxScore = 100
    else if (featuredOfferPct >= 80) buyBoxScore = 70
    else if (featuredOfferPct >= 60) buyBoxScore = 40

    // 4. Return Rate Score
    const inv = invDerived[asin] || { returnRate: 0, daysCover: null }
    let returnRateScore = 100
    if (inv.returnRate > 0.10) returnRateScore = 0
    else if (inv.returnRate > 0.05) returnRateScore = 40
    else if (inv.returnRate > 0.02) returnRateScore = 70

    // 5. Inventory Efficiency Score
    let invEffScore = 20
    if (inv.daysCover === null) invEffScore = 20
    else if (inv.daysCover < 7) invEffScore = 30
    else if (inv.daysCover <= 60) invEffScore = 100
    else if (inv.daysCover <= 90) invEffScore = 70
    else invEffScore = 40

    // 6. B2B Score
    let b2bScore = 20
    if (b2bSessions > 0) {
      if (b2bUnits === 0) b2bScore = 30
      else if (b2bConvPct >= unitSessionPct * 0.8) b2bScore = 100
      else if (b2bConvPct >= unitSessionPct * 0.5) b2bScore = 60
      else b2bScore = 30
    }

    const overallScore = Math.round(
      convScore * 0.25 +
      trafficScore * 0.20 +
      buyBoxScore * 0.20 +
      returnRateScore * 0.15 +
      invEffScore * 0.10 +
      b2bScore * 0.10
    )

    let classification = 'DISCONTINUE'
    if (overallScore >= 70) classification = 'INVEST'
    else if (overallScore >= 40) classification = 'WATCH'

    results.push({
      asin,
      sku,
      title,
      overall_score: overallScore,
      classification,
      scores: {
        conversion: Math.round(convScore),
        traffic: Math.round(trafficScore),
        buy_box: buyBoxScore,
        return_rate: returnRateScore,
        inventory_efficiency: invEffScore,
        b2b: b2bScore,
      },
      metrics: {
        sessions: totalSessions,
        conversion_rate: unitSessionPct,
        catalog_avg_conversion: parseFloat(catalogAvgConversion.toFixed(2)),
        buy_box_pct: featuredOfferPct,
        return_rate: parseFloat((inv.returnRate * 100).toFixed(2)),
        days_cover: inv.daysCover !== null ? parseFloat(inv.daysCover.toFixed(1)) : null,
        b2b_revenue: b2bRevenue,
        b2b_conversion: b2bConvPct,
        b2c_sessions: totalSessions - b2bSessions,
        b2c_revenue: totalRevenue - b2bRevenue,
        b2c_units: totalUnits - b2bUnits,
        total_revenue: totalRevenue,
      },
    })
  }

  return results
}
