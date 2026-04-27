# ecommerce-intelligence — POC Implementation Plan

---

## Data Available (POC)

| File | Coverage | Rows | Key Use |
|---|---|---|---|
| `BusinessReport-daily.csv` | Apr 26, 2026 (1 day) | 731 SKUs | Snapshot conversion, sessions, revenue |
| `BusinessReport-monthly.csv` | April 2026 (month aggregate) | 731 SKUs | Primary source for scoring |
| `InventoryLedger.csv` | Apr 21–22, 2026 (2 days) | 5,594 rows | Stock levels, velocity, returns |
| `AllListings.txt` | Current snapshot | 2,848 listings | Prices, MRP, B2B price, channel |
| `Orders-Merchant.txt` | Mar 31 – Apr 24, 2026 | 4,163 orders | Geography, promotions |
| `Flex-Shipments.csv` | Apr 1 – Apr 24, 2026 | 1,344 shipments | Shipment delays |

---

## Critical Data Clarifications

### 1. B2C is Never a Direct Column — Always Derived

In both Business Report files, Amazon never provides a pure "B2C" column. The naming is:
- `Sessions - Total` = **grand total (B2C + B2B combined)**
- `Sessions - Total - B2B` = **B2B portion only**
- `B2C = Total - B2B` ← must always be computed by subtraction

This applies to **every metric pair** in the file:

| Metric | Total Column | B2B Column | B2C (derived) |
|---|---|---|---|
| Sessions | Sessions - Total | Sessions - Total - B2B | Total − B2B |
| Page Views | Page Views - Total | Page Views - Total - B2B | Total − B2B |
| Units Ordered | Units Ordered | Units Ordered - B2B | Total − B2B |
| Revenue | Ordered Product Sales | Ordered Product Sales - B2B | Total − B2B |
| Order Items | Total Order Items | Total Order Items - B2B | Total − B2B |

**All engine calculations must derive B2C as (Total - B2B), never use Total as a proxy for B2C.**

---

### 2. Daily Revenue — What We Have vs What We Don't

**Accurate daily revenue per SKU** requires a Business Report downloaded for that specific day. We only have one: **April 26, 2026**.

The monthly Business Report (`BusinessReport-monthly.csv`) is a **flat aggregate** — one row per SKU, all of April summed into a single number. It has no date column and cannot be broken down by day.

**What we can approximate for daily revenue trend (Apr 1–24):**

| Source | Channel Covered | Date Range | How |
|---|---|---|---|
| `Orders-Merchant.txt` | MFN orders only | Mar 31 – Apr 24 | Group by `purchase-date`, sum `item-price` |
| `Flex-Shipments.csv` | FBA shipments | Apr 1 – Apr 24 | Group by `Shipment Creation Date`, sum `Order Value` |

Combining both → **approximate daily total revenue for Apr 1–24**, covering both FBA and MFN.

**Limitation:** Shipment Creation Date in FLEX ≠ exact order date (can differ by 1–2 days). Numbers will be directionally correct but not identical to an official Business Report.

**In the UI:** daily revenue trend chart (Apr 1–24) built from MERCHANT + FLEX combined, labeled as *"Estimated from order data. Accuracy improves with daily Business Reports via SP-API."*

**For SKU-level daily breakdown:** not possible from current data. Only the single Apr 26 Business Report gives SKU-level revenue for a specific day. Post-POC, SP-API pulls a daily report per day automatically.

---

## App Structure

```
ecommerce-intelligence/
├── app/
│   ├── layout.js                          ← root layout (sidebar nav)
│   ├── page.jsx                           ← redirects to /dashboard
│   ├── globals.css
│   ├── dashboard/
│   │   └── page.jsx                       ← Module 10: Snapshot Digest (home)
│   ├── sku-health/
│   │   └── page.jsx                       ← Module 1: SKU Health Score
│   ├── inventory/
│   │   └── page.jsx                       ← Module 2: Inventory Intelligence
│   ├── promotions/
│   │   └── page.jsx                       ← Module 4: Promotion Attribution
│   ├── geography/
│   │   └── page.jsx                       ← Module 5: Geographic Demand
│   ├── b2b/
│   │   └── page.jsx                       ← Module 7: B2B Opportunities
│   ├── listing-quality/
│   │   └── page.jsx                       ← Module 8: Listing Quality
│   ├── alerts/
│   │   └── page.jsx                       ← Module 9: Operational Alerts
│   └── api/
│       └── engines/
│           ├── sku-health/route.js        ← runs engine → writes sku_health_scores.json
│           ├── inventory/route.js         ← runs engine → writes inventory_intelligence.json
│           ├── promotions/route.js        ← runs engine → writes promotion_attribution.json
│           ├── geography/route.js         ← runs engine → writes geographic_demand.json
│           ├── b2b/route.js               ← runs engine → writes b2b_opportunities.json
│           ├── listing-quality/route.js   ← runs engine → writes listing_quality.json
│           ├── alerts/route.js            ← runs engine → writes alerts.json
│           └── digest/route.js            ← runs engine → writes digest.json
├── lib/
│   ├── parsers.js                         ← CSV/TSV/XLSX parsing (papaparse + xlsx)
│   ├── formatters.js                      ← currency, number, date formatting
│   └── engines/
│       ├── skuHealth.js                   ← scoring logic
│       ├── inventory.js                   ← stockout + dead inventory logic
│       ├── promotions.js                  ← promo attribution logic
│       ├── geography.js                   ← geo aggregation logic
│       ├── b2b.js                         ← B2B opportunity logic
│       ├── listingQuality.js              ← listing scoring logic
│       ├── alerts.js                      ← alert generation logic
│       └── digest.js                      ← digest assembly logic
├── components/
│   ├── ui/                                ← Radix UI based components (shadcn pattern)
│   ├── MetricCard.jsx
│   ├── DataTable.jsx
│   ├── AlertCard.jsx
│   └── charts/
│       ├── BarChart.jsx                   ← Recharts wrapper
│       ├── DonutChart.jsx                 ← Recharts wrapper
│       ├── RadarChart.jsx                 ← Recharts wrapper
│       └── IndiaMap.jsx                   ← react-simple-maps wrapper
├── data/
│   ├── raw/                               ← source files placed here
│   │   ├── BusinessReport-daily.csv
│   │   ├── BusinessReport-monthly.csv
│   │   ├── InventoryLedger.csv
│   │   ├── AllListings.txt
│   │   ├── Orders-Merchant.txt
│   │   └── Flex-Shipments.csv
│   └── processed/                         ← JSON outputs written by engines
│       ├── sku_health_scores.json
│       ├── inventory_intelligence.json
│       ├── promotion_attribution.json
│       ├── geographic_demand.json
│       ├── b2b_opportunities.json
│       ├── listing_quality.json
│       ├── alerts.json
│       └── digest.json
├── package.json
├── tailwind.config.js
├── jsconfig.json
└── next.config.js
```

