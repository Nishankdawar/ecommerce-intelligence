'use client'
import { useState, useEffect } from 'react'
import MetricCard from '@/components/MetricCard'
import StatusBadge from '@/components/StatusBadge'
import DataTable from '@/components/DataTable'
import DonutChart from '@/components/charts/DonutChart'
import BarChart from '@/components/charts/BarChart'
import { formatCurrency, formatNumber, formatPct } from '@/lib/formatters'
import { CheckCircle, XCircle, TrendingUp, Tag, Layers, Users, ArrowRight } from 'lucide-react'

export default function B2BPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tagFilter, setTagFilter] = useState('All')

  useEffect(() => {
    fetch('/api/engines/b2b').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading || !data) return <div style={{ padding: 40, color: '#737373' }}>Loading...</div>

  const { summary, skus } = data

  const tags = ['All', 'B2B NOT VISIBLE', 'UNTAPPED', 'MISSING B2B PRICING', 'UNDERPERFORMING', 'B2B HEALTHY']
  const filtered = tagFilter === 'All' ? skus : skus.filter(s => s.opportunity_tag === tagFilter)

  const top15B2BRev = [...skus].sort((a, b) => b.b2b_revenue - a.b2b_revenue).slice(0, 15)

  // ── Insight calculations ──────────────────────────────────────────────────
  const avgB2BOrderVal = summary.total_b2b_revenue > 0 && skus.some(s => s.b2b_units > 0)
    ? summary.total_b2b_revenue / skus.reduce((s, r) => s + r.b2b_units, 0)
    : 500

  // 1. Missing B2B pricing — SKUs with B2B sessions but no price set
  const missingPricingSkus = skus.filter(s => s.opportunity_tag === 'MISSING B2B PRICING')
  const missingPricingImpact = Math.round(
    missingPricingSkus.reduce((s, r) => s + r.b2b_sessions * avgB2BOrderVal * 0.05, 0)
  )

  // 2. Untapped — B2B sessions > 0 but zero sales
  const untappedSkus = skus.filter(s => s.opportunity_tag === 'UNTAPPED')
  const untappedImpact = Math.round(
    untappedSkus.reduce((s, r) => s + r.b2b_sessions * avgB2BOrderVal * 0.05, 0)
  )

  // 3. Missing quantity tiers — has B2B pricing but no tiers (B2B buyers expect bulk pricing)
  const noTierSkus = skus.filter(s => s.b2b_price_set && !s.qty_tiers_set && s.b2b_sessions > 0)
  const noTierImpact = Math.round(
    noTierSkus.reduce((s, r) => s + r.b2b_revenue * 0.15, 0) // 15% uplift assumption for adding tiers
  )

  // 4. Underperforming — B2B conv significantly below B2C
  const underperformingSkus = skus.filter(s => s.opportunity_tag === 'UNDERPERFORMING')
  const underperformingImpact = Math.round(
    underperformingSkus.reduce((s, r) => s + r.b2b_sessions * (r.b2c_conv / 100) * avgB2BOrderVal * 0.3, 0)
  )

  // 5. Not visible to B2B — no B2B sessions at all but has B2C sales
  const notVisibleSkus = skus.filter(s => s.opportunity_tag === 'B2B NOT VISIBLE' && s.b2c_revenue > 0)
  const notVisibleImpact = Math.round(
    notVisibleSkus.slice(0, 20).reduce((s, r) => s + r.b2c_revenue * 0.08, 0) // 8% B2B uplift on top sellers
  )

  const insights = [
    {
      tag: 'MISSING B2B PRICING',
      icon: Tag,
      priority: 1,
      title: `Set B2B prices on ${missingPricingSkus.length} SKUs`,
      description: `These SKUs are getting B2B buyer traffic but have no B2B price configured. B2B buyers see the regular price with no business discount — reducing conversion. Setting a B2B price (even 5–10% below B2C) signals this is a business-friendly listing.`,
      action: 'Go to Manage Inventory → select SKU → Edit → B2B Pricing tab → set Business Price.',
      impact: missingPricingImpact,
      count: missingPricingSkus.length,
      filterTag: 'MISSING B2B PRICING',
    },
    {
      tag: 'UNTAPPED',
      icon: Users,
      priority: 2,
      title: `Convert ${untappedSkus.length} SKUs with B2B traffic but zero B2B sales`,
      description: `B2B buyers are visiting these product pages but not purchasing. Common reasons: no business price set, no quantity tiers, or listing copy not business-oriented. These are warm leads you are currently losing.`,
      action: 'Set a B2B price + at least one quantity tier (e.g. 5+ units = 8% off). Also ensure the product title clearly describes business use cases.',
      impact: untappedImpact,
      count: untappedSkus.length,
      filterTag: 'UNTAPPED',
    },
    {
      tag: 'UNDERPERFORMING',
      icon: TrendingUp,
      priority: 3,
      title: `Fix B2B conversion gap on ${underperformingSkus.length} SKUs`,
      description: `These SKUs have B2B conversion significantly below their B2C conversion rate. B2B buyers are interested (sessions exist) but not converting — typically because the B2B price isn't competitive enough or quantity discount tiers are absent.`,
      action: 'Review B2B price vs B2C price. Add quantity discount tiers (Qty 2+, Qty 5+, Qty 10+). B2B buyers typically expect 5–15% discount over B2C for ordering in volume.',
      impact: underperformingImpact,
      count: underperformingSkus.length,
      filterTag: 'UNDERPERFORMING',
    },
    {
      tag: null,
      icon: Layers,
      priority: 4,
      title: `Add quantity tiers to ${noTierSkus.length} SKUs that have B2B pricing but no bulk discount`,
      description: `These SKUs have a B2B price configured but no quantity tier pricing. B2B buyers ordering 5, 10, or 20+ units see no incentive to increase order size. Quantity tiers are one of the highest-impact B2B levers available on Amazon.`,
      action: 'In Manage Inventory → B2B Pricing, add at least 2 tiers: e.g. Qty 5+ = 8% off, Qty 10+ = 12% off. This increases average B2B order value and conversion.',
      impact: noTierImpact,
      count: noTierSkus.length,
      filterTag: null,
    },
    {
      tag: 'B2B NOT VISIBLE',
      icon: Users,
      priority: 5,
      title: `Make top B2C SKUs visible to B2B buyers`,
      description: `${notVisibleSkus.length} SKUs currently have strong B2C sales but zero B2B sessions — meaning B2B buyers aren't finding them. Adding a B2B price makes these listings eligible to appear in Amazon Business search and purchasing workflows.`,
      action: 'For your top 20 B2C SKUs, set a B2B price in Manage Inventory. This alone makes them discoverable to the 10M+ registered business buyers on Amazon.',
      impact: notVisibleImpact,
      count: notVisibleSkus.length,
      filterTag: 'B2B NOT VISIBLE',
    },
  ].filter(i => i.count > 0)

  const columns = [
    { key: 'sku', label: 'SKU', sortable: true },
    { key: 'b2b_sessions', label: 'B2B Sessions', sortable: true, align: 'right', render: v => formatNumber(v) },
    { key: 'b2b_conv', label: 'B2B Conv%', sortable: true, align: 'right', render: v => formatPct(v) },
    { key: 'b2c_conv', label: 'B2C Conv%', sortable: true, align: 'right', render: v => formatPct(v) },
    { key: 'conv_gap', label: 'Conv Gap', sortable: true, align: 'right', render: v => <span style={{ color: v > 5 ? '#DC2626' : '#16A34A' }}>{v > 0 ? '+' : ''}{v.toFixed(1)}</span> },
    { key: 'b2b_revenue', label: 'B2B Revenue', sortable: true, align: 'right', render: v => formatCurrency(v) },
    { key: 'b2b_price_set', label: 'B2B Price', sortable: false, align: 'center', render: v => v ? <CheckCircle size={14} color="#16A34A" /> : <XCircle size={14} color="#DC2626" /> },
    { key: 'qty_tiers_set', label: 'Qty Tiers', sortable: false, align: 'center', render: v => v ? <CheckCircle size={14} color="#16A34A" /> : <XCircle size={14} color="#DC2626" /> },
    { key: 'opportunity_tag', label: 'Tag', sortable: true, render: v => <StatusBadge status={v} /> },
    { key: 'opportunity_score', label: 'Opp. Score', sortable: true, align: 'right' },
  ]

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 24px' }}>B2B Opportunities</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <MetricCard label="Total B2B Revenue" value={formatCurrency(summary.total_b2b_revenue)} />
        <MetricCard label="B2B % of Revenue" value={formatPct(summary.b2b_revenue_pct)} color="#737373" />
        <MetricCard label="SKUs Missing B2B Price" value={summary.skus_missing_b2b_pricing} color="#DC2626" />
        <MetricCard label="Untapped SKUs" value={summary.skus_untapped} color="#D97706" />
      </div>

      {/* ── How to grow B2B revenue ───────────────────────────────────────── */}
      <div style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>How to grow B2B revenue</h2>
          <p style={{ margin: 0, fontSize: 12, color: '#737373' }}>
            Prioritised actions based on your current B2B data · estimated monthly impact shown per action
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {insights.map((ins, i) => {
            const Icon = ins.icon
            return (
              <div key={i} style={{ border: '1px solid #E5E5E5', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                {/* Priority + icon */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? '#000' : '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={14} color={i === 0 ? '#FFF' : '#737373'} />
                  </div>
                  <span style={{ fontSize: 10, color: '#A3A3A3', fontWeight: 600 }}>#{ins.priority}</span>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#000' }}>{ins.title}</span>
                    {ins.impact > 0 && (
                      <span style={{ fontSize: 11, background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D', borderRadius: 999, padding: '2px 8px', fontWeight: 600 }}>
                        est. +{formatCurrency(ins.impact)}/mo
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '0 0 8px', fontSize: 12, color: '#525252', lineHeight: 1.6 }}>{ins.description}</p>
                  <div style={{ background: '#FAFAFA', border: '1px solid #E5E5E5', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#000', lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 600 }}>Action: </span>{ins.action}
                  </div>
                </div>

                {/* View SKUs button */}
                {ins.filterTag && (
                  <button
                    onClick={() => { setTagFilter(ins.filterTag); document.getElementById('sku-table')?.scrollIntoView({ behavior: 'smooth' }) }}
                    style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', border: '1px solid #000', borderRadius: 8, background: '#FFF', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    View SKUs <ArrowRight size={12} />
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Total estimated unlock */}
        {insights.length > 0 && (
          <div style={{ marginTop: 14, padding: '12px 16px', background: '#F5F5F5', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#737373' }}>Total estimated monthly B2B revenue unlock across all actions</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#000' }}>
              {formatCurrency(insights.reduce((s, i) => s + i.impact, 0))}
            </span>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 12 }}>B2B vs B2C Revenue</h2>
          <DonutChart
            data={[
              { name: 'B2B Revenue', value: summary.total_b2b_revenue },
              { name: 'B2C Revenue', value: summary.total_revenue - summary.total_b2b_revenue },
            ]}
            colors={['#525252', '#000']}
            formatter={v => [formatCurrency(v)]}
          />
        </div>
        <div style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 12 }}>Top 15 SKUs by B2B Revenue</h2>
          <BarChart
            data={top15B2BRev.map(s => ({ name: s.sku, revenue: s.b2b_revenue }))}
            xKey="name"
            bars={[{ key: 'revenue', label: 'B2B Revenue', color: '#525252' }]}
            layout="vertical"
            tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`}
            height={360}
          />
        </div>
      </div>

      <div id="sku-table" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>SKU Opportunities</h2>
        {tags.map(t => (
          <button key={t} onClick={() => setTagFilter(t)} style={{
            padding: '5px 12px', border: '1px solid', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: tagFilter === t ? 600 : 400,
            background: tagFilter === t ? '#000' : '#FFF', color: tagFilter === t ? '#FFF' : '#000', borderColor: tagFilter === t ? '#000' : '#E5E5E5',
          }}>{t}</button>
        ))}
        <span style={{ fontSize: 12, color: '#737373' }}>{filtered.length} SKUs</span>
      </div>

      <DataTable columns={columns} data={filtered} searchable searchKeys={['sku', 'asin']} pageSize={25} />
    </div>
  )
}
