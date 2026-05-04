import { parseCSV, parseTSV, parseNum, parsePct } from '../parsers.js'
import { getCached, setCached } from '../cache.js'

export async function runB2BEngine() {
  const _cacheKey = 'b2b'
  const _cached = getCached(_cacheKey)
  if (_cached) return _cached

  const monthly = parseCSV('BusinessReport-monthly.csv')
  const listings = parseTSV('AllListings.txt')

  // Build listings map by seller-sku
  const listingsMap = {}
  for (const row of listings) {
    const sku = (row['seller-sku'] || '').trim()
    if (sku) listingsMap[sku] = row
  }

  let totalB2BRevenue = 0
  let totalRevenue = 0
  let skusMissingPricing = 0
  let skusUntapped = 0
  let skusHealthy = 0

  const skus = []

  for (const row of monthly) {
    const asin = (row['(Child) ASIN'] || '').trim()
    const sku = (row['SKU'] || '').trim()
    const title = (row['Title'] || '').trim()

    const b2bSessions = parseNum(row['Sessions - Total - B2B'])
    const b2bUnits = parseNum(row['Units Ordered - B2B'])
    const b2cConv = parsePct(row['Unit Session Percentage'])
    const b2bConv = parsePct(row['Unit Session Percentage - B2B'])
    const b2bRev = parseNum(row['Ordered Product Sales - B2B'])
    const b2cRev = parseNum(row['Ordered Product Sales']) - b2bRev

    totalB2BRevenue += b2bRev
    totalRevenue += b2bRev + b2cRev

    const listing = listingsMap[sku] || {}
    const b2bPriceSet = !!(listing['Business Price'] && listing['Business Price'].trim())
    const qtyTiersSet = !!(listing['Quantity Lower Bound 1'] && listing['Quantity Lower Bound 1'].trim())

    const convGap = parseFloat((b2cConv - b2bConv).toFixed(2))

    let opportunityTag
    if (b2bSessions === 0) opportunityTag = 'B2B NOT VISIBLE'
    else if (b2bUnits === 0) opportunityTag = 'UNTAPPED'
    else if (!b2bPriceSet) opportunityTag = 'MISSING B2B PRICING'
    else if (convGap > 5) opportunityTag = 'UNDERPERFORMING'
    else opportunityTag = 'B2B HEALTHY'

    const scoreMap = {
      'B2B NOT VISIBLE': 90,
      'UNTAPPED': 85,
      'MISSING B2B PRICING': 80,
      'UNDERPERFORMING': 60,
      'B2B HEALTHY': 10,
    }
    const opportunityScore = scoreMap[opportunityTag] ?? 50

    if (opportunityTag === 'MISSING B2B PRICING' && b2bSessions > 0) skusMissingPricing++
    if (opportunityTag === 'UNTAPPED') skusUntapped++
    if (opportunityTag === 'B2B HEALTHY') skusHealthy++

    skus.push({
      asin, sku, title,
      b2b_sessions: b2bSessions,
      b2b_units: b2bUnits,
      b2c_conv: b2cConv,
      b2b_conv: b2bConv,
      conv_gap: convGap,
      b2b_revenue: parseFloat(b2bRev.toFixed(2)),
      b2c_revenue: parseFloat(b2cRev.toFixed(2)),
      b2b_revenue_pct: (b2bRev + b2cRev) > 0 ? parseFloat(((b2bRev / (b2bRev + b2cRev)) * 100).toFixed(1)) : 0,
      b2b_price_set: b2bPriceSet,
      qty_tiers_set: qtyTiersSet,
      opportunity_tag: opportunityTag,
      opportunity_score: opportunityScore,
    })
  }

  skus.sort((a, b) => b.opportunity_score - a.opportunity_score || b.b2b_sessions - a.b2b_sessions)

  const _result = {
    summary: {
      total_b2b_revenue: parseFloat(totalB2BRevenue.toFixed(2)),
      b2b_revenue_pct: totalRevenue > 0 ? parseFloat(((totalB2BRevenue / totalRevenue) * 100).toFixed(1)) : 0,
      skus_missing_b2b_pricing: skusMissingPricing,
      skus_untapped: skusUntapped,
      skus_healthy: skusHealthy,
      total_revenue: parseFloat(totalRevenue.toFixed(2)),
    },
    skus,
  }
  setCached(_cacheKey, _result)
  return _result

}
