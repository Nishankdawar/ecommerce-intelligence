import { getAccessToken } from '@/lib/spApi/auth'

// All report types this app needs, mapped to their purpose
const REQUIRED_REPORTS = [
  {
    type: 'GET_SALES_AND_TRAFFIC_REPORT',
    purpose: 'BusinessReport — SKU Health, B2B, Listing Quality, Dashboard',
    engine: 'skuHealth, b2b, listingQuality, digest',
  },
  {
    type: 'GET_LEDGER_DETAIL_VIEW_DATA',
    purpose: 'Inventory Ledger — stock levels, velocity, returns, shrinkage',
    engine: 'inventory, alerts',
  },
  {
    type: 'GET_AMAZON_FULFILLED_SHIPMENTS_DATA_GENERAL',
    purpose: 'FBA Shipments (Flex) — shipment delays, daily revenue trend',
    engine: 'alerts, digest',
  },
  {
    type: 'GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL',
    purpose: 'All Orders (MFN + FBA) — promotions, geography, revenue trend',
    engine: 'promotions, geography, digest',
  },
  {
    type: 'GET_FLAT_FILE_OPEN_LISTINGS_DATA',
    purpose: 'All Listings — prices, MRP, B2B price, fulfillment channel',
    engine: 'b2b, listingQuality',
  },
  {
    type: 'GET_GST_MTR_B2C_CUSTOM',
    purpose: 'MTR B2C — profitability, refunds, warehouse optimization',
    engine: 'profitability, refunds, warehouseOpt',
  },
  {
    type: 'GET_GST_MTR_B2B_CUSTOM',
    purpose: 'MTR B2B — B2B profitability and tax data',
    engine: 'profitability',
  },
  {
    type: 'GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE',
    purpose: 'Settlement Report — fees, TDS, TCS, net proceeds per order',
    engine: 'settlement, profitability, feeBreakdown',
  },
  {
    type: 'GET_MERCHANT_LISTINGS_ALL_DATA',
    purpose: 'Merchant Listings (alternative to open listings)',
    engine: 'listingQuality (fallback)',
  },
]

const NA_SANDBOX = 'https://sandbox.sellingpartnerapi-na.amazon.com'
const SANDBOX_MARKETPLACE = 'ATVPDKIKX0DER'

async function tryRequestReport(accessToken, reportType) {
  try {
    const res = await fetch(`${NA_SANDBOX}/reports/2021-06-30/reports`, {
      method: 'POST',
      headers: {
        'x-amz-access-token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reportType,
        marketplaceIds: [SANDBOX_MARKETPLACE],
        dataStartTime: '2024-01-01T00:00:00Z',
        dataEndTime: '2024-01-31T00:00:00Z',
      }),
    })

    const data = await res.json()

    if (res.status === 202) {
      return { status: 'AUTHORIZED', http: res.status, reportId: data?.reportId, note: 'Report requested successfully' }
    } else if (res.status === 400) {
      // 400 in sandbox often means the parameters hit a static payload mismatch
      // but the endpoint is accessible — check error code
      const code = data?.errors?.[0]?.code
      if (code === 'InvalidInput') {
        return { status: 'AUTHORIZED', http: res.status, note: 'Endpoint accessible (sandbox static payload mismatch — expected in sandbox)' }
      }
      return { status: 'UNKNOWN', http: res.status, error: data?.errors?.[0]?.message }
    } else if (res.status === 403) {
      const msg = data?.errors?.[0]?.message || ''
      return { status: 'UNAUTHORIZED', http: res.status, error: msg }
    } else {
      return { status: 'UNKNOWN', http: res.status, raw: data }
    }
  } catch (err) {
    return { status: 'ERROR', error: err.message }
  }
}

export async function GET() {
  // Step 1: Get token
  let accessToken
  try {
    accessToken = await getAccessToken()
  } catch (err) {
    return Response.json({ auth: 'FAILED', error: err.message }, { status: 500 })
  }

  // Step 2: Test each report type
  const reportResults = []
  for (const report of REQUIRED_REPORTS) {
    const result = await tryRequestReport(accessToken, report.type)
    reportResults.push({
      report_type: report.type,
      purpose: report.purpose,
      used_by: report.engine,
      ...result,
    })
  }

  const authorized = reportResults.filter(r => r.status === 'AUTHORIZED').length
  const unauthorized = reportResults.filter(r => r.status === 'UNAUTHORIZED').length

  return Response.json({
    auth: 'SUCCESS',
    environment: 'sandbox (NA)',
    note: 'AUTHORIZED = app has permission. UNAUTHORIZED = needs scope added in app settings.',
    summary: {
      total_needed: REQUIRED_REPORTS.length,
      authorized,
      unauthorized,
      unknown: REQUIRED_REPORTS.length - authorized - unauthorized,
    },
    reports: reportResults,
  }, { status: 200 })
}