**Tech Stack:** Next.js 14 (App Router) + React 18 + JavaScript (JSX) + Tailwind CSS
**UI Components:** Radix UI primitives + Lucide React icons + Sonner (toasts)
**Charts:** Recharts (bar, line, donut, radar)
**Maps:** react-simple-maps (India state choropleth)
**File Parsing:** papaparse (CSV/TSV) + xlsx (Excel)
**Storage:** JSON files in `data/processed/` (no DB for POC)
**Data Processing:** Next.js API routes in `app/api/engines/` — each engine runs server-side, reads raw files from `data/raw/`, computes results, writes JSON to `data/processed/`

---

## Module 1 — SKU Health Score Engine

### Data Sources
- `BusinessReport-monthly.csv` — primary scoring data
- `InventoryLedger.csv` — return rate + inventory turnover

### Exact Columns Used

**From BusinessReport-monthly.csv:**
| Column | Why |
|---|---|
| `(Child) ASIN` | Primary join key across all files |
| `SKU` | Human-readable identifier |
| `Title` | Display name on UI |
| `Sessions - Total` | Traffic volume — input to Traffic Score |
| `Unit Session Percentage` | Conversion rate — input to Conversion Score |
| `Featured Offer Percentage` | Buy Box win rate — input to Buy Box Score |
| `Units Ordered` | Sales volume |
| `Ordered Product Sales` | Revenue (used for revenue efficiency metric) |
| `Units Ordered - B2B` | B2B sales volume |
| `Sessions - Total - B2B` | B2B traffic |
| `Ordered Product Sales - B2B` | B2B revenue |
| `Unit Session Percentage - B2B` | B2B conversion rate |

**From InventoryLedger.csv:**
| Column | Why |
|---|---|
| `ASIN` | Join key to business report |
| `Customer Returns` | Numerator for return rate |
| `Customer Shipments` | Denominator for return rate |
| `Ending Warehouse Balance` | Current stock (used in turnover calc) |
| `Disposition` | Filter to SELLABLE only |

### Calculations

```
NOTE ON B2C DERIVATION:
  All B2C figures must be computed as (Total - B2B). Amazon never provides
  a direct B2C column. Example:
    b2c_sessions = (Sessions - Total) - (Sessions - Total - B2B)
    b2c_revenue  = (Ordered Product Sales) - (Ordered Product Sales - B2B)
    b2c_units    = (Units Ordered) - (Units Ordered - B2B)

1. Conversion Score (0-100)
   raw = Unit Session Percentage (strip % sign, parse as float)
   → This is Amazon's computed rate = Units Ordered / Sessions - Total (already total-based)
   catalog_avg = mean of all Unit Session Percentages across all SKUs
   score = min(100, (raw / catalog_avg) * 50)
   → Scoring against own catalog average (true category avg not available)

2. Traffic Score (0-100)
   raw = Sessions - Total (monthly)
   percentile_rank = rank of this SKU among all SKUs by sessions
   score = percentile_rank / total_skus * 100

3. Buy Box Score (0-100)
   raw = Featured Offer Percentage (parse as float)
   score:  95-100% → 100
           80-94%  → 70
           60-79%  → 40
           <60%    → 10

4. Return Rate Score (0-100)
   per_asin_returns   = sum(Customer Returns) where ASIN matches
   per_asin_shipments = sum(Customer Shipments) where ASIN matches
   return_rate = per_asin_returns / per_asin_shipments (if shipments > 0, else 0)
   score:  <2%  → 100
           2-5% → 70
           5-10%→ 40
           >10% → 0

5. Inventory Efficiency Score (0-100)
   ending_balance = Ending Warehouse Balance (latest date, SELLABLE only)
   daily_velocity = sum(Customer Shipments) / 2 days
   days_cover = ending_balance / daily_velocity (if velocity > 0)
   score:  7-60 days cover  → 100  (healthy: not too lean, not bloated)
           60-90 days       → 70
           >90 days         → 40   (overstocked / dead)
           <7 days          → 30   (stockout risk)
           velocity = 0     → 20   (no movement)

6. B2B Score (0-100)
   b2b_sessions = Sessions - Total - B2B
   b2b_units    = Units Ordered - B2B
   b2b_conv     = Unit Session Percentage - B2B
   b2c_conv     = Unit Session Percentage
   score:
     b2b_sessions = 0              → 20  (not visible to B2B)
     b2b_sessions > 0, units = 0  → 30  (traffic but no sales)
     b2b_conv >= b2c_conv * 0.8   → 100 (healthy)
     b2b_conv >= b2c_conv * 0.5   → 60  (underperforming)
     b2b_conv < b2c_conv * 0.5    → 30  (severely underperforming)

OVERALL SCORE = weighted average:
  Conversion Score     × 0.25
  Traffic Score        × 0.20
  Buy Box Score        × 0.20
  Return Rate Score    × 0.15
  Inventory Efficiency × 0.10
  B2B Score            × 0.10

CLASSIFICATION:
  Score ≥ 70  → INVEST   (green)
  Score 40-69 → WATCH    (yellow)
  Score < 40  → DISCONTINUE (red)
```

### JSON Output (`processed/sku_health_scores.json`)
```json
[
  {
    "asin": "B09G393ZCR",
    "sku": "COPPER-STRIP-0.5-ST1",
    "title": "...",
    "overall_score": 78,
    "classification": "INVEST",
    "scores": {
      "conversion": 85,
      "traffic": 90,
      "buy_box": 100,
      "return_rate": 95,
      "inventory_efficiency": 60,
      "b2b": 70
    },
    "metrics": {
      "sessions": 2867,
      "conversion_rate": 19.04,
      "catalog_avg_conversion": 14.2,
      "buy_box_pct": 99.51,
      "return_rate": 1.2,
      "days_cover": 42,
      "b2b_revenue": 8372,
      "b2b_conversion": 19.05
    }
  }
]
```

### UI — Page: SKU Health
- **Top summary bar:** 4 metric cards — Total SKUs | INVEST count | WATCH count | DISCONTINUE count
- **Main table:** sortable columns — SKU, Title, Overall Score (badge), Conversion, Traffic, Buy Box%, Return Rate, Days Cover, B2B%, Classification
- **Filters:** Classification dropdown (All / INVEST / WATCH / DISCONTINUE)
- **Row click → detail drawer:** radar chart of 6 dimension scores + metric values + recommended action text
- **Recommended action text logic:**
  - INVEST: "Strong performer. Increase ad budget and ensure adequate inventory."
  - WATCH + low conversion: "Conversion below catalog average. Review listing quality and pricing."
  - WATCH + low traffic: "Low session volume. Consider running a deal or improving keywords."
  - DISCONTINUE + return rate high: "High return rate. Review product quality and listing accuracy."
  - DISCONTINUE + no movement: "No sales movement. Evaluate liquidation or removal."

---

## Module 2 — Inventory Intelligence + Replenishment Calendar

### Data Sources
- `InventoryLedger.csv` — all calculations

### Exact Columns Used

| Column | Why |
|---|---|
| `Date` | Group by date to compute per-day metrics |
| `ASIN` | Product identifier |
| `MSKU` | Human-readable SKU |
| `FNSKU` | Amazon fulfillment unit ID |
| `Title` | Display name |
| `Disposition` | Filter: use SELLABLE only for active stock |
| `Ending Warehouse Balance` | Current sellable stock |
| `Customer Shipments` | Units shipped = consumption per day |
| `Customer Returns` | Units returned = reduces net consumption |
| `Receipts` | Incoming stock |
| `Lost` | Shrinkage tracking |
| `Damaged` | Shrinkage tracking |
| `Location` | Warehouse code (TSWX, CCX1 etc.) |

