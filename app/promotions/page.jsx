'use client'
import { useState, useEffect } from 'react'
import MetricCard from '@/components/MetricCard'
import DataTable from '@/components/DataTable'
import DonutChart from '@/components/charts/DonutChart'
import BarChart from '@/components/charts/BarChart'
import { formatCurrency, formatNumber, formatPct } from '@/lib/formatters'
import { AlertTriangle } from 'lucide-react'
import { useIsMobile } from '@/lib/hooks'

export default function PromotionsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/engines/promotions').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  const isMobile = useIsMobile()

  if (loading || !data) return <div style={{ padding: 40, color: '#737373' }}>Loading...</div>

  // Show unavailable message if Orders Report is missing
  if (data._unavailable) {
    return (
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 24px' }}>Promotion Attribution</h1>
        <div style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: 40, textAlign: 'center', maxWidth: 540, margin: '60px auto' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px' }}>Orders Report Required</h2>
          <p style={{ fontSize: 14, color: '#737373', lineHeight: 1.7, margin: '0 0 20px' }}>
            The Promotions Attribution module needs the <strong>Orders Report</strong> to identify which promotion IDs drove which orders. This is the only report that contains the <code style={{ background: '#F5F5F5', padding: '1px 6px', borderRadius: 4 }}>promotion-ids</code> column.
          </p>
          <div style={{ background: '#F5F5F5', border: '1px solid #E5E5E5', borderRadius: 8, padding: '14px 16px', textAlign: 'left', marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#737373', marginBottom: 8 }}>How to download</div>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#525252', lineHeight: 2 }}>
              <li>Go to Seller Central → Reports → Order Reports</li>
              <li>Click <strong>"Request Report"</strong> tab</li>
              <li>Select <strong>"All Orders"</strong></li>
              <li>Set date range (e.g. Jan–Apr 2026)</li>
              <li>Download and upload via Data Management</li>
            </ol>
          </div>
          <a href="/settings/data" style={{ display: 'inline-block', padding: '10px 20px', background: '#000', color: '#FFF', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            Go to Data Management →
          </a>
        </div>
      </div>
    )
  }

  const { summary, promotions, daily_trend, by_sku } = data

  // On mobile show every 4th date label to avoid overlap
  const trendData = isMobile
    ? daily_trend.map((d, i) => ({ ...d, date: i % 4 === 0 ? d.date.replace('-2026','').replace('-Apr','') : '' }))
    : daily_trend

  const promoColumns = [
    { key: 'promo_id', label: 'Promo ID', sortable: false, render: v => <span title={v} style={{ maxWidth: 300, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>{v}</span> },
    { key: 'order_count', label: 'Orders', sortable: true, align: 'right' },
    { key: 'revenue', label: 'Revenue', sortable: true, align: 'right', render: v => formatCurrency(v) },
    { key: 'units', label: 'Units', sortable: true, align: 'right' },
    { key: 'revenue_pct', label: 'Rev %', sortable: true, align: 'right', render: v => formatPct(v) },
    { key: 'discount_given', label: 'Discount Given', sortable: true, align: 'right', render: v => formatCurrency(v) },
  ]

  const skuColumns = [
    { key: 'sku', label: 'SKU', sortable: true },
    { key: 'name', label: 'Product', sortable: false, render: v => <span style={{ maxWidth: 260, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span> },
    { key: 'promo_revenue', label: 'Promo Revenue', sortable: true, align: 'right', render: v => formatCurrency(v) },
    { key: 'organic_revenue', label: 'Organic Revenue', sortable: true, align: 'right', render: v => formatCurrency(v) },
    { key: 'promo_pct', label: 'Promo %', sortable: true, align: 'right', render: v => <span style={{ color: v > 70 ? '#DC2626' : v > 50 ? '#D97706' : '#16A34A' }}>{formatPct(v)}</span> },
  ]

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 12px' }}>Promotion Attribution</h1>

      {/* Data coverage disclaimer */}
      <div style={{ background: '#F5F5F5', border: '1px solid #E5E5E5', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#737373', lineHeight: 1.6 }}>
        <strong style={{ color: '#000' }}>Coverage: MFN orders only · Mar 31–Apr 24, 2026.</strong>
        {' '}FBA orders are not included (requires SP-API). This is why revenue here (₹{(summary.total_revenue / 100000).toFixed(2)}L) is lower than the Dashboard figure (₹33.74L) — the gap of ~₹8.5L represents FBA revenue and Apr 25–30 MFN orders not captured in this file.
      </div>

      {summary.promo_revenue_pct > 50 && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <AlertTriangle size={16} color="#D97706" />
          <span style={{ fontSize: 13, color: '#B45309' }}>
            Over 50% of revenue is promotion-dependent. Plan for revenue drop when promos end.
          </span>
        </div>
      )}

      <div className="rg-3">
        <MetricCard label="Total Orders" value={formatNumber(summary.total_orders)} />
        <MetricCard label="Promo Orders" value={`${formatNumber(summary.promo_orders)} (${formatPct(summary.promo_orders / summary.total_orders * 100)})`} color="#D97706" />
        <MetricCard label="Organic Orders" value={`${formatNumber(summary.organic_orders)} (${formatPct(summary.organic_orders / summary.total_orders * 100)})`} color="#16A34A" />
        <MetricCard label="Total Revenue" value={formatCurrency(summary.total_revenue)} />
        <MetricCard label="Promo Revenue" value={formatCurrency(summary.promo_revenue)} color="#D97706" />
        <MetricCard label="Organic Revenue" value={formatCurrency(summary.organic_revenue)} color="#16A34A" />
      </div>

      <div className="rg-2">
        <div style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 12 }}>Promo vs Organic Revenue</h2>
          <DonutChart
            data={[
              { name: 'Promo Revenue', value: summary.promo_revenue },
              { name: 'Organic Revenue', value: summary.organic_revenue },
            ]}
            colors={['#D97706', '#000']}
            formatter={v => [formatCurrency(v)]}
          />
        </div>
        <div style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 12 }}>Daily Orders — Promo vs Organic</h2>
          <BarChart
            data={trendData}
            xKey="date"
            bars={[
              { key: 'promo_orders', label: 'Promo', color: '#D97706', stack: 'a' },
              { key: 'organic_orders', label: 'Organic', color: '#000', stack: 'a' },
            ]}
            layout="horizontal"
            height={isMobile ? 200 : 240}
          />
        </div>
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Promotions Breakdown</h2>
      <DataTable columns={promoColumns} data={promotions} pageSize={20} />

      <h2 style={{ fontSize: 15, fontWeight: 600, margin: '24px 0 12px' }}>Per-SKU Promo Dependency</h2>
      <DataTable columns={skuColumns} data={by_sku} searchable searchKeys={['sku', 'name']} pageSize={25} />
    </div>
  )
}
