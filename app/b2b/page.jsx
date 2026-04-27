'use client'
import { useState, useEffect } from 'react'
import MetricCard from '@/components/MetricCard'
import StatusBadge from '@/components/StatusBadge'
import DataTable from '@/components/DataTable'
import DonutChart from '@/components/charts/DonutChart'
import BarChart from '@/components/charts/BarChart'
import { formatCurrency, formatNumber, formatPct } from '@/lib/formatters'
import { CheckCircle, XCircle } from 'lucide-react'

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

  // Estimated unlock value: missing pricing SKUs
  const missingPricingSkus = skus.filter(s => s.opportunity_tag === 'MISSING B2B PRICING')
  const avgB2BOrderVal = summary.total_b2b_revenue > 0 && skus.some(s => s.b2b_units > 0)
    ? summary.total_b2b_revenue / skus.reduce((s, r) => s + r.b2b_units, 0)
    : 500
  const estimatedUnlock = Math.round(missingPricingSkus.reduce((s, r) => s + r.b2b_sessions * avgB2BOrderVal * 0.05, 0))

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

      {estimatedUnlock > 0 && (
        <div style={{ background: '#F5F5F5', border: '1px solid #E5E5E5', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#000' }}>
          {summary.skus_missing_b2b_pricing} SKUs have B2B traffic but no B2B pricing configured.
          Setting B2B prices on these could unlock an estimated <strong>{formatCurrency(estimatedUnlock)}</strong> in additional monthly revenue.
        </div>
      )}

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

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
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
