'use client'
import { useState, useEffect } from 'react'
import MetricCard from '@/components/MetricCard'
import DataTable from '@/components/DataTable'
import DonutChart from '@/components/charts/DonutChart'
import BarChart from '@/components/charts/BarChart'
import { formatCurrency, formatNumber, formatPct } from '@/lib/formatters'
import { AlertTriangle } from 'lucide-react'

export default function PromotionsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/engines/promotions').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading || !data) return <div style={{ padding: 40, color: '#737373' }}>Loading...</div>

  const { summary, promotions, daily_trend, by_sku } = data

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
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 24px' }}>Promotion Attribution</h1>

      {summary.promo_revenue_pct > 50 && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <AlertTriangle size={16} color="#D97706" />
          <span style={{ fontSize: 13, color: '#B45309' }}>
            Over 50% of revenue is promotion-dependent. Plan for revenue drop when promos end.
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <MetricCard label="Total Orders" value={formatNumber(summary.total_orders)} />
        <MetricCard label="Promo Orders" value={`${formatNumber(summary.promo_orders)} (${formatPct(summary.promo_orders / summary.total_orders * 100)})`} color="#D97706" />
        <MetricCard label="Organic Orders" value={`${formatNumber(summary.organic_orders)} (${formatPct(summary.organic_orders / summary.total_orders * 100)})`} color="#16A34A" />
        <MetricCard label="Total Revenue" value={formatCurrency(summary.total_revenue)} />
        <MetricCard label="Promo Revenue" value={formatCurrency(summary.promo_revenue)} color="#D97706" />
        <MetricCard label="Organic Revenue" value={formatCurrency(summary.organic_revenue)} color="#16A34A" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
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
            data={daily_trend}
            xKey="date"
            bars={[
              { key: 'promo_orders', label: 'Promo', color: '#D97706', stack: 'a' },
              { key: 'organic_orders', label: 'Organic', color: '#000', stack: 'a' },
            ]}
            layout="horizontal"
            height={240}
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
