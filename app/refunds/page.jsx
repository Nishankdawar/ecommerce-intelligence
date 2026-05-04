'use client'
import DataRequired from '@/components/DataRequired'
import { useState, useEffect } from 'react'
import MetricCard from '@/components/MetricCard'
import DataTable from '@/components/DataTable'
import BarChart from '@/components/charts/BarChart'
import { formatCurrency, formatPct, formatNumber } from '@/lib/formatters'
import { useIsMobile } from '@/lib/hooks'

export default function RefundsPage() {
  const isMobile = useIsMobile()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/engines/refunds').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading || !data) return <div style={{ padding: 40, color: '#737373' }}>Loading...</div>

  if (data?._unavailable) return <DataRequired moduleName="Refund P&L Impact" missingFiles={data.missing_files || []} />

  const { summary, skus } = data
  const top15Cost = skus.slice(0, 15)
  const highReturnRate = [...skus].filter(s => s.return_rate > 0).sort((a, b) => b.return_rate - a.return_rate).slice(0, 10)

  const columns = [
    { key: 'sku', label: 'SKU', sortable: true },
    { key: 'shipped_units', label: 'Shipped', sortable: true, align: 'right' },
    { key: 'refund_units', label: 'Returned', sortable: true, align: 'right' },
    { key: 'return_rate', label: 'Return Rate', sortable: true, align: 'right', render: v => <span style={{ color: v > 10 ? '#DC2626' : v > 5 ? '#D97706' : '#16A34A', fontWeight: 600 }}>{formatPct(v)}</span> },
    { key: 'refund_amount', label: 'Refund Amount', sortable: true, align: 'right', render: v => <span style={{ color: '#DC2626' }}>{formatCurrency(v)}</span> },
    { key: 'refund_commission', label: 'Refund Commission', sortable: true, align: 'right', render: v => formatCurrency(v) },
    { key: 'true_cost', label: 'True Cost', sortable: true, align: 'right', render: v => <span style={{ fontWeight: 600, color: '#DC2626' }}>{formatCurrency(v)}</span> },
    { key: 'revenue_impact_pct', label: 'Revenue Impact', sortable: true, align: 'right', render: v => <span style={{ color: v > 10 ? '#DC2626' : '#737373' }}>{formatPct(v)}</span> },
  ]

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>Refund P&L Impact</h1>
      <p style={{ fontSize: 13, color: '#737373', margin: '0 0 4px' }}>March 2026 · True cost of returns = refund amount + refund commission still paid to Amazon</p>
      <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '8px 12px', marginBottom: 20, fontSize: 12, color: '#B45309' }}>
        Note: Amazon charges you a refund commission even on returned orders. True cost = refund given to customer + commission not recovered.
      </div>

      <div className="rg-4">
        <MetricCard label="Total Refund Orders" value={formatNumber(summary.total_refund_orders)} color="#DC2626" />
        <MetricCard label="Units Returned" value={formatNumber(summary.total_refund_units)} />
        <MetricCard label="Refund Amount" value={formatCurrency(summary.total_refund_amount)} color="#DC2626" />
        <MetricCard label="True Cost (incl. commission)" value={formatCurrency(summary.total_true_cost)} color="#DC2626" sub={`incl. ${formatCurrency(summary.total_refund_commission)} commission`} />
      </div>

      <div className="rg-2">
        <div style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 12 }}>Top 15 SKUs by Refund Cost</h2>
          <BarChart
            data={top15Cost.map(s => ({ name: s.sku, cost: s.true_cost }))}
            xKey="name" layout="vertical" height={isMobile ? 280 : 400}
            bars={[{ key: 'cost', label: 'True Refund Cost', color: '#DC2626' }]}
            tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`}
          />
        </div>
        <div style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 12 }}>Top 10 SKUs by Return Rate</h2>
          <BarChart
            data={highReturnRate.map(s => ({ name: s.sku, rate: s.return_rate }))}
            xKey="name" layout="vertical" height={isMobile ? 220 : 300}
            bars={[{ key: 'rate', label: 'Return Rate %' }]}
            tickFormatter={v => `${v}%`}
            colorFn={row => row.rate > 10 ? '#DC2626' : row.rate > 5 ? '#D97706' : '#737373'}
          />
        </div>
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>All Refunded SKUs</h2>
      <DataTable columns={columns} data={skus} searchable searchKeys={['sku', 'title']} pageSize={25} />
    </div>
  )
}
