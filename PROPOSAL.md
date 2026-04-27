# Amazon Seller Intelligence Platform — Product Proposal

---

## The Problem

An Amazon seller doing 10,000 orders/day is drowning in data but starving for decisions. Amazon gives them 15+ different report types — business reports, inventory ledgers, order reports, shipment reports, listing reports — all disconnected, all requiring manual download, all requiring Excel to make sense of. A seller with 100+ SKUs cannot manually track which products are dying, which are growing, when inventory will run out, which promotions are actually working, or where geographically their demand is concentrated. They find out too late — after a stockout, after a promotion bleeds money, after a SKU quietly dies.

Every tool in the market today (Helium 10, Sellerboard, Jungle Scout) either focuses on keyword research, or shows a basic P&L. None of them connect all the operational data together into decisions.

---

## What We're Building

A SaaS platform that connects directly to an Amazon seller's account via SP-API, pulls all their data automatically every day, and runs a set of intelligence engines on top of it — giving the seller a **decision engine, not just a dashboard**.

The core difference: most tools tell you *what happened*. This tells you *what to do about it*.

---

## Module 1 — SKU Health Scoring Engine

### The Problem It Solves
A seller with 150 SKUs cannot evaluate each one individually every week. They need a single system that automatically tells them which SKUs deserve more investment and which should be killed.

### How It Works
Every SKU gets scored daily across 6 dimensions:
- **Traffic Score** — are sessions growing or declining week over week?
- **Conversion Score** — is the unit session percentage above or below the category average?
- **Buy Box Score** — what % of the time is this SKU winning the featured offer?
- **Return Rate Score** — units returned vs units shipped from the inventory ledger
- **Inventory Efficiency Score** — how fast is inventory turning over, is capital being blocked?
- **B2B Penetration Score** — is B2B revenue being captured or left on the table?

These combine into a single **SKU Health Score (0–100)** and a classification:
- **INVEST** — strong across most dimensions, put more budget and inventory here
- **WATCH** — declining in 1–2 dimensions, needs attention before it deteriorates
- **DISCONTINUE** — chronic underperformer, the system shows you exactly how much capital is trapped in it and what it costs to keep it alive

### Why This Doesn't Exist Today
Every tool shows you top sellers by revenue. None of them automatically flag a SKU that has great revenue but terrible return rate and declining sessions — which means it's about to fall off a cliff. The score combines leading indicators, not just lagging revenue numbers.

---

## Module 2 — Inventory Intelligence + Replenishment Calendar

### The Problem It Solves
At 10k orders/day across 100+ SKUs, a seller cannot manually track when each SKU will stock out and when to send replenishment to FBA. They either overstock (capital blocked, storage fees) or understock (stockout, lost sales, ranking drop). Both are expensive.

### How It Works

**Stockout Prediction:**
From the inventory ledger, the system calculates a rolling 7-day consumption velocity per SKU. Combined with current FBA stock, it projects the exact stockout date for every SKU. It then works backwards from that date using a configurable manufacturing + shipping lead time to tell the seller: *"You need to dispatch replenishment for this SKU by Thursday or you will stock out on May 14th and lose approximately ₹1.8 lakh."*

**Dead Inventory Detection:**
The system tracks how long each unit has been sitting in FBA warehouse. It calculates the real cost of dead inventory — not just the FBA storage fee Amazon charges, but the opportunity cost of capital that could have been deployed in a fast-moving SKU. It surfaces a ranked list of slow-moving inventory with: units stuck, days stuck, total cost to date, projected cost if not acted on, and recommended action (run a deal, lower price, or initiate removal).

**Automated Replenishment Calendar:**
A weekly calendar view that shows exactly which SKUs need replenishment sent, how many units, and by when — across all SKUs simultaneously. One view, actionable, no manual calculation.

---

## Module 3 — Demand Forecasting Engine

### The Problem It Solves
How many units of each SKU should a seller manufacture or procure for the next 60–90 days? Today this is guesswork or gut feel. Wrong guess in either direction costs money.

