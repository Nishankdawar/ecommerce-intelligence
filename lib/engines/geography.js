import { parseTSV, parseNum } from '../parsers.js'

function normalize(str) {
  return (str || '').trim().toUpperCase().replace(/\s+/g, ' ')
}

export async function runGeographyEngine() {
  const orders = parseTSV('Orders-Merchant.txt')
  const filtered = orders.filter(r => (r['order-status'] || '').toLowerCase() !== 'cancelled')

  const stateMap = {}
  const cityMap = {}
  const pincodeMap = {}
  const skuStateMap = {}

  for (const row of filtered) {
    const state = normalize(row['ship-state'])
    const city = normalize(row['ship-city'])
    const pincode = (row['ship-postal-code'] || '').trim()
    const price = parseNum(row['item-price'])
    const asin = (row['asin'] || '').trim()
    const sku = (row['sku'] || '').trim()

    if (!state) continue

    if (!stateMap[state]) stateMap[state] = { orders: 0, revenue: 0 }
    stateMap[state].orders++
    stateMap[state].revenue += price

    if (city) {
      const key = `${city}||${state}`
      if (!cityMap[key]) cityMap[key] = { city, state, orders: 0, revenue: 0 }
      cityMap[key].orders++
      cityMap[key].revenue += price
    }

    if (pincode) {
      const key = `${pincode}||${city}`
      if (!pincodeMap[key]) pincodeMap[key] = { pincode, city, orders: 0 }
      pincodeMap[key].orders++
    }

    if (asin) {
      if (!skuStateMap[asin]) skuStateMap[asin] = { sku, stateMap: {}, cityMap: {} }
      const sm = skuStateMap[asin]
      if (!sm.stateMap[state]) sm.stateMap[state] = 0
      sm.stateMap[state]++
      if (city) {
        if (!sm.cityMap[city]) sm.cityMap[city] = 0
        sm.cityMap[city]++
      }
    }
  }

  const by_state = Object.entries(stateMap).map(([state, v]) => ({
    state,
    orders: v.orders,
    revenue: parseFloat(v.revenue.toFixed(2)),
    avg_order_value: v.orders > 0 ? parseFloat((v.revenue / v.orders).toFixed(2)) : 0,
  })).sort((a, b) => b.orders - a.orders)

  const by_city = Object.values(cityMap).sort((a, b) => b.orders - a.orders).slice(0, 20).map(v => ({
    ...v,
    revenue: parseFloat(v.revenue.toFixed(2)),
  }))

  const by_pincode = Object.values(pincodeMap).sort((a, b) => b.orders - a.orders).slice(0, 50)

  const by_sku = Object.entries(skuStateMap).map(([asin, data]) => {
    const top_states = Object.entries(data.stateMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([state, orders]) => ({ state, orders }))
    const top_cities = Object.entries(data.cityMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([city, orders]) => ({ city, orders }))
    return { asin, sku: data.sku, top_states, top_cities }
  })

  return { by_state, by_city, by_pincode, by_sku }
}