### Calculations

```
Per ASIN (SELLABLE disposition only):

current_stock    = Ending Warehouse Balance on latest date
daily_velocity   = mean(Customer Shipments - Customer Returns) across available days
                   → if result < 0, use 0
days_remaining   = current_stock / daily_velocity  (if velocity = 0 → "∞ / No movement")
stockout_date    = today + days_remaining

STOCKOUT STATUS:
  days_remaining < 7    → CRITICAL (red)
  days_remaining 7-15   → WARNING  (orange)
  days_remaining 15-30  → WATCH    (yellow)
  days_remaining > 30   → OK       (green)
  velocity = 0          → DEAD     (grey)

DEAD INVENTORY:
  Customer Shipments = 0 across ALL available dates AND Ending Warehouse Balance > 0
  days_since_any_movement = computed from ledger (units stuck)
  storage_cost_estimate = Ending Warehouse Balance × 20 (₹20/unit/month approx FBA rate)

REPLENISHMENT RECOMMENDATION:
  if days_remaining < 15:
    recommended_qty   = daily_velocity × 30   (30-day supply)
    reorder_by_date   = stockout_date - 10    (10-day lead time buffer, configurable)
    urgency_level     = CRITICAL or WARNING based on days_remaining

SHRINKAGE TRACKING:
  lost_units    = sum(Lost) per ASIN over available period
  damaged_units = sum(Damaged) per ASIN over available period
```

### JSON Output (`processed/inventory_intelligence.json`)
```json
{
  "summary": {
    "total_skus_tracked": 450,
    "critical_stockout": 12,
    "warning_stockout": 28,
    "dead_inventory_skus": 67,
    "dead_inventory_units": 4230,
    "estimated_dead_storage_cost_monthly": 84600
  },
  "skus": [
    {
      "asin": "B09G393ZCR",
      "msku": "COPPER-STRIP-0.5-ST1",
      "title": "...",
      "current_stock": 145,
      "daily_velocity": 9.5,
      "days_remaining": 15,
      "stockout_date": "2026-05-11",
      "status": "WARNING",
      "recommended_qty": 285,
      "reorder_by": "2026-05-01",
      "lost_units": 0,
      "damaged_units": 1,
      "location": "TSWX"
    }
  ],
  "dead_inventory": [
    {
      "asin": "...",
      "msku": "...",
      "title": "...",
      "units_stuck": 45,
      "estimated_monthly_cost": 900,
      "recommended_action": "LOWER PRICE",
      "action_reason": "Sessions present but conversion low, discount headroom exists"
    }
  ]
}
```

### UI — Page: Inventory Intelligence
- **Top summary cards:** Critical SKUs | Warning SKUs | Dead Inventory SKUs | Dead Inventory Cost (₹/month)
- **Inventory Status Table:** ASIN, Title, Stock, Daily Velocity, Days Remaining, Stockout Date, Status badge, Recommended Qty, Reorder By
- **Color-coded rows:** red (critical), orange (warning), yellow (watch), green (ok), grey (dead)
- **Replenishment Calendar:** weekly calendar view showing which SKUs need restock dispatched each week
- **Dead Inventory Section:** separate table — SKU, Units Stuck, Monthly Storage Cost, Recommended Action (LOWER PRICE / RUN DEAL / INITIATE REMOVAL) with reason
- **Shrinkage Tracker:** small table of SKUs with lost/damaged units

---

## Module 4 — Promotion Attribution

### Data Sources
- `Orders-Merchant.txt` — all calculations

### Exact Columns Used

| Column | Why |
|---|---|
| `amazon-order-id` | Unique order identifier |
| `purchase-date` | For daily trend chart |
| `asin` | Product |
| `sku` | Product |
| `product-name` | Display |
| `item-price` | Revenue per order line |
| `quantity` | Units sold |
| `promotion-ids` | Comma-separated list of promo IDs applied to order |
| `is-business-order` | Flag B2B orders separately |
| `order-status` | Filter: exclude Cancelled orders |
| `item-promotion-discount` | Discount value given (if populated) |

### Calculations

```
Filter: order-status != 'Cancelled'

For each order:
  has_promotion = promotion-ids is not empty/null
  promo_list    = split promotion-ids by comma → list of individual promo IDs

OVERALL:
  total_orders        = count distinct amazon-order-id
  promo_orders        = count orders where has_promotion = true
  organic_orders      = count orders where has_promotion = false
  promo_revenue       = sum(item-price) for promo orders
  organic_revenue     = sum(item-price) for organic orders
  promo_revenue_pct   = promo_revenue / (promo_revenue + organic_revenue) * 100

PER PROMOTION ID:
  order_count         = count orders containing this promo ID
  revenue_contributed = sum(item-price) for orders with this promo ID
  units_sold          = sum(quantity) for orders with this promo ID
  revenue_pct         = revenue_contributed / total_revenue * 100
  discount_given      = sum(item-promotion-discount) if column populated

DAILY TREND:
  Group by date(purchase-date):
    promo_orders_per_day
    organic_orders_per_day
    promo_revenue_per_day

PER ASIN PROMO BREAKDOWN:
  For each ASIN: promo revenue vs organic revenue split
```

### JSON Output (`processed/promotion_attribution.json`)
```json
{
  "summary": {
    "total_orders": 4100,
    "promo_orders": 2460,
    "organic_orders": 1640,
    "promo_revenue_pct": 58.3,
    "total_revenue": 1840000,
    "promo_revenue": 1072200,
    "organic_revenue": 767800
  },
  "promotions": [
    {
      "promo_id": "BXGY-AIRZH5VM0RNBH-BUY_2_GET_10_PERCENT-...",
      "order_count": 890,
      "revenue": 420000,
      "units": 1100,
      "revenue_pct": 22.8,
      "discount_given": 46000
    }
  ],
  "daily_trend": [
    { "date": "2026-04-01", "promo_orders": 85, "organic_orders": 62, "promo_revenue": 38000 }
  ]
}
```

### UI — Page: Promotion Attribution
- **Summary cards:** Total Orders | Promo Orders % | Organic Orders % | Total Revenue | Promo Revenue | Organic Revenue
- **Risk banner:** if promo_revenue_pct > 50% → "⚠ Over 50% of revenue is promotion-dependent. Plan for revenue drop when promos end."
- **Donut chart:** Promo vs Organic revenue split
- **Daily trend stacked bar chart:** promo orders vs organic orders per day
- **Promotions table:** Promo ID (truncated with tooltip), Orders, Revenue, Units, Revenue %, Discount Given
- **Per-SKU promo dependency table:** SKU, Promo Revenue, Organic Revenue, Promo %

---

## Module 5 — Geographic Demand Intelligence

### Data Sources
- `Orders-Merchant.txt`

### Exact Columns Used

