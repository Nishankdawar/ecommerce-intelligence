import { parseTSV, parseNum } from '../parsers.js'
import { getCached, setCached } from '../cache.js'

export async function runPromotionsEngine() {
  const _cacheKey = 'promotions'
  const _cached = getCached(_cacheKey)
  if (_cached) return _cached

  const orders = parseTSV('Orders-Merchant.txt')

  const filtered = orders.filter(r => (r['order-status'] || '').toLowerCase() !== 'cancelled')

  let totalRevenue = 0
  let promoRevenue = 0
  let organicRevenue = 0
  let promoOrders = 0
  let organicOrders = 0

  const promoMap = {}
  const dailyMap = {}
  const asinPromoMap = {}

  const seenOrderIds = new Set()

  for (const row of filtered) {
    const orderId = row['amazon-order-id'] || ''
    const price = parseNum(row['item-price'])
    const qty = parseNum(row['quantity']) || 1
    const promoStr = (row['promotion-ids'] || '').trim()
    const hasPromo = promoStr !== ''
    const promoIds = hasPromo ? promoStr.split(',').map(s => s.trim()).filter(Boolean) : []
    const purchaseDate = (row['purchase-date'] || '').split('T')[0]
    const asin = (row['asin'] || '').trim()
    const discount = parseNum(row['item-promotion-discount'])

    totalRevenue += price

    if (!dailyMap[purchaseDate]) {
      dailyMap[purchaseDate] = { promo_orders: 0, organic_orders: 0, promo_revenue: 0, organic_revenue: 0 }
    }

    if (hasPromo) {
      promoRevenue += price
      dailyMap[purchaseDate].promo_revenue += price

      // count unique promo orders per orderId
      if (!seenOrderIds.has(`${orderId}_promo`)) {
        promoOrders++
        dailyMap[purchaseDate].promo_orders++
        seenOrderIds.add(`${orderId}_promo`)
      }

      for (const pid of promoIds) {
        if (!promoMap[pid]) promoMap[pid] = { order_count: 0, revenue: 0, units: 0, discount_given: 0 }
        promoMap[pid].order_count++
        promoMap[pid].revenue += price
        promoMap[pid].units += qty
        promoMap[pid].discount_given += discount
      }
    } else {
      organicRevenue += price
      dailyMap[purchaseDate].organic_revenue += price
      if (!seenOrderIds.has(`${orderId}_organic`)) {
        organicOrders++
        dailyMap[purchaseDate].organic_orders++
        seenOrderIds.add(`${orderId}_organic`)
      }
    }

    // Per-ASIN promo breakdown
    if (asin) {
      if (!asinPromoMap[asin]) {
        asinPromoMap[asin] = { sku: row['sku'] || '', name: row['product-name'] || '', promo: 0, organic: 0 }
      }
      if (hasPromo) asinPromoMap[asin].promo += price
      else asinPromoMap[asin].organic += price
    }
  }

  const totalOrders = promoOrders + organicOrders

  const promotions = Object.entries(promoMap).map(([pid, v]) => ({
    promo_id: pid,
    order_count: v.order_count,
    revenue: parseFloat(v.revenue.toFixed(2)),
    units: v.units,
    revenue_pct: totalRevenue > 0 ? parseFloat(((v.revenue / totalRevenue) * 100).toFixed(2)) : 0,
    discount_given: parseFloat(v.discount_given.toFixed(2)),
  })).sort((a, b) => b.revenue - a.revenue)

  const daily_trend = Object.entries(dailyMap)
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const by_sku = Object.entries(asinPromoMap).map(([asin, v]) => ({
    asin,
    sku: v.sku,
    name: v.name,
    promo_revenue: parseFloat(v.promo.toFixed(2)),
    organic_revenue: parseFloat(v.organic.toFixed(2)),
    promo_pct: (v.promo + v.organic) > 0 ? parseFloat(((v.promo / (v.promo + v.organic)) * 100).toFixed(1)) : 0,
  })).sort((a, b) => b.promo_revenue - a.promo_revenue)

  const _result = {
    summary: {
      total_orders: totalOrders,
      promo_orders: promoOrders,
      organic_orders: organicOrders,
      promo_revenue_pct: totalRevenue > 0 ? parseFloat(((promoRevenue / totalRevenue) * 100).toFixed(1)) : 0,
      total_revenue: parseFloat(totalRevenue.toFixed(2)),
      promo_revenue: parseFloat(promoRevenue.toFixed(2)),
      organic_revenue: parseFloat(organicRevenue.toFixed(2)),
    },
    promotions,
    daily_trend,
    by_sku,
  }
  setCached(_cacheKey, _result)
  return _result

}
