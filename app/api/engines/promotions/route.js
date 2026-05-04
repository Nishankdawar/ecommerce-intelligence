// Promotions module requires Orders Report (Orders-Merchant.txt)
// which is not in scope for current data set.
// Returns placeholder until Orders Report is added to new_data.
export async function GET() {
  return Response.json({
    _unavailable: true,
    _reason: 'Promotions module requires Orders Report. Not available in current dataset.',
    summary: { total_orders: 0, promo_orders: 0, organic_orders: 0, promo_revenue_pct: 0, total_revenue: 0, promo_revenue: 0, organic_revenue: 0 },
    promotions: [],
    daily_trend: [],
    by_sku: [],
  })
}