| Column | Why |
|---|---|
| `amazon-order-id` | Dedup orders |
| `ship-state` | State-level aggregation |
| `ship-city` | City-level aggregation |
| `ship-postal-code` | Pin code level |
| `asin` | Product |
| `sku` | Product |
| `product-name` | Display |
| `item-price` | Revenue |
| `quantity` | Units |
| `order-status` | Filter Cancelled |

### Calculations

```
Filter: order-status != 'Cancelled'
Normalize: strip/upper ship-state and ship-city for consistency

STATE LEVEL:
  order_count_by_state  = count orders per ship-state
  revenue_by_state      = sum(item-price) per ship-state
  avg_order_value       = revenue / orders per state

CITY LEVEL (top 20):
  order_count_by_city   = count orders per ship-city
  revenue_by_city       = sum(item-price) per ship-city

PIN CODE LEVEL:
  top_50_pincodes       = top 50 postal codes by order count

PER SKU GEOGRAPHY:
  For each ASIN: top 5 states by order count
  For each ASIN: top 5 cities by order count
```

### JSON Output (`processed/geographic_demand.json`)
```json
{
  "by_state": [
    { "state": "MAHARASHTRA", "orders": 820, "revenue": 342000, "avg_order_value": 417 }
  ],
  "by_city": [
    { "city": "MUMBAI", "state": "MAHARASHTRA", "orders": 340, "revenue": 148000 }
  ],
  "by_pincode": [
    { "pincode": "400097", "city": "MUMBAI", "orders": 45 }
  ],
  "by_sku": [
    {
      "asin": "B09G393ZCR",
      "sku": "COPPER-STRIP-0.5-ST1",
      "top_states": [{ "state": "MAHARASHTRA", "orders": 120 }],
      "top_cities": [{ "city": "MUMBAI", "orders": 48 }]
    }
  ]
}
```

### UI — Page: Geographic Demand
- **Note banner:** "Based on merchant-fulfilled orders only. FBA order geography available after SP-API integration."
- **India state choropleth map** (react-simple-maps) — color intensity = order count per state
- **Top 10 States table:** State, Orders, Revenue, Avg Order Value
- **Top 10 Cities table:** City, State, Orders, Revenue
- **SKU filter dropdown:** select a specific SKU → map and tables update to show that SKU's geography
- **Insight card:** "Top 3 states drive X% of revenue" auto-computed

---

## Module 7 — B2B Opportunity Scorer

### Data Sources
- `BusinessReport-monthly.csv` — B2B traffic and conversion data
- `AllListings.txt` — B2B pricing configuration

### Exact Columns Used

**From BusinessReport-monthly.csv:**
| Column | Why |
|---|---|
| `(Child) ASIN` | Join key |
| `SKU` | Identifier |
| `Title` | Display |
| `Sessions - Total` | Total traffic |
| `Sessions - Total - B2B` | B2B buyer traffic |
| `Units Ordered` | B2C units |
| `Units Ordered - B2B` | B2B units |
| `Unit Session Percentage` | B2C conversion rate |
| `Unit Session Percentage - B2B` | B2B conversion rate |
| `Ordered Product Sales` | B2C revenue |
| `Ordered Product Sales - B2B` | B2B revenue |

**From AllListings.txt:**
| Column | Why |
|---|---|
| `seller-sku` | Join key (matches SKU in business report) |
| `Business Price` | Is B2B price configured? |
| `Quantity Lower Bound 1` | Quantity tier 1 configured? |
| `Quantity Price 1` | Quantity tier 1 price |
| `Quantity Lower Bound 2` | Quantity tier 2 configured? |
| `Quantity Price 2` | Quantity tier 2 price |
| `maximum-retail-price` | MRP (context for pricing) |

### Calculations

```
JOIN: business report SKU → listings seller-sku

Per SKU:
  b2b_sessions     = Sessions - Total - B2B (parse number, remove commas)
  b2b_units        = Units Ordered - B2B
  b2c_conv         = Unit Session Percentage (parse %, float)
  b2b_conv         = Unit Session Percentage - B2B (parse %, float)
  b2b_revenue      = Ordered Product Sales - B2B (parse ₹, float)
  b2c_revenue      = Ordered Product Sales (parse ₹, float)
  b2b_price_set    = Business Price is not empty
  qty_tiers_set    = Quantity Lower Bound 1 is not empty
  conv_gap         = b2c_conv - b2b_conv  (positive = B2B underperforming vs B2C)
  b2b_revenue_pct  = b2b_revenue / (b2b_revenue + b2c_revenue) * 100

OPPORTUNITY TAG:
  b2b_sessions = 0                      → "B2B NOT VISIBLE"
  b2b_sessions > 0, b2b_units = 0      → "UNTAPPED — Traffic, Zero Sales"
  b2b_sessions > 0, not b2b_price_set  → "MISSING B2B PRICING"
  conv_gap > 5 (i.e. b2b conv << b2c)  → "UNDERPERFORMING — Fix Pricing Tiers"
  b2b_conv >= b2c_conv * 0.8           → "B2B HEALTHY"

OPPORTUNITY SCORE (0-100, higher = more opportunity to unlock):
  "B2B NOT VISIBLE"    → 90  (big opportunity, nothing configured)
  "UNTAPPED"           → 85
  "MISSING PRICING"    → 80
  "UNDERPERFORMING"    → 60
  "B2B HEALTHY"        → 10  (not an opportunity, already working)

CATALOG SUMMARY:
  total_b2b_revenue       = sum(b2b_revenue)
  total_revenue           = sum(b2b_revenue + b2c_revenue)
  b2b_revenue_pct         = total_b2b_revenue / total_revenue * 100
  skus_missing_pricing    = count where b2b_price_set = false AND b2b_sessions > 0
  skus_untapped           = count where b2b_units = 0 AND b2b_sessions > 0
```

### JSON Output (`processed/b2b_opportunities.json`)
```json
{
  "summary": {
    "total_b2b_revenue": 420000,
    "b2b_revenue_pct": 8.4,
    "skus_missing_b2b_pricing": 34,
    "skus_untapped": 18,
    "skus_healthy": 120
  },
  "skus": [
    {
      "asin": "B09G393ZCR",
      "sku": "COPPER-STRIP-0.5-ST1",
      "title": "...",
      "b2b_sessions": 147,
      "b2b_units": 28,
      "b2c_conv": 19.04,
      "b2b_conv": 19.05,
      "conv_gap": -0.01,
      "b2b_revenue": 8372,
      "b2b_price_set": true,
      "qty_tiers_set": false,
      "opportunity_tag": "B2B HEALTHY",
      "opportunity_score": 10
    }
  ]
}
```

### UI — Page: B2B Opportunities
- **Summary cards:** Total B2B Revenue | B2B % of Total Revenue | SKUs Missing B2B Pricing | Untapped SKUs
- **Opportunity table:** sorted by Opportunity Score desc — SKU, B2B Sessions, B2B Conv%, B2C Conv%, Conv Gap, B2B Revenue, B2B Price Set (✓/✗), Qty Tiers (✓/✗), Opportunity Tag (color badge)
- **Filter:** by Opportunity Tag
- **Bar chart:** Top 15 SKUs by B2B revenue
- **Action insight card:** "34 SKUs have B2B traffic but no B2B pricing configured. Setting B2B prices on these could unlock estimated ₹X in additional monthly revenue." (estimated as avg B2B order value × B2B sessions × assumed 5% conversion lift)

