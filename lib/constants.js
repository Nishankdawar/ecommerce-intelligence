// ─── SKU Health Score Dimensions ─────────────────────────────────────────────

export const SKU_HEALTH_DIMENSIONS = {
  conversion: {
    label: 'Conversion Score',
    weight: '25%',
    tooltip: 'How well this SKU converts visitors into buyers, benchmarked against your catalog average.',
    formula: 'score = min(100, (Unit Session % ÷ catalog avg %) × 50)',
    source: 'BusinessReport · Unit Session Percentage',
    thresholds: [
      { range: '2× catalog avg or more', score: '100' },
      { range: 'At catalog avg', score: '50' },
      { range: 'Below catalog avg', score: 'proportionally lower' },
    ],
    note: 'Amazon computes Unit Session % as Units Ordered ÷ Total Sessions (B2C + B2B combined).',
  },
  traffic: {
    label: 'Traffic Score',
    weight: '20%',
    tooltip: 'Where this SKU ranks among all your SKUs by total monthly sessions.',
    formula: 'score = (session rank ÷ total SKUs) × 100  [percentile rank]',
    source: 'BusinessReport · Sessions - Total',
    thresholds: [
      { range: 'Top 10% by sessions', score: '~90–100' },
      { range: 'Median', score: '~50' },
      { range: 'Bottom 10%', score: '~0–10' },
    ],
    note: 'Ranked against your own catalog. Absolute session count is not compared to competitors.',
  },
  buy_box: {
    label: 'Buy Box Score',
    weight: '20%',
    tooltip: 'Percentage of page views where this SKU held the Featured Offer (Buy Box). Losing Buy Box means competitor wins the sale.',
    formula: 'Featured Offer % → 95–100% = 100pts · 80–94% = 70pts · 60–79% = 40pts · <60% = 10pts',
    source: 'BusinessReport · Featured Offer Percentage',
    thresholds: [
      { range: '95–100%', score: '100' },
      { range: '80–94%', score: '70' },
      { range: '60–79%', score: '40' },
      { range: '<60%', score: '10' },
    ],
    note: 'FBA listings typically win Buy Box more consistently than MFN.',
  },
  return_rate: {
    label: 'Return Rate Score',
    weight: '15%',
    tooltip: 'Ratio of customer returns to total shipments. High return rates signal listing inaccuracy, quality issues, or wrong customer expectations.',
    formula: 'return rate = Customer Returns ÷ Customer Shipments (from InventoryLedger)',
    source: 'InventoryLedger · Customer Returns / Customer Shipments',
    thresholds: [
      { range: '<2%', score: '100' },
      { range: '2–5%', score: '70' },
      { range: '5–10%', score: '40' },
      { range: '>10%', score: '0' },
    ],
    note: 'Based on 2 days of inventory ledger data. Accuracy improves with more history.',
  },
  inventory_efficiency: {
    label: 'Inventory Efficiency Score',
    weight: '10%',
    tooltip: 'Days of stock remaining at current sell-through rate. Too low = stockout risk. Too high = capital tied up in slow-moving inventory.',
    formula: 'days cover = Ending Balance ÷ daily velocity  |  velocity = Shipments ÷ 2 days',
    source: 'InventoryLedger · Ending Warehouse Balance / Customer Shipments',
    thresholds: [
      { range: '7–60 days', score: '100 (healthy)' },
      { range: '60–90 days', score: '70 (overstocked)' },
      { range: '>90 days', score: '40 (excess / dead)' },
      { range: '<7 days', score: '30 (stockout risk)' },
      { range: 'No movement', score: '20' },
    ],
    note: 'Velocity calculated from 2-day window. Accuracy improves with more ledger history.',
  },
  b2b: {
    label: 'B2B Score',
    weight: '10%',
    tooltip: 'How effectively this SKU performs in the B2B (business buyer) segment relative to its B2C conversion.',
    formula: 'Compare B2B session % vs B2C session % · Score based on gap',
    source: 'BusinessReport · Sessions - Total - B2B / Unit Session % - B2B',
    thresholds: [
      { range: 'No B2B sessions', score: '20 (not visible to B2B buyers)' },
      { range: 'B2B sessions but zero sales', score: '30 (traffic but no conversion)' },
      { range: 'B2B conv ≥ 80% of B2C conv', score: '100 (healthy)' },
      { range: 'B2B conv ≥ 50% of B2C conv', score: '60 (underperforming)' },
      { range: 'B2B conv < 50% of B2C conv', score: '30 (severely underperforming)' },
    ],
    note: 'B2C is always derived as Total minus B2B — Amazon does not provide a direct B2C column.',
  },
}

export const SKU_HEALTH_OVERALL = {
  label: 'Overall Health Score',
  formula: 'Conversion×0.25 + Traffic×0.20 + Buy Box×0.20 + Return Rate×0.15 + Inventory×0.10 + B2B×0.10',
  classifications: [
    { label: 'INVEST', range: '≥ 70', color: '#16A34A', description: 'Strong across most dimensions. Prioritise stock, ads, and growth.' },
    { label: 'WATCH', range: '40–69', color: '#D97706', description: 'Underperforming in at least one key area. Investigate weak dimensions.' },
    { label: 'DISCONTINUE', range: '< 40', color: '#DC2626', description: 'Consistently poor performance. Evaluate listing improvement or removal.' },
  ],
}

// ─── Inventory Intelligence Terms ────────────────────────────────────────────

export const INVENTORY_TERMS = {
  daily_velocity: {
    label: 'Daily Velocity',
    tooltip: 'Average units shipped per day. Calculated as net shipments (shipments minus returns) divided by 2 days of available data.',
  },
  days_remaining: {
    label: 'Days Remaining',
    tooltip: 'Estimated days until stockout at current sell rate. = Current Stock ÷ Daily Velocity.',
  },
  dead_inventory: {
    label: 'Dead Inventory',
    tooltip: 'SKUs with zero net shipments across all available dates but positive stock on hand. These units are incurring FBA storage costs with no sales.',
  },
  storage_cost: {
    label: 'Storage Cost Estimate',
    tooltip: 'Estimated at ₹20 per unit per month (approximate FBA standard storage rate). Not exact — verify with actual FBA fee report.',
  },
}

// ─── General metric tooltips used across pages ────────────────────────────────

export const METRIC_TOOLTIPS = {
  b2c_derived: 'B2C is never a direct Amazon column. It is always computed as: Total − B2B.',
  sessions_total: 'Total sessions includes both B2C and B2B buyers. Amazon does not provide a separate B2C session column.',
  unit_session_pct: 'Units Ordered ÷ Sessions - Total. This is Amazon\'s reported conversion rate (includes B2B traffic in denominator).',
  featured_offer_pct: 'Percentage of page views where your listing held the Buy Box (Featured Offer). Losing this means a competitor won the sale.',
  days_cover: 'Days of stock remaining at current daily sell rate. Ideal range is 7–60 days.',
  return_rate: 'Customer Returns ÷ Customer Shipments from FBA Inventory Ledger.',
}
