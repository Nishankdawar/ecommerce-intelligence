'use client'
import { useState, useEffect } from 'react'
import MetricCard from '@/components/MetricCard'
import DataTable from '@/components/DataTable'
import DonutChart from '@/components/charts/DonutChart'
import BarChart from '@/components/charts/BarChart'
import { formatCurrency, formatPct } from '@/lib/formatters'
import { CheckCircle, XCircle } from 'lucide-react'

export default function ListingQualityPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [issueFilter, setIssueFilter] = useState('All')

  useEffect(() => {
    fetch('/api/engines/listing-quality').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading || !data) return <div style={{ padding: 40, color: '#737373' }}>Loading...</div>

  const { summary, correlations, skus } = data

  const issueTypes = ['All', 'missing_mrp', 'missing_description', 'duplicate_description', 'mfn_channel', 'missing_b2b_price']
  const filtered = issueFilter === 'All' ? skus : skus.filter(s => s.issues.includes(issueFilter))

  const top20Impact = skus.slice(0, 20)
  const fbaConvLiftPct = Math.round(correlations.fba_vs_mfn_conv_lift * 100)
  const mrpConvLiftPct = Math.round(correlations.mrp_set_conv_lift * 100)

  const issueDonut = [
    { name: 'Missing MRP', value: summary.missing_mrp },
    { name: 'Missing Desc', value: summary.missing_description },
    { name: 'Duplicate Desc', value: summary.duplicate_descriptions },
    { name: 'MFN Channel', value: summary.mfn_listings },
    { name: 'No B2B Price', value: summary.missing_b2b_price },
  ].filter(d => d.value > 0)

  const scoreIcon = v => v >= 80 ? <CheckCircle size={13} color="#16A34A" /> : v >= 50 ? <span style={{ color: '#D97706', fontSize: 12 }}>●</span> : <XCircle size={13} color="#DC2626" />

  const columns = [
    { key: 'sku', label: 'SKU', sortable: true },
    { key: 'title', label: 'Title', sortable: false, render: v => <span style={{ maxWidth: 240, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span> },
    { key: 'overall_score', label: 'Quality Score', sortable: true, align: 'right', render: v => <span style={{ fontWeight: 700, color: v >= 70 ? '#16A34A' : v >= 40 ? '#D97706' : '#DC2626' }}>{v}</span> },
    { key: 'scores', label: 'Title', sortable: false, align: 'center', render: v => scoreIcon(v?.title) },
    { key: 'scores', label: 'Desc', sortable: false, align: 'center', render: v => scoreIcon(v?.description) },
    { key: 'scores', label: 'MRP', sortable: false, align: 'center', render: v => scoreIcon(v?.mrp) },
    { key: 'scores', label: 'B2B', sortable: false, align: 'center', render: v => scoreIcon(v?.b2b_price) },
    { key: 'scores', label: 'FBA', sortable: false, align: 'center', render: v => scoreIcon(v?.fulfillment) },
    { key: 'conversion_rate', label: 'Conv.%', sortable: true, align: 'right', render: v => formatPct(v) },
    { key: 'estimated_revenue_impact_monthly', label: 'Rev Impact/mo', sortable: true, align: 'right', render: v => v > 0 ? formatCurrency(v) : '—' },
  ]

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 24px' }}>Listing Quality</h1>

      <div className="rg-5">
        <MetricCard label="Avg Quality Score" value={summary.avg_quality_score} sub="out of 100" />
        <MetricCard label="Missing MRP" value={summary.missing_mrp} color="#DC2626" />
        <MetricCard label="Duplicate Descriptions" value={summary.duplicate_descriptions} color="#D97706" />
        <MetricCard label="MFN Listings" value={summary.mfn_listings} color="#D97706" />
        <MetricCard label="Missing B2B Price" value={summary.missing_b2b_price} color="#DC2626" />
      </div>

      {/* Correlation insights */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {fbaConvLiftPct !== 0 && (
          <div style={{ background: '#FAFAFA', border: '1px solid #E5E5E5', borderRadius: 8, padding: '10px 16px', fontSize: 13 }}>
            FBA listings convert <strong>{Math.abs(fbaConvLiftPct)}%</strong> {fbaConvLiftPct > 0 ? 'better' : 'worse'} than MFN.
            <span style={{ color: '#737373' }}> {summary.mfn_listings} of your listings are MFN.</span>
          </div>
        )}
        {mrpConvLiftPct !== 0 && (
          <div style={{ background: '#FAFAFA', border: '1px solid #E5E5E5', borderRadius: 8, padding: '10px 16px', fontSize: 13 }}>
            MRP-set SKUs convert <strong>{Math.abs(mrpConvLiftPct)}%</strong> {mrpConvLiftPct > 0 ? 'higher' : 'lower'} than those without MRP.
          </div>
        )}
      </div>

      <div className="rg-21">
        <div style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 12 }}>Top 20 SKUs by Revenue Impact</h2>
          <BarChart
            data={top20Impact.map(s => ({ name: s.sku, impact: s.estimated_revenue_impact_monthly }))}
            xKey="name"
            bars={[{ key: 'impact', label: 'Rev Impact ₹/mo', color: '#000' }]}
            layout="vertical"
            tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`}
            height={460}
          />
        </div>
        <div style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 12 }}>Issue Distribution</h2>
          <DonutChart
            data={issueDonut}
            colors={['#DC2626', '#D97706', '#EAB308', '#737373', '#525252']}
            height={220}
          />
          <div style={{ marginTop: 12 }}>
            {issueDonut.map(d => (
              <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #F5F5F5', fontSize: 12 }}>
                <span style={{ color: '#737373' }}>{d.name}</span>
                <strong>{d.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>All Listings</h2>
        <select value={issueFilter} onChange={e => setIssueFilter(e.target.value)}
          style={{ padding: '6px 12px', border: '1px solid #000', borderRadius: 8, fontSize: 13, background: '#FFF' }}>
          {issueTypes.map(t => <option key={t} value={t}>{t === 'All' ? 'All Issues' : t.replace(/_/g, ' ')}</option>)}
        </select>
        <span style={{ fontSize: 12, color: '#737373' }}>{filtered.length} listings</span>
      </div>

      <DataTable columns={columns} data={filtered} searchable searchKeys={['sku', 'title', 'asin']} pageSize={25} />
    </div>
  )
}