---

## Module 8 — Listing Quality Calculator

### Data Sources
- `AllListings.txt` — listing quality inputs
- `BusinessReport-monthly.csv` — conversion rate (outcome variable for correlation)

### Exact Columns Used

**From AllListings.txt:**
| Column | Why |
|---|---|
| `seller-sku` | Primary identifier |
| `asin1` | Join key to business report |
| `item-name` | Title — measure character length, word count |
| `item-description` | Description — present/absent, length, detect duplicates |
| `price` | Current selling price |
| `maximum-retail-price` | MRP — set or not (affects perceived discount) |
| `Business Price` | B2B price — set or not |
| `fulfillment-channel` | AMAZON_IN (FBA) vs DEFAULT (MFN) |
| `quantity` | Stock for MFN items |

**From BusinessReport-monthly.csv:**
| Column | Why |
|---|---|
| `(Child) ASIN` | Join key |
| `Unit Session Percentage` | Conversion rate — outcome to correlate against |
| `Sessions - Total` | Traffic volume — for revenue impact calculation |
| `Ordered Product Sales` | Revenue — for revenue impact calculation |

### Calculations

```
JOIN: AllListings asin1 → BusinessReport (Child) ASIN

Per SKU quality scoring:

1. TITLE SCORE (0-100)
   title_len = len(item-name)
   title_len >= 100  → 100
   title_len 80-99   → 80
   title_len 50-79   → 50
   title_len < 50    → 20

2. DESCRIPTION SCORE (0-100)
   desc_present   = item-description is not empty
   desc_len       = len(item-description)
   desc_hash      = hash(strip(item-description))   ← detect copy-paste
   duplicate_desc = same hash exists in another SKU

   not present    → 0
   duplicate      → 20  (copy-pasted from another SKU)
   len < 100      → 40
   len 100-200    → 70
   len > 200      → 100

3. MRP SCORE (0-100)
   maximum-retail-price is not empty AND > price  → 100
   maximum-retail-price = price (no discount)     → 50
   maximum-retail-price is empty                  → 0

4. B2B PRICE SCORE (0-100)
   Business Price is not empty  → 100
   Business Price is empty      → 0

5. FULFILLMENT SCORE (0-100)
   fulfillment-channel = AMAZON_IN  → 100  (FBA — Prime badge, faster delivery)
   fulfillment-channel = DEFAULT    → 30   (MFN — no Prime badge)

OVERALL LISTING QUALITY SCORE = weighted average:
  Title Score       × 0.25
  Description Score × 0.25
  MRP Score         × 0.20
  B2B Price Score   × 0.15
  Fulfillment Score × 0.15

CORRELATION ANALYSIS (catalog-wide):
  For SKUs that exist in both files (join hit):
    Compute Pearson correlation between each quality dimension and conversion rate
    This tells us: "MRP set is associated with X% higher conversion on average"

REVENUE IMPACT PER SKU:
  For each quality gap in a SKU:
    avg_sessions     = Sessions - Total (monthly)
    avg_order_value  = Ordered Product Sales / Units Ordered
    conv_rate        = Unit Session Percentage / 100

    If MRP not set AND correlation shows +K% conversion for MRP-set SKUs:
      additional_conversions = avg_sessions × avg_conv × K
      revenue_impact         = additional_conversions × avg_order_value

    Same logic for description missing, MFN → FBA, B2B price missing

CATALOG-WIDE ISSUES:
  Count SKUs with: missing description, missing MRP, missing B2B price, MFN channel, duplicate description
```

### JSON Output (`processed/listing_quality.json`)
```json
{
  "summary": {
    "total_listings": 2848,
    "avg_quality_score": 62,
    "missing_mrp": 234,
    "missing_description": 89,
    "duplicate_descriptions": 312,
    "mfn_listings": 145,
    "missing_b2b_price": 678
  },
  "correlations": {
    "mrp_set_conv_lift": 0.18,
    "description_present_conv_lift": 0.12,
    "fba_vs_mfn_conv_lift": 0.31
  },
  "skus": [
    {
      "sku": "COPPER-STRIP-0.5-ST1",
      "asin": "B09G393ZCR",
      "title": "...",
      "overall_score": 85,
      "scores": {
        "title": 100,
        "description": 20,
        "mrp": 100,
        "b2b_price": 100,
        "fulfillment": 100
      },
      "issues": ["duplicate_description"],
      "conversion_rate": 19.04,
      "sessions": 2867,
      "estimated_revenue_impact_monthly": 12400
    }
  ]
}
```

### UI — Page: Listing Quality
- **Summary cards:** Avg Quality Score | SKUs Missing MRP | Duplicate Descriptions | MFN Listings | Missing B2B Price
- **Correlation insight bar:** "FBA listings convert 31% better than MFN. 145 of your listings are MFN."
- **Quality table:** sortable — SKU, Title, Quality Score (badge), Title✓, Desc✓, MRP✓, B2B✓, FBA✓, Conversion Rate, Revenue Impact (₹/month)
- **Sort by Revenue Impact** to show highest-priority fixes first
- **Issues filter:** show only SKUs with specific issue (e.g. "Missing MRP")
- **Top issues summary panel:** ranked list of issue types by total revenue impact across all affected SKUs

---

## Module 9 — Operational Alerts

### Data Sources
- `InventoryLedger.csv` → stockout + dead inventory alerts
- `Flex-Shipments.csv` → shipment delay alerts
- `BusinessReport-monthly.csv` → revenue concentration alert

### Exact Columns Used

**From InventoryLedger.csv:**
| Column | Why |
|---|---|
| `ASIN`, `MSKU`, `Title` | Identify affected SKU |
| `Ending Warehouse Balance` | Current stock |
| `Customer Shipments` | Velocity |
| `Disposition` | SELLABLE filter |

**From Flex-Shipments.csv:**
| Column | Why |
|---|---|
| `Shipment ID` | Unique identifier |
| `SKU`, `MSKU`, `ASIN`, `Title` | Identify affected SKU |
| `Status` | Confirmed / Manifested / Cancelled |
| `ExSD` | Expected Ship Date |
| `Actual Shipout Date` | Actual Ship Date |
| `Shipment Creation Date` | When shipment was created |
| `Units` | Volume affected |
| `Order Value` | Revenue at risk |
| `Channel` | FBA vs Merchant |

**From BusinessReport-monthly.csv:**
| Column | Why |
|---|---|
| `Ordered Product Sales` | Per SKU revenue |
| `SKU`, `Title` | Identification |

### Alert Calculations

