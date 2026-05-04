import { parseCSV, parseTSV, parseNum, parsePct } from '../parsers.js'
import { getCached, setCached } from '../cache.js'
import crypto from 'crypto'

function hashStr(s) {
  return crypto.createHash('md5').update(s).digest('hex')
}

export async function runListingQualityEngine() {
  const _cacheKey = 'listingQuality'
  const _cached = getCached(_cacheKey)
  if (_cached) return _cached

  const listings = parseTSV('AllListings.txt')
  const monthly = parseCSV('BusinessReport-monthly.csv')

  // Build business report map by ASIN
  const brMap = {}
  for (const row of monthly) {
    const asin = (row['(Child) ASIN'] || '').trim()
    if (asin) brMap[asin] = row
  }

  // Find duplicate descriptions
  const descHashCount = {}
  for (const row of listings) {
    const desc = (row['item-description'] || '').trim()
    if (!desc) continue
    const h = hashStr(desc)
    descHashCount[h] = (descHashCount[h] || 0) + 1
  }

  let totalListings = 0
  let missingMRP = 0
  let missingDesc = 0
  let duplicateDescs = 0
  let mfnListings = 0
  let missingB2BPrice = 0
  let totalQualityScore = 0

  const skus = []

  // For correlation: collect paired (quality dim, conv_rate)
  const pairs = { mrp: [], desc: [], b2b: [], fba: [] }

  for (const row of listings) {
    totalListings++
    const sku = (row['seller-sku'] || '').trim()
    const asin = (row['asin1'] || '').trim()
    const title = (row['item-name'] || '').trim()
    const desc = (row['item-description'] || '').trim()
    const price = parseNum(row['price'])
    const mrp = parseNum(row['maximum-retail-price'])
    const bizPrice = (row['Business Price'] || '').trim()
    const channel = (row['fulfillment-channel'] || '').trim().toUpperCase()

    // 1. Title Score
    const titleLen = title.length
    let titleScore = 20
    if (titleLen >= 100) titleScore = 100
    else if (titleLen >= 80) titleScore = 80
    else if (titleLen >= 50) titleScore = 50

    // 2. Description Score
    let descScore = 0
    const descHash = desc ? hashStr(desc) : null
    const isDuplicate = descHash && descHashCount[descHash] > 1
    if (!desc) { descScore = 0; missingDesc++ }
    else if (isDuplicate) { descScore = 20; duplicateDescs++ }
    else if (desc.length < 100) descScore = 40
    else if (desc.length <= 200) descScore = 70
    else descScore = 100

    // 3. MRP Score
    let mrpScore = 0
    if (!row['maximum-retail-price'] || row['maximum-retail-price'].trim() === '') {
      mrpScore = 0; missingMRP++
    } else if (mrp > price) mrpScore = 100
    else mrpScore = 50

    // 4. B2B Price Score
    let b2bScore = 0
    if (bizPrice) b2bScore = 100
    else { b2bScore = 0; missingB2BPrice++ }

    // 5. Fulfillment Score
    let fulfillmentScore = 30
    if (channel === 'AMAZON_IN' || channel === 'AFN') { fulfillmentScore = 100 }
    else { mfnListings++ }

    const overallScore = Math.round(
      titleScore * 0.25 +
      descScore * 0.25 +
      mrpScore * 0.20 +
      b2bScore * 0.15 +
      fulfillmentScore * 0.15
    )

    totalQualityScore += overallScore

    // Business report join
    const br = brMap[asin] || {}
    const convRate = parsePct(br['Unit Session Percentage'] || '0')
    const sessions = parseNum(br['Sessions - Total'] || '0')
    const revenue = parseNum(br['Ordered Product Sales'] || '0')
    const units = parseNum(br['Units Ordered'] || '0')

    // Correlation data
    if (asin && brMap[asin]) {
      pairs.mrp.push({ quality: mrpScore >= 100 ? 1 : 0, conv: convRate })
      pairs.desc.push({ quality: descScore > 0 ? 1 : 0, conv: convRate })
      pairs.b2b.push({ quality: b2bScore > 0 ? 1 : 0, conv: convRate })
      pairs.fba.push({ quality: fulfillmentScore >= 100 ? 1 : 0, conv: convRate })
    }

    // Revenue impact estimate
    let revenueImpact = 0
    const avgOrderValue = units > 0 ? revenue / units : 0
    if (mrpScore < 100 && sessions > 0) {
      revenueImpact += sessions * (convRate / 100) * avgOrderValue * 0.1
    }
    if (descScore < 70 && sessions > 0) {
      revenueImpact += sessions * (convRate / 100) * avgOrderValue * 0.08
    }
    if (fulfillmentScore < 100 && sessions > 0) {
      revenueImpact += sessions * (convRate / 100) * avgOrderValue * 0.2
    }

    const issues = []
    if (mrpScore === 0) issues.push('missing_mrp')
    if (mrpScore === 50) issues.push('mrp_equals_price')
    if (descScore === 0) issues.push('missing_description')
    if (isDuplicate) issues.push('duplicate_description')
    if (b2bScore === 0) issues.push('missing_b2b_price')
    if (fulfillmentScore < 100) issues.push('mfn_channel')

    skus.push({
      sku, asin, title,
      overall_score: overallScore,
      scores: {
        title: titleScore,
        description: descScore,
        mrp: mrpScore,
        b2b_price: b2bScore,
        fulfillment: fulfillmentScore,
      },
      issues,
      conversion_rate: convRate,
      sessions,
      estimated_revenue_impact_monthly: Math.round(revenueImpact),
    })
  }

  // Compute correlations (mean diff)
  function meanConv(arr, q) {
    const g = arr.filter(p => p.quality === q).map(p => p.conv)
    return g.length > 0 ? g.reduce((a, b) => a + b, 0) / g.length : 0
  }
  const correlations = {
    mrp_set_conv_lift: parseFloat(((meanConv(pairs.mrp, 1) - meanConv(pairs.mrp, 0)) / 100).toFixed(3)),
    description_present_conv_lift: parseFloat(((meanConv(pairs.desc, 1) - meanConv(pairs.desc, 0)) / 100).toFixed(3)),
    fba_vs_mfn_conv_lift: parseFloat(((meanConv(pairs.fba, 1) - meanConv(pairs.fba, 0)) / 100).toFixed(3)),
  }

  skus.sort((a, b) => b.estimated_revenue_impact_monthly - a.estimated_revenue_impact_monthly)

  const _result = {
    summary: {
      total_listings: totalListings,
      avg_quality_score: totalListings > 0 ? Math.round(totalQualityScore / totalListings) : 0,
      missing_mrp: missingMRP,
      missing_description: missingDesc,
      duplicate_descriptions: duplicateDescs,
      mfn_listings: mfnListings,
      missing_b2b_price: missingB2BPrice,
    },
    correlations,
    skus,
  }
  setCached(_cacheKey, _result)
  return _result

}
