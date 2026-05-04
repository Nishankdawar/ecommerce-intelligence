import { parseXLSX, parseCSV, parseNum } from '../parsers.js'

function classifyDesc(desc, txType) {
  if (desc === 'Principal' || desc === 'Product Tax') return 'revenue'
  if (desc === 'Shipping' || desc === 'Shipping tax') return 'shipping'
  if (desc === 'Commission' || desc === 'Refund commission' ||
      desc === 'Commission CGST' || desc === 'Commission SGST' || desc === 'Commission IGST' ||
      desc === 'Refund commission IGST') return 'commission'
  if (desc.startsWith('FBA Weight Handling Fee') || desc.startsWith('FBA Pick & Pack Fee') ||
      desc.startsWith('FBAInboundTransportationFee')) return 'fba_fulfillment'
  if (desc.startsWith('Fixed closing fee')) return 'closing_fee'
  if (desc.startsWith('Technology Fee') || desc.startsWith('TechnologyFee')) return 'tech_fee'
  if (desc.includes('Easy Ship')) return 'easy_ship'
  if (desc.includes('Chargeback')) return 'chargeback'
  if (desc === 'Promo rebates' || desc === 'Shipping discount' ||
      desc === 'Product tax discount' || desc === 'Shipping tax discount') return 'promo'
  if (desc.startsWith('TCS')) return 'tcs'
  if (desc === 'TDS (Section 194-O)') return 'tds'
  if (['REVERSAL_REIMBURSEMENT','Reimbursement for Lost packages','FREE_REPLACEMENT_REFUND_ITEMS'].includes(desc)) return 'reimbursement'
  if (txType === 'Refund' && desc === 'Principal') return 'refund'
  return null
}

export async function runProfitabilityEngine() {
  const settlement = parseXLSX('settlement-march-2026.xlsx')
  const { rows: mtrRows } = parseAllMTRB2C()
  const mtr = mtrRows.filter(r => r['Transaction Type'] === 'Shipment')

  // Build per-SKU revenue map from MTR shipments
  const mtrRevenueMap = {}
  for (const row of mtr) {
    if ((row['Transaction Type'] || '') !== 'Shipment') continue
    const sku = (row['Sku'] || '').trim()
    if (!sku) continue
    if (!mtrRevenueMap[sku]) mtrRevenueMap[sku] = { title: row['Item Description'] || '', asin: row['Asin'] || '', units: 0 }
    mtrRevenueMap[sku].units += parseNum(row['Quantity'])
  }

  // Aggregate settlement by SKU
  const skuMap = {}

  function getSku(row) {
    return (row['sku'] || '').trim()
  }

  for (const row of settlement) {
    const sku = getSku(row)
    const desc = (row['amount-description'] || '').trim()
    const amt = parseNum(row['amount'])
    const txType = (row['transaction-type'] || '').trim()

    if (!sku || txType === 'Transfer' || !desc) continue

    if (!skuMap[sku]) skuMap[sku] = {
      sku,
      title: mtrRevenueMap[sku]?.title || '',
      asin: mtrRevenueMap[sku]?.asin || '',
      revenue: 0, shipping_revenue: 0,
      commission: 0, fba_fulfillment: 0, closing_fee: 0,
      tech_fee: 0, easy_ship: 0, chargeback: 0,
      promo: 0, tcs: 0, tds: 0, reimbursement: 0,
      refunds: 0, units: mtrRevenueMap[sku]?.units || 0,
    }

    const s = skuMap[sku]
    const category = classifyDesc(desc, txType)

    if (category === 'revenue') s.revenue += amt
    else if (category === 'shipping') s.shipping_revenue += amt
    else if (category === 'commission') s.commission += amt
    else if (category === 'fba_fulfillment') s.fba_fulfillment += amt
    else if (category === 'closing_fee') s.closing_fee += amt
    else if (category === 'tech_fee') s.tech_fee += amt
    else if (category === 'easy_ship') s.easy_ship += amt
    else if (category === 'chargeback') s.chargeback += amt
    else if (category === 'promo') s.promo += amt
    else if (category === 'tcs') s.tcs += amt
    else if (category === 'tds') s.tds += amt
    else if (category === 'reimbursement') s.reimbursement += amt
    else if (category === 'refund') s.refunds += amt
  }

  const skus = Object.values(skuMap).map(s => {
    const gross = s.revenue + s.shipping_revenue
    const total_fees = s.commission + s.fba_fulfillment + s.closing_fee +
      s.tech_fee + s.easy_ship + s.chargeback + s.promo + s.tcs + s.tds
    const net_proceeds = gross + total_fees + s.reimbursement + s.refunds // fees are negative
    const margin_pct = gross > 0 ? parseFloat(((net_proceeds / gross) * 100).toFixed(1)) : 0
    const fee_pct = gross > 0 ? parseFloat(((-total_fees / gross) * 100).toFixed(1)) : 0

    return {
      sku: s.sku, title: s.title, asin: s.asin, units: s.units,
      gross_revenue: parseFloat(gross.toFixed(2)),
      total_fees: parseFloat((-total_fees).toFixed(2)), // show as positive for display
      net_proceeds: parseFloat(net_proceeds.toFixed(2)),
      margin_pct,
      fee_pct,
      breakdown: {
        revenue: parseFloat(s.revenue.toFixed(2)),
        shipping_revenue: parseFloat(s.shipping_revenue.toFixed(2)),
        commission: parseFloat((-s.commission).toFixed(2)),
        fba_fulfillment: parseFloat((-s.fba_fulfillment).toFixed(2)),
        closing_fee: parseFloat((-s.closing_fee).toFixed(2)),
        tech_fee: parseFloat((-s.tech_fee).toFixed(2)),
        easy_ship: parseFloat((-s.easy_ship).toFixed(2)),
        promo: parseFloat((-s.promo).toFixed(2)),
        tcs: parseFloat((-s.tcs).toFixed(2)),
        tds: parseFloat((-s.tds).toFixed(2)),
        reimbursement: parseFloat(s.reimbursement.toFixed(2)),
        refunds: parseFloat(s.refunds.toFixed(2)),
      }
    }
  }).filter(s => s.gross_revenue > 0)

  skus.sort((a, b) => b.gross_revenue - a.gross_revenue)

  const totalGross = skus.reduce((s, r) => s + r.gross_revenue, 0)
  const totalFees = skus.reduce((s, r) => s + r.total_fees, 0)
  const totalNet = skus.reduce((s, r) => s + r.net_proceeds, 0)
  const avgMargin = totalGross > 0 ? parseFloat(((totalNet / totalGross) * 100).toFixed(1)) : 0
  const feeHeavy = skus.filter(s => s.fee_pct > 40).length

  return {
    summary: {
      total_gross_revenue: parseFloat(totalGross.toFixed(2)),
      total_fees_paid: parseFloat(totalFees.toFixed(2)),
      total_net_proceeds: parseFloat(totalNet.toFixed(2)),
      avg_margin_pct: avgMargin,
      total_skus: skus.length,
      fee_heavy_skus: feeHeavy,
    },
    skus,
  }
}