```
ALERT 1 — STOCKOUT IMMINENT (from Inventory Ledger)
  Same as Module 2 stockout logic
  Severity CRITICAL: days_remaining < 7
  Severity WARNING:  days_remaining 7-15
  Message: "SKU X will stock out in N days (approx DATE). Daily velocity: V units/day."

ALERT 2 — SHIPMENT DELAYS (from Flex-Shipments.csv)
  Parse ExSD and Actual Shipout Date as datetime
  For completed shipments (Actual Shipout Date not empty):
    delay_days = Actual Shipout Date - ExSD
    is_delayed = delay_days > 0
  For pending shipments (Actual Shipout Date empty, Status = Confirmed):
    days_since_creation = today - Shipment Creation Date
    is_overdue = days_since_creation > 2  (should have shipped by now)

  METRICS:
    total_shipments     = count all
    delayed_count       = count is_delayed = true
    delay_rate          = delayed_count / total_shipments * 100
    avg_delay_days      = mean(delay_days) for delayed shipments
    overdue_pending     = count overdue pending shipments
    overdue_value       = sum(Order Value) for overdue pending

  SEVERITY:
    delay_rate > 20%    → WARNING alert
    overdue_pending > 5 → CRITICAL alert per overdue shipment

ALERT 3 — DEAD INVENTORY (from Inventory Ledger)
  Same as Module 2 dead inventory logic
  Severity: WARNING for <30 days movement, CRITICAL for >90 days
  Message: "N units of SKU X have had no movement. Estimated cost: ₹X/month."

ALERT 4 — REVENUE CONCENTRATION RISK (from Business Report)
  total_revenue = sum(Ordered Product Sales) across all SKUs
  per_sku_pct   = Ordered Product Sales / total_revenue * 100
  if any SKU pct > 30%:
    Severity INFO: "SKU X accounts for 34% of total monthly revenue. High dependency risk."
  if any SKU pct > 50%:
    Severity WARNING
```

### JSON Output (`processed/alerts.json`)
```json
{
  "summary": {
    "critical": 5,
    "warning": 18,
    "info": 3,
    "total": 26
  },
  "alerts": [
    {
      "id": "stockout_B09G393ZCR",
      "type": "STOCKOUT_IMMINENT",
      "severity": "WARNING",
      "asin": "B09G393ZCR",
      "sku": "COPPER-STRIP-0.5-ST1",
      "title": "...",
      "message": "Will stock out in 15 days (May 11). Velocity: 9.5 units/day.",
      "recommended_action": "Dispatch 285 units to FBA by May 1st.",
      "metric_value": 15,
      "metric_unit": "days_remaining"
    },
    {
      "id": "delay_spike",
      "type": "SHIPMENT_DELAY",
      "severity": "WARNING",
      "message": "22% of shipments in the last 24 days were delayed. Avg delay: 1.4 days.",
      "overdue_pending_count": 8,
      "overdue_pending_value": 24600
    }
  ]
}
```

### UI — Page: Operational Alerts
- **Alert count badges at top:** 🔴 Critical: N | 🟠 Warning: N | 🔵 Info: N
- **Alert cards list:** each alert rendered as a card with:
  - Severity color stripe (left border)
  - Alert type tag (STOCKOUT / SHIPMENT DELAY / DEAD INVENTORY / CONCENTRATION RISK)
  - Message text
  - Recommended action (highlighted box)
  - Metric value (e.g. "15 days remaining")
- **Filter:** by severity or alert type
- **Shipment delay detail section:** delay rate chart (bar) per day, overdue pending table

---

## Module 10 — Snapshot Digest (Home Page)

### Data Sources
- All API routes (fetched client-side via `useSWR` or `useEffect`)
- `Orders-Merchant.txt` + `Flex-Shipments.csv` → daily revenue trend (Apr 1–24)

### What It Shows
- **Header:** "Seller Snapshot — April 2026"
- **Row 1 — Business Overview cards:**
  - Total Monthly Revenue — from `BusinessReport-monthly.csv`, `Ordered Product Sales` sum
  - Total B2C Revenue — Total Revenue minus `Ordered Product Sales - B2B` sum
  - Total B2B Revenue — sum of `Ordered Product Sales - B2B`
  - Total Orders — count from `Orders-Merchant.txt` (non-cancelled)
  - Total SKUs Active — row count from `BusinessReport-monthly.csv`
  - Avg Conversion Rate — mean of `Unit Session Percentage` across all SKUs
- **Row 2 — Daily Revenue Trend chart (Apr 1–24):**
  - Line/bar chart built from MERCHANT + FLEX combined, grouped by date
  - Labeled: *"Estimated from order data (MFN + FBA shipments)"*
  - Note: SKU-level daily breakdown not available — only total per day
- **Row 3 — Health Overview:**
  - INVEST SKUs count (green)
  - WATCH SKUs count (yellow)
  - DISCONTINUE SKUs count (red)
- **Row 4 — Top 3 Critical Alerts:** pulled from alerts.json, severity = CRITICAL
- **Row 5 — Top 5 SKUs by Revenue** (from business report, `Ordered Product Sales` desc)
- **Row 6 — Quick Wins panel:**
  - SKUs missing MRP (count) → "Fix MRP on X SKUs for estimated +₹Y revenue"
  - SKUs missing B2B pricing (count) → "Enable B2B pricing on X SKUs"
  - SKUs at stockout risk (count)
  - Dead inventory cost (₹/month)
- **Row 7 — Promo Dependency Warning** (if >50% revenue from promos)

---

## Implementation Order

```
Phase A — Project Setup
  1. Init Next.js 14 app (App Router, JavaScript)
  2. Install dependencies:
       papaparse          → CSV/TSV parsing
       xlsx               → Excel parsing
       recharts           → all charts
       react-simple-maps  → India choropleth
       @radix-ui/react-* → UI primitives
       lucide-react       → icons
       sonner             → toasts
       tailwindcss        → styling
  3. Set up Tailwind config (custom colors from design system)
  4. Set up jsconfig.json paths (@/ alias)
  5. Copy raw data files into data/raw/ — commit to repo
  6. Build lib/parsers.js — reads files via fs.readFileSync,
     parses CSV/TSV with papaparse, XLSX with xlsx library
  7. next.config.js — add serverComponentsExternalPackages

Phase B — Engine Layer (lib/engines/ + app/api/engines/)
  NOTE: API routes compute and return JSON directly — no disk writes (Vercel compatible)
  1. lib/engines/inventory.js        + app/api/engines/inventory/route.js
  2. lib/engines/skuHealth.js        + app/api/engines/sku-health/route.js
  3. lib/engines/listingQuality.js   + app/api/engines/listing-quality/route.js
  4. lib/engines/b2b.js              + app/api/engines/b2b/route.js
  5. lib/engines/promotions.js       + app/api/engines/promotions/route.js
  6. lib/engines/geography.js        + app/api/engines/geography/route.js
  7. lib/engines/alerts.js           + app/api/engines/alerts/route.js
  8. lib/engines/digest.js           + app/api/engines/digest/route.js

Phase C — Shared UI Components
  1. app/globals.css                 → Inter font, base Tailwind setup
  2. app/layout.js                   → dark sidebar nav, app shell
  3. components/MetricCard.jsx       → metric card (value + label + trend)
  4. components/StatusBadge.jsx      → INVEST/WATCH/DISCONTINUE/CRITICAL etc.
  5. components/DataTable.jsx        → sortable, filterable, paginated table
  6. components/AlertCard.jsx        → severity stripe card
  7. components/charts/AreaChart.jsx
  8. components/charts/BarChart.jsx
  9. components/charts/DonutChart.jsx
  10. components/charts/RadarChart.jsx
  11. components/charts/IndiaMap.jsx

Phase D — Pages
  1. app/dashboard/page.jsx          → build first (proves full pipeline works end-to-end)
  2. app/sku-health/page.jsx
  3. app/inventory/page.jsx
  4. app/listing-quality/page.jsx
  5. app/b2b/page.jsx
  6. app/alerts/page.jsx
  7. app/promotions/page.jsx
  8. app/geography/page.jsx          → last (India map most complex)

Phase E — Vercel Deployment
  1. Push to GitHub
  2. Import project on vercel.com
  3. Deploy (zero config needed for Next.js)
  4. Verify all API routes work in serverless environment
  5. Test file reads work correctly (fs + process.cwd())
```

