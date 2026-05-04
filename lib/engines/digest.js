import { parseCSV, parseNum, parsePct, parseAllMTRB2C } from '../parsers.js'

// Expected MTR months in order — used to detect what's missing
const EXPECTED_MTR_MONTHS = ['Jan-2026', 'Feb-2026', 'Mar-2026', 'Apr-2026']

export async function runDigestEngine() {
  const monthly = parseCSV('BusinessReport-monthly.csv')
  const { rows: mtrRows, availableMonths, fileCount } = parseAllMTRB2C()

  // ── Business overview from Business Report ────────────────────────────────
  let totalRevenue = 0
  let totalB2BRevenue = 0
  let totalSessions = 0
  let convRateSum = 0
  let convCount = 0

  for (const row of monthly) {
    totalRevenue += parseNum(row['Ordered Product Sales'])
    totalB2BRevenue += parseNum(row['Ordered Product Sales - B2B'])
    totalSessions += parseNum(row['Sessions - Total'])
    const conv = parsePct(row['Unit Session Percentage'])
    if (conv > 0) { convRateSum += conv; convCount++ }
  }

  const totalB2CRevenue = totalRevenue - totalB2BRevenue
  const avgConvRate = convCount > 0 ? convRateSum / convCount : 0
  const totalUnits = monthly.reduce((s, r) => s + parseNum(r['Units Ordered']), 0)

  // ── Daily revenue trend from MTR B2C ─────────────────────────────────────
  // Filter to shipments only, group by Order Date, sum Principal Amount
  const dailyRevMap = {}
  for (const row of mtrRows) {
    if ((row['Transaction Type'] || '') !== 'Shipment') continue
    const date = (row['Order Date'] || '').split(' ')[0].split('T')[0]
    if (!date || date < '2026-01-01') continue  // skip pre-2026 dates
    if (!dailyRevMap[date]) dailyRevMap[date] = 0
    dailyRevMap[date] += parseNum(row['Principal Amount'])
  }

  const daily_revenue_trend = Object.entries(dailyRevMap)
    .map(([date, revenue]) => ({ date, revenue: parseFloat(revenue.toFixed(2)) }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // ── Detect missing MTR months ─────────────────────────────────────────────
  const missingMonths = EXPECTED_MTR_MONTHS.filter(m => !availableMonths.includes(m))

  // ── Top 5 SKUs by revenue ─────────────────────────────────────────────────
  const top5ByRevenue = [...monthly]
    .sort((a, b) => parseNum(b['Ordered Product Sales']) - parseNum(a['Ordered Product Sales']))
    .slice(0, 5)
    .map(r => ({
      asin: (r['(Child) ASIN'] || r['\uFEFF(Child) ASIN'] || '').trim(),
      sku: r['SKU'],
      title: r['Title'],
      revenue: parseNum(r['Ordered Product Sales']),
      units: parseNum(r['Units Ordered']),
    }))

  return {
    overview: {
      total_revenue: parseFloat(totalRevenue.toFixed(2)),
      total_b2c_revenue: parseFloat(totalB2CRevenue.toFixed(2)),
      total_b2b_revenue: parseFloat(totalB2BRevenue.toFixed(2)),
      total_units: totalUnits,
      total_skus_active: monthly.length,
      avg_conversion_rate: parseFloat(avgConvRate.toFixed(2)),
      period: 'Jan–Apr 2026',
    },
    daily_revenue_trend,
    trend_coverage: {
      available_months: availableMonths,
      missing_months: missingMonths,
      trend_period: availableMonths.length > 0
        ? `${availableMonths[0]} – ${availableMonths[availableMonths.length - 1]}`
        : null,
    },
    top5_by_revenue: top5ByRevenue,
  }
}