### How It Works
Using historical daily units ordered per SKU (pulled from business reports), the system builds a time series model per SKU using Facebook Prophet. This model:
- Detects weekly seasonality (some products sell more on weekends)
- Detects annual seasonality (products likely spike around Diwali, Navratri, Griha Pravesh season)
- Detects the impact of promotions on demand (and separates promo-driven demand from organic demand, so the forecast isn't inflated by a one-time deal)
- Outputs: predicted units for next 30 / 60 / 90 days with confidence intervals

The forecast feeds directly into the replenishment calendar — so the reorder quantity isn't just based on current stock and current velocity, but on predicted future demand.

**Example output:** *"Based on historical patterns, Copper Strip 0.5-inch demand increases 340% in October–November. You will need 4,200 units in October. Given your current production lead time of 21 days, start manufacturing by September 5th."*

---

## Module 4 — Promotion Incrementality Analyzer

### The Problem It Solves
A seller runs a Buy 2 Get 10% Off promotion and sees sales go up. They think the promotion worked. But did it? Or did it just pull forward demand that would have happened anyway, while giving away margin for free? At 10k orders/day with multiple promos running simultaneously, this is completely impossible to track manually.

### How It Works
Every Amazon order contains promotion IDs embedded in the data. The system:
- Tags every order with the promotion(s) that applied to it
- Calculates baseline daily velocity for each SKU in the 14 days before a promotion
- Measures actual velocity during the promotion
- Computes **true incremental units** = promo-period units minus what would have sold anyway at baseline
- Calculates: discount cost (per unit discount × total units sold) vs incremental revenue generated
- Shows **true promotion ROI**: did the promotion make money or lose money in real terms?

It also detects **post-promotion hangover** — the drop in organic sales in the days after a promotion ends, which is often a sign that the promo cannibalized future demand rather than growing the customer base.

### Why This Doesn't Exist Today
Amazon's own promotion reports only show you how many orders used a coupon. They do not calculate incrementality. No third-party tool does this either. A seller running 20 active promotions simultaneously has zero visibility into which ones actually work.

---

## Module 5 — Geographic Demand Intelligence

### The Problem It Solves
Amazon gives sellers zero geographic intelligence at the SKU level. A seller doesn't know that 60% of their product sales come from Delhi NCR and Bangalore, or that a specific SKU has unexpectedly strong demand in Tier 2 cities.

### How It Works
Every merchant-fulfilled order contains city, state, and postal code. The system aggregates this at multiple levels:

**SKU-City Affinity Maps:**
For each SKU, a ranked list of cities and states by order volume, revenue, and conversion rate. Identifies geographic concentration and underserved markets.

**FBA Warehouse Placement Recommendations:**
Amazon allows sellers to influence which FBA warehouses their inventory is sent to. When inventory is located close to demand, delivery time is shorter — which improves conversion rate. The system analyzes where demand for each SKU is geographically concentrated and recommends optimal FBA split:
*"Send 55% of Copper Strip inventory to BOM1 (Mumbai), 30% to DEL (Delhi), 15% to BLR (Bangalore) based on your demand pattern. Estimated conversion improvement: 8–12%."*

**Ad Targeting Intelligence:**
For sellers running Sponsored Product ads, the system identifies which cities have the highest purchase intent per SKU based on actual order history — telling them exactly where to concentrate ad spend geographically.

**New Product Launch Geotargeting:**
When launching a new SKU, it identifies which cities historically adopted similar products early, so the seller can concentrate launch inventory and ads in the right markets first.

---

## Module 6 — SKU Cannibalization Detector

### The Problem It Solves
Sellers with large catalogs constantly launch new variants of existing products (different sizes, materials, lengths). They assume each new variant adds incremental revenue. Very often it doesn't — it just takes sales from an existing SKU while adding inventory complexity and management overhead.

### How It Works
The system monitors sibling ASINs — products in the same category from the same seller. When a new ASIN is launched, it:
- Measures the sessions and sales trend of sibling ASINs before and after the new launch date
- Detects statistically whether the new SKU captured new customers or redirected existing demand
- Quantifies the net revenue impact: *"Launching the 12-ft copper strip added ₹90,000/month revenue but reduced 8-ft copper strip revenue by ₹70,000/month — net incremental value: ₹20,000/month, not the ₹90,000 you're seeing"*
- Recommends: consolidate variants, discontinue the cannibalizing SKU, or restructure pricing between variants

At scale this is completely invisible without a system. Sellers keep launching variants thinking they're growing when they're just fragmenting the same demand.

---

## Module 7 — B2B Opportunity Scorer

### The Problem It Solves
Amazon Business (B2B) is one of the fastest growing segments on Amazon India. Business reports separately track B2B sessions, B2B units, and B2B revenue per SKU. Most sellers don't even look at this column. The ones who do don't know what to do with it.

### How It Works
The system analyzes B2B data separately for every SKU:
- Compares B2B conversion rate vs B2C conversion rate per SKU
- Identifies: high B2B sessions but low B2B conversion = wrong pricing or missing quantity tiers
- Identifies: high B2C but zero B2B = product has B2B potential the seller hasn't activated
- Simulates optimal B2B quantity price tiers based on observed order patterns: *"B2B buyers who order 10+ units of Copper Strip convert at 28%. Set a 10-unit quantity tier at 12% discount — estimated incremental B2B revenue: ₹1.4 lakh/month"*
- Tracks B2B revenue contribution % over time as the seller implements recommendations

---

## Module 8 — Listing Quality → Revenue Impact Calculator

### The Problem It Solves
Every Amazon seller knows they should "optimize their listings" but no one tells them which specific listings to fix, in what order, and what the revenue impact of fixing them will be.

### How It Works
The system scores each listing on quality dimensions:
- Title completeness and keyword richness
- Description present and above minimum length
- MRP set (affects perceived discount and conversion)
- B2B price configured
- Fulfillment channel (FBA vs MFN — FBA consistently converts better)
- Image count

It then correlates these dimensions across all SKUs to find which quality factors most strongly predict conversion rate. Then for each underperforming listing it says:
*"SKU X has no description, no MRP set, and is merchant-fulfilled. Across your other SKUs, fixing these 3 issues is associated with an average 31% conversion improvement. For SKU X at its current session volume, that would mean approximately ₹52,000/month in additional revenue."*

This turns listing optimization from generic advice into a prioritized, quantified action list ranked by revenue impact.

---

## Module 9 — Operational Alerts Engine

### The Problem It Solves
At 10k orders/day, problems happen constantly and silently. Sellers find out about them when revenue has already been lost.

### What It Monitors Continuously

| Alert Type | Trigger | Why It Matters |
|---|---|---|
| Stockout Imminent | < 7 days of inventory remaining | Stockout kills ranking, not just revenue |
| Buy Box Lost | Featured Offer % drops > 20% in 48hrs | Direct conversion drop |
| Shipment Delay Spike | Actual ship date > expected on > 15% of orders | SLA risk, cancellations |
| Promotion Expiry | High-revenue promo ending in < 48hrs | Prepare for revenue drop |
| Dead Inventory Threshold | Units sitting > 90 days, cost > threshold | Actionable liquidation trigger |
| Return Rate Spike | Returns > 2x baseline for any SKU | Product or listing problem |
| Revenue Concentration Risk | Single SKU > 40% of total revenue | Business risk flag |

All alerts go to dashboard + email + optionally WhatsApp.

---

## Module 10 — Daily Decision Digest

### The Problem It Solves
A founder or operations head cannot log into a dashboard every morning and interpret it. They need the system to tell them what matters today.

### What It Is
A daily automated brief delivered at 8am covering:
- Top 3 actions required today (ranked by revenue impact)
- SKUs that changed classification overnight (moved from WATCH to DISCONTINUE etc.)
- Replenishment actions due this week
- Active alerts summary
- Yesterday's revenue vs forecast vs same day last week

One page. Decisions only. No interpretation required.

---

## Competitive Differentiation

| Capability | Helium 10 | Sellerboard | Jungle Scout | This Platform |
|---|---|---|---|---|
| Automated SP-API data pull | Partial | Partial | No | Yes — all report types |
| SKU Health Score (multi-dimensional) | No | No | No | Yes |
| Demand Forecasting per SKU | No | No | No | Yes |
| Promotion Incrementality | No | No | No | Yes |
| Geographic SKU Affinity | No | No | No | Yes |
| Cannibalization Detection | No | No | No | Yes |
| B2B Opportunity Scoring | No | No | No | Yes |
| Dead Inventory Cost Clock | No | Basic | No | Yes |
| Replenishment Calendar | Basic | Basic | No | Yes — forecast-driven |
| Daily Decision Digest | No | No | No | Yes |

---

## Target Users

**Primary:** Amazon India sellers doing ₹50 lakh+ monthly revenue, 50+ active SKUs, selling via FBA. They have operations teams but no dedicated data analyst.

**Secondary:** Aggregators and brand management companies managing multiple seller accounts — the platform is built multi-tenant from day one.

---

## Data Sources (via Amazon SP-API)

| Report | Data It Provides |
|---|---|
| Business Report | Sessions, page views, conversion rate, units ordered, revenue per ASIN (B2C + B2B) |
| FBA Inventory Ledger | Daily inventory movements: receipts, shipments, returns, lost, damaged per FNSKU |
| Orders Report (Merchant) | Order-level data with city, state, postal code, promotion IDs, fulfillment channel |
| FBA Shipment Report | Shipment tracking, expected vs actual ship dates, shipment status |
| All Listings Report | Active SKUs with price, MRP, B2B price, fulfillment channel, description |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Data Storage | DuckDB (columnar, analytics-optimized) |
| Backend | Python + FastAPI |
| Scheduler | APScheduler (daily ingestion + metric computation) |
| Forecasting | Facebook Prophet |
| Frontend (MVP) | Streamlit |
| Frontend (Production) | React |
| Deployment | Docker Compose |
| API Integration | Amazon SP-API |

---

## Build Phases

**Phase 1 — Foundation**
- SP-API connection + automated data pull for all report types
- SKU master auto-builder (links ASIN, FNSKU, MSKU, SKU)
- Core dashboard: revenue, sessions, units, inventory per SKU
- Stockout alerts

**Phase 2 — Intelligence**
- SKU Health Score + INVEST / WATCH / DISCONTINUE classification
- Demand forecasting + replenishment calendar
- Promotion incrementality analyzer
- Geographic demand heatmap

**Phase 3 — Advanced**
- SKU cannibalization detector
- B2B opportunity scorer
- Listing quality → revenue impact calculator
- Dead inventory cost clock
- Daily decision digest (email + WhatsApp)

**Phase 4 — Scale**
- Multi-seller / multi-tenant support
- Role-based access (operations vs finance vs founder)
- Amazon.com and other marketplaces expansion