---

## Vercel Deployment

### Key Constraint — No Disk Writes on Vercel

Vercel runs Next.js API routes as **serverless functions** with a **read-only filesystem**. This means:
- Reading raw data files from `data/raw/` → **works** (files are bundled at build time, readable via `fs` + `path.join(process.cwd(), 'data/raw', filename)`)
- Writing computed JSON to `data/processed/` → **does NOT work** on Vercel

### Architecture Change for Vercel Compatibility

Drop the "engines write JSON to disk" model. Instead:

```
OLD (local only):
  API route → engine computes → writes JSON to data/processed/ → page reads JSON file

NEW (Vercel compatible):
  API route → engine computes → returns JSON response directly → page fetches from API route
```

Each page fetches its data from its own API route on mount. The engine runs server-side in the API route on every request. For POC scale (small files, no real traffic) this is perfectly fast.

### Updated App Structure (Vercel compatible)

```
data/
  raw/                     ← committed to repo, read-only, bundled at build time
    BusinessReport-daily.csv
    BusinessReport-monthly.csv
    InventoryLedger.csv
    AllListings.txt
    Orders-Merchant.txt
    Flex-Shipments.csv
  processed/               ← REMOVED (not needed, no disk writes)
```

API routes now return computed data directly:
```js
// app/api/engines/sku-health/route.js
export async function GET() {
  const data = await runSkuHealthEngine()   // reads raw files, computes scores
  return Response.json(data)                // returns JSON directly — no file write
}
```

Pages fetch from API routes:
```js
// app/sku-health/page.jsx
const [data, setData] = useState(null)
useEffect(() => {
  fetch('/api/engines/sku-health').then(r => r.json()).then(setData)
}, [])
```

### Deployment Steps

```
1. Push repo to GitHub (include data/raw/ files — they are the data source)
2. Connect GitHub repo to Vercel (vercel.com → New Project → Import)
3. Framework preset: Next.js (auto-detected)
4. Build command: next build  (default, no changes needed)
5. Output directory: .next    (default)
6. Environment variables: none required for POC
7. Deploy → Vercel assigns a URL automatically
8. Custom domain: optional, add in Vercel project settings
```

### `next.config.js` — One Required Change

Raw data files need to be readable server-side. Add this to prevent Next.js from trying to process them:

```js
// next.config.js
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['papaparse', 'xlsx']
  }
}
module.exports = nextConfig
```

### File Size Considerations

| File | Size | Vercel Limit (250MB bundle) |
|---|---|---|
| InventoryLedger.csv | ~1.7MB | Fine |
| Orders-Merchant.txt | ~554KB | Fine |
| FLEX.csv | ~200KB | Fine |
| Business Reports | ~500KB each | Fine |
| All Listings | ~2MB | Fine |
| **Total** | **~5.5MB** | Well within limits |

---

## UI Design System

### Design Philosophy

**Material Design 3 inspired** — clean, data-dense, professional. Dark sidebar with light content area. Every number should be actionable — not just displayed. Charts wherever a number has context (trend, comparison, distribution). No decorative elements that don't carry information.

---

### Color Palette

```
Background (main):    #FFFFFF   (pure white)
Background (sidebar): #000000   (pure black)
Surface (cards):      #FFFFFF   with border: 1px solid #E5E5E5
                                and shadow: 0 1px 4px rgba(0,0,0,0.06)

Primary (buttons/actions): #000000  (black)
Primary hover:             #1A1A1A  (black 90%)
Primary text on black:     #FFFFFF  (white)

Secondary button:     border: 1px solid #000000, bg: #FFFFFF, text: #000000
Secondary hover:      bg: #F5F5F5

Success (INVEST):     #16A34A   (green-600)  — kept for semantic meaning
Success light:        #F0FDF4   (green-50)

Warning (WATCH):      #D97706   (amber-600)  — kept for semantic meaning
Warning light:        #FFFBEB   (amber-50)

Danger (DISCONTINUE / CRITICAL): #DC2626  (red-600) — kept for semantic meaning
Danger light:         #FFF1F1

Info:                 #525252   (neutral-600)
Info light:           #F5F5F5

Text primary:         #000000   (pure black)
Text secondary:       #737373   (neutral-500)
Text tertiary:        #A3A3A3   (neutral-400)
Border:               #E5E5E5   (neutral-200)
Border strong:        #000000   (black — for active states, focus rings)

Sidebar text:         #FFFFFF   (white)
Sidebar text muted:   #A3A3A3   (neutral-400)
Sidebar active item:  #FFFFFF bg with #000000 text (inverted pill)
Sidebar hover:        rgba(255,255,255,0.08)
```

**Rule:** No color is used purely for decoration. Color only appears on status indicators (green/amber/red) where it carries semantic meaning. Everything else is black, white, or grey.

---

### Typography

```
Font:         Inter (Google Fonts) — clean, modern, highly legible at small sizes
Page title:   24px / font-semibold / text-slate-900
Section head: 16px / font-semibold / text-slate-800
Card label:   12px / font-medium / uppercase / tracking-wide / text-slate-500
Metric value: 28px / font-bold / text-slate-900
Table header: 12px / font-medium / uppercase / text-slate-500
Table cell:   14px / text-slate-700
Badge:        11px / font-semibold / rounded-full / px-2 py-0.5
```

---

### Layout

```
Sidebar:       240px fixed, dark navy (#0F172A), white text nav items
Main content:  flex-1, padding 24px, background #F8F9FA
Top bar:       page title left, optional action buttons right
Content:       max-width 1400px, centered

Metric cards row:  grid cols-2 md:cols-4 xl:cols-6, gap-4
Chart cards:       full-width or 2-col grid depending on page
Data table:        full-width card, rounded-xl, shadow-sm
```

---

### Reusable Components

**MetricCard**
```
bg: #FFFFFF, border: 1px solid #E5E5E5, rounded-xl, p-5
Top: label (12px uppercase #737373) + optional lucide icon (#A3A3A3)
Middle: value (28px font-bold #000000) — formatted (₹1,62,955 / 19.04% / 731)
Bottom: optional trend indicator — ↑ green or ↓ red (only semantic colors used)
Hover: border-color #000000, shadow-sm lift
```

