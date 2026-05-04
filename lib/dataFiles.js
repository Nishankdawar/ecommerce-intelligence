/**
 * Central definition of all data files the app needs.
 * Used by the status API, upload API, and the settings page.
 */

export const DATA_FILES = [
  {
    id: 'business_report_monthly',
    label: 'Business Report (Monthly)',
    filename: 'BusinessReport-monthly.csv',
    staleAfterDays: 30,
    icon: '📊',
    powers: ['SKU Health', 'B2B Opportunities', 'Listing Quality', 'Dashboard'],
    description: 'Monthly SKU-level sales, sessions, conversion, buy box data.',
    howToDownload: [
      'Go to Seller Central → Reports → Business Reports',
      'Click "Sales Dashboard" tab',
      'Select "By ASIN" from the dropdown',
      'Set date range to the current month',
      'Click "Download" → save the CSV file',
    ],
    // Auto-detection: columns that uniquely identify this file
    detectionColumns: ['(Child) ASIN', 'Sessions - Total', 'Unit Session Percentage'],
  },
  {
    id: 'business_report_daily',
    label: 'Business Report (Daily)',
    filename: 'BusinessReport-daily.csv',
    staleAfterDays: 1,
    icon: '📅',
    powers: ['Dashboard (daily snapshot)'],
    description: 'Single-day SKU performance snapshot. Download for today\'s date.',
    howToDownload: [
      'Go to Seller Central → Reports → Business Reports',
      'Click "Sales Dashboard" tab',
      'Select "By ASIN" from the dropdown',
      'Set start and end date to today',
      'Click "Download" → save the CSV file',
    ],
    detectionColumns: ['(Child) ASIN', 'Sessions - Total', 'Unit Session Percentage'],
    optional: true,
  },
  {
    id: 'inventory_ledger',
    label: 'Inventory Ledger',
    filename: 'InventoryLedger.csv',
    staleAfterDays: 3,
    icon: '📦',
    powers: ['Inventory Intelligence', 'SKU Health', 'Operational Alerts'],
    description: 'Daily stock levels, shipments, returns, and shrinkage per ASIN.',
    howToDownload: [
      'Go to Seller Central → Reports → Fulfillment',
      'Under "Inventory" section, click "Inventory Ledger"',
      'Set date range (last 30 days recommended)',
      'Click "Request Download" → wait for it to generate',
      'Download the CSV file',
    ],
    detectionColumns: ['Disposition', 'Ending Warehouse Balance', 'Customer Shipments'],
  },
  {
    id: 'all_listings',
    label: 'All Listings',
    filename: 'AllListings.txt',
    staleAfterDays: 14,
    icon: '🏷️',
    powers: ['B2B Opportunities', 'Listing Quality'],
    description: 'All active listings with prices, MRP, B2B price, fulfillment channel.',
    howToDownload: [
      'Go to Seller Central → Reports → Inventory Reports',
      'Select report type: "All Listings Report"',
      'Click "Request Report"',
      'Wait for it to appear in the list below',
      'Click "Download" to save the TXT file',
    ],
    detectionColumns: ['seller-sku', 'fulfillment-channel', 'maximum-retail-price'],
  },
  {
    id: 'orders_merchant',
    label: 'Orders Report',
    filename: 'Orders-Merchant.txt',
    staleAfterDays: 7,
    icon: '🛒',
    powers: ['Promotions', 'Geography', 'Dashboard (revenue trend)'],
    description: 'All merchant-fulfilled orders with geography, promotions, and revenue.',
    howToDownload: [
      'Go to Seller Central → Reports → Order Reports',
      'Click "Request Report" tab',
      'Select "Unshipped Orders" or "All Orders"',
      'Set date range (last 30 days)',
      'Click "Request Report" → download when ready',
    ],
    detectionColumns: ['amazon-order-id', 'purchase-date', 'ship-state'],
  },
  {
    id: 'mtr_b2c',
    label: 'MTR Report (B2C)',
    filename: 'MTR-B2C-March-2026.csv',
    staleAfterDays: 30,
    icon: '🧾',
    powers: ['Profitability', 'Refund P&L', 'Warehouse Optimization'],
    description: 'Monthly Tax Report for B2C — invoice-level GST, shipping, promo data.',
    howToDownload: [
      'Go to Seller Central → Reports → Tax Document Library',
      'Select "GST Reports" tab',
      'Click "Monthly Tax Report (MTR)"',
      'Select month and "B2C" type',
      'Click "Generate" → Download CSV when ready',
    ],
    detectionColumns: ['Transaction Type', 'Igst Rate', 'Ship From State', 'Ship To State'],
  },
  {
    id: 'mtr_b2b',
    label: 'MTR Report (B2B)',
    filename: 'MTR-B2B-March-2026.csv',
    staleAfterDays: 30,
    icon: '🏢',
    powers: ['Profitability', 'B2B Analysis'],
    description: 'Monthly Tax Report for B2B — includes customer GSTIN and IRN data.',
    howToDownload: [
      'Go to Seller Central → Reports → Tax Document Library',
      'Select "GST Reports" tab',
      'Click "Monthly Tax Report (MTR)"',
      'Select month and "B2B" type',
      'Click "Generate" → Download CSV when ready',
    ],
    detectionColumns: ['Transaction Type', 'Igst Rate', 'Customer Bill To Gstid'],
  },
  {
    id: 'settlement',
    label: 'Settlement Report',
    filename: 'settlement-march-2026.xlsx',
    staleAfterDays: 15,
    icon: '💰',
    powers: ['Settlement Reconciliation', 'Profitability', 'Fee Breakdown'],
    description: 'Bi-weekly payment settlement with all fees, TDS, TCS, and reimbursements.',
    howToDownload: [
      'Go to Seller Central → Reports → Payments',
      'Click "Settlement Reports"',
      'Find the latest settlement in the list',
      'Click "Download" on the flat file or Excel version',
    ],
    detectionColumns: ['settlement-id', 'amount-type', 'amount-description'],
  },
]

// How many days old before showing amber warning (50% of staleAfterDays)
export function getFileStatus(lastModified, staleAfterDays) {
  if (!lastModified) return 'missing'
  const daysSince = (Date.now() - new Date(lastModified).getTime()) / (1000 * 60 * 60 * 24)
  if (daysSince > staleAfterDays) return 'stale'
  if (daysSince > staleAfterDays * 0.5) return 'warning'
  return 'fresh'
}
