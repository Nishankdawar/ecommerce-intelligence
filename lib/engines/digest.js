import { parseCSV, parseTSV, parseNum, parsePct } from '../parsers.js'

export async function runDigestEngine() {
  const monthly = parseCSV('BusinessReport-monthly.csv')
  const orders = parseTSV('Orders-Merchant.txt')
  const flex = parseCSV('Flex-Shipments.csv')

  // Business overview
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

  // Total orders from merchant file
  const nonCancelledOrders = orders.filter(r => (r['order-status'] || '').toLowerCase() !== 'cancelled')
  const totalOrders = new Set(nonCancelledOrders.map(r => r['amazon-order-id'])).size

  // Daily revenue trend — group merchant + flex by date
  const dailyRevMap = {}
  for (const row of nonCancelledOrders) {
    const date = (row['purchase-date'] || '').split('T')[0]
    if (!date) continue
    if (!dailyRevMap[date]) dailyRevMap[date] = { merchant: 0, flex: 0 }
    dailyRevMap[date].merchant += parseNum(row['item-price'])
  }
  for (const row of flex) {
    const date = (row['Shipment Creation Date'] || '').split('T')[0]
    if (!date) continue
    if (!dailyRevMap[date]) dailyRevMap[date] = { merchant: 0, flex: 0 }
    dailyRevMap[date].flex += parseNum(row['Order Value'])
  }

  const daily_revenue_trend = Object.entries(dailyRevMap)
    .map(([date, v]) => ({ date, revenue: parseFloat((v.merchant + v.flex).toFixed(2)), merchant: parseFloat(v.merchant.toFixed(2)), fba: parseFloat(v.flex.toFixed(2)) }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Top 5 SKUs by revenue
  const top5ByRevenue = [...monthly]
    .sort((a, b) => parseNum(b['Ordered Product Sales']) - parseNum(a['Ordered Product Sales']))
    .slice(0, 5)
    .map(r => ({
      asin: r['(Child) ASIN'],
      sku: r['SKU'],
      title: r['Title'],
      revenue: parseNum(r['Ordered Product Sales']),
      units: parseNum(r['Units Ordered']),
    }))

  return {
    overview: {
      total_monthly_revenue: parseFloat(totalRevenue.toFixed(2)),
      total_b2c_revenue: parseFloat(totalB2CRevenue.toFixed(2)),
      total_b2b_revenue: parseFloat(totalB2BRevenue.toFixed(2)),
      total_orders: totalOrders,
      total_skus_active: monthly.length,
      avg_conversion_rate: parseFloat(avgConvRate.toFixed(2)),
    },
    daily_revenue_trend,
    top5_by_revenue: top5ByRevenue,
  }
}