**Buttons**
```
Primary:   bg-black text-white rounded-lg px-4 py-2 font-medium
           hover: bg-neutral-800
Secondary: bg-white text-black border border-black rounded-lg px-4 py-2
           hover: bg-neutral-50
Ghost:     bg-transparent text-black rounded-lg px-4 py-2
           hover: bg-neutral-100
Destructive: bg-red-600 text-white rounded-lg (only for irreversible actions)
```

**StatusBadge**
```
Rounded-full pill, 11px font-semibold, px-2.5 py-0.5, border

INVEST      → bg #F0FDF4  text #15803D  border #BBF7D0  (green — semantic)
WATCH       → bg #FFFBEB  text #B45309  border #FDE68A  (amber — semantic)
DISCONTINUE → bg #FFF1F1  text #B91C1C  border #FECACA  (red — semantic)
CRITICAL    → bg #FFF1F1  text #B91C1C  border #FECACA
WARNING     → bg #FFFBEB  text #B45309  border #FDE68A
INFO        → bg #F5F5F5  text #525252  border #E5E5E5  (grey — neutral info)
B2B HEALTHY → bg #F5F5F5  text #000000  border #E5E5E5
UNTAPPED    → bg #000000  text #FFFFFF  border #000000  (black pill — high attention)
MISSING     → bg #000000  text #FFFFFF  border #000000
```

**DataTable**
```
bg: #FFFFFF, border: 1px solid #E5E5E5, rounded-xl, overflow-hidden
Header row: bg #FAFAFA, 12px uppercase #737373 labels, border-b #E5E5E5
Rows: 48px height, hover: bg #FAFAFA, border-b #F5F5F5
Sorted column: header has small ▲▼ icon in #000000
Active sort column cells: font-medium #000000
Pagination: "Showing 1–25 of 731" + Prev / Next buttons (secondary style)
Search: rounded-lg border-black focus:ring-1 ring-black input
Filter dropdown: border-black, options in plain black text
```

**AlertCard**
```
bg: #FFFFFF, border: 1px solid #E5E5E5, rounded-xl
Left border accent: 4px solid
  CRITICAL → #DC2626 (red)
  WARNING  → #D97706 (amber)
  INFO     → #000000 (black)
Icon: lucide icon, color matching left border
Type tag: uppercase 11px font-semibold, color matching severity
Message: 14px #000000
Recommended Action box: bg #FAFAFA border #E5E5E5 rounded-lg p-3, 13px #000000
Metric chip: top-right, bg #000000 text #FFFFFF, rounded-full, 12px
```

---

### Charts — Page by Page

**Dashboard (Module 10)**
- **Area chart** (Recharts `AreaChart`): daily revenue trend Apr 1–24, filled indigo gradient
- **Donut chart** (Recharts `PieChart`): B2C vs B2B revenue split
- **Horizontal bar chart**: top 5 SKUs by revenue

**SKU Health (Module 1)**
- **Radar/Spider chart** (Recharts `RadarChart`): per-SKU 6-dimension score breakdown (shown in drawer on row click)
- **Bar chart**: distribution of health scores across all SKUs (histogram buckets: 0-20, 20-40, 40-60, 60-80, 80-100)
- **Donut chart**: INVEST / WATCH / DISCONTINUE SKU count breakdown

**Inventory Intelligence (Module 2)**
- **Horizontal bar chart**: top 20 SKUs by days remaining (color-coded red/amber/green)
- **Bar chart**: dead inventory — top 10 SKUs by units stuck
- No complex charts needed — the table itself is the primary visualization

**Promotion Attribution (Module 4)**
- **Stacked bar chart** (Recharts `BarChart`): daily orders — promo (indigo) vs organic (slate) stacked
- **Donut chart**: promo vs organic revenue split
- **Horizontal bar chart**: top 10 promotions by revenue contributed

**Geographic Demand (Module 5)**
- **India choropleth map** (react-simple-maps): states colored by order intensity (white → indigo gradient)
- **Horizontal bar chart**: top 10 states by orders
- **Horizontal bar chart**: top 10 cities by orders

**B2B Opportunities (Module 7)**
- **Grouped bar chart**: B2B conversion % vs B2C conversion % side-by-side for top 15 SKUs
- **Donut chart**: B2B vs B2C revenue split (catalog total)
- **Horizontal bar chart**: top 10 SKUs by B2B revenue

**Listing Quality (Module 8)**
- **Horizontal bar chart**: top 20 SKUs by estimated revenue impact (sorted desc — highest opportunity first)
- **Donut chart**: issue type distribution (missing MRP / missing description / MFN / duplicate desc / missing B2B price)
- **Score distribution bar**: quality score buckets across catalog

**Operational Alerts (Module 9)**
- **Bar chart**: shipment delay rate per day (Apr 1–24) from FLEX data
- No other charts — alert cards are the primary UI

---

### Chart Theming (Recharts)

```js
// Black and white first — color only for semantic status
const CHART_COLORS = {
  primary:  '#000000',   // black — main bars/lines
  secondary:'#737373',   // grey — secondary series
  light:    '#E5E5E5',   // light grey — backgrounds, empty states
  success:  '#16A34A',   // green — INVEST / positive indicators only
  warning:  '#D97706',   // amber — WATCH / warning indicators only
  danger:   '#DC2626',   // red   — DISCONTINUE / critical indicators only
  b2b:      '#525252',   // dark grey — B2B series (distinct from B2C black)
  b2c:      '#000000',   // black — B2C series
}

// All charts use:
CartesianGrid: strokeDasharray="3 3" stroke="#E5E5E5"
Tooltip: contentStyle={{
  borderRadius: 8,
  border: '1px solid #E5E5E5',
  backgroundColor: '#FFFFFF',
  color: '#000000',
  fontSize: 13
}}
Axis labels: fill="#737373" fontSize={12}
Legend:  wrapperStyle={{ fontSize: 13, color: '#000000' }}

// Bar charts: black bars by default
// Multi-series charts: black + grey (no rainbow colors)
// Status-based charts (health score, alerts): green/amber/red retained for meaning
```

---

## Notes / Limitations to Surface in UI

| Module | Limitation | UI Note |
|---|---|---|
| SKU Health — Traffic Score | No multi-day trend, just monthly snapshot | "Trend requires daily data. Connect SP-API for trend tracking." |
| Inventory Intelligence | Only 2 days of velocity data | "Velocity based on 2-day window. Accuracy improves with more data." |
| Demand Forecasting | Not built in POC | Placeholder card: "Available after 3+ months of SP-API data" |
| Geographic Demand | MFN orders only | Banner on page |
| Cannibalization Detector | Not built in POC | Placeholder card |
| Shipment Delays | ExSD missing for some rows | Handle nulls gracefully |
| Daily Revenue Trend | Approximate — MERCHANT + FLEX combined, not official Business Report | "Estimated from order data. Accuracy improves with daily Business Reports via SP-API." |
| Daily Revenue per SKU | Not possible from current data — only Apr 26 has SKU-level daily figures | Not shown in POC. Post-POC via SP-API daily reports. |
| B2C figures everywhere | Never a direct column — always computed as Total minus B2B | Handled in engine logic, transparent in UI tooltips |
