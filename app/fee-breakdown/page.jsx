'use client'
import DataRequired from '@/components/DataRequired'
import { useState, useEffect } from 'react'
import MetricCard from '@/components/MetricCard'
import DataTable from '@/components/DataTable'
import DonutChart from '@/components/charts/DonutChart'
import BarChart from '@/components/charts/BarChart'
import { formatCurrency, formatPct } from '@/lib/formatters'
import { useIsMobile } from '@/lib/hooks'

const FEE_COLORS = ['#000', '#525252', '#737373', '#A3A3A3', '#D4D4D4', '#E5E5E5', '#DC2626', '#D97706']

export default function FeeBreakdownPage() {
  const isMobile = useIsMobile()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/engines/fee-breakdown').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading || !data) return <div style={{ padding: 40, color: '#737373' }}>Loading...</div>

  if (data?._unavailable) return <DataRequired moduleName="Fee Breakdown" missingFiles={data.missing_files || []} />

  const { catalog_summary, skus } = data

  const columns = [
    { key: 'sku', label: 'SKU', sortable: true },
    { key: 'revenue', label: 'Revenue', sortable: true, align: 'right', render: v => formatCurrency(v) },
    { key: 'total_fees', label: 'Total Fees', sortable: true, align: 'right', render: v => <span style={{ color: '#DC2626' }}>{formatCurrency(v)}</span> },
    { key: 'fee_pct', label: 'Fee %', sortable: true, align: 'right', render: v => <span style={{ fontWeight: 600, color: v > 40 ? '#DC2626' : v > 30 ? '#D97706' : '#16A34A' }}>{formatPct(v)}</span> },
    { key: 'commission', label: 'Commission', sortable: true, align: 'right', render: v => formatCurrency(v) },
    { key: 'fba_fulfillment', label: 'FBA Fees', sortable: true, align: 'right', render: v => formatCurrency(v) },
    { key: 'closing_fee', label: 'Closing Fee', sortable: true, align: 'right', render: v => formatCurrency(v) },
    { key: 'tech_fee', label: 'Tech Fee', sortable: true, align: 'right', render: v => formatCurrency(v) },
  ]

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>Fee Breakdown</h1>
      <p style={{ fontSize: 13, color: '#737373', margin: '0 0 20px' }}>March 2026 · Where Amazon takes its cut</p>

      <div className="rg-4">
        <MetricCard label="Total Revenue" value={formatCurrency(catalog_summary.total_revenue)} />
        <MetricCard label="Total Fees" value={formatCurrency(catalog_summary.total_fees)} color="#DC2626" sub={`${formatPct(catalog_summary.fee_pct_of_revenue)} of revenue`} />
        {catalog_summary.by_type.slice(0, 2).map(t => (
          <MetricCard key={t.type} label={t.type} value={formatCurrency(t.amount)} color="#737373" sub={`${formatPct(t.pct)} of revenue`} />
        ))}
      </div>

      <div className="rg-2">
        <div style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 12 }}>Fee Type Distribution</h2>
          <DonutChart
            data={catalog_summary.by_type.map(t => ({ name: t.type, value: t.amount }))}
            colors={FEE_COLORS}
            formatter={v => [formatCurrency(v)]}
            height={220}
          />
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {catalog_summary.by_type.map((t, i) => (
              <div key={t.type} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid #F5F5F5' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: FEE_COLORS[i], flexShrink: 0 }} />
                  {t.type}
                </span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(t.amount)} <span style={{ color: '#737373', fontWeight: 400 }}>({formatPct(t.pct)})</span></span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 4 }}>Top 20 SKUs by Fee %</h2>
          <p style={{ fontSize: 12, color: '#737373', margin: '0 0 12px' }}>SKUs where fees are highest relative to revenue</p>
          <BarChart
            data={skus.slice(0, 20).map(s => ({ name: s.sku, fee_pct: s.fee_pct }))}
            xKey="name" layout="vertical" height={isMobile ? 320 : 480}
            bars={[{ key: 'fee_pct', label: 'Fee %' }]}
            tickFormatter={v => `${v}%`}
            colorFn={row => row.fee_pct > 40 ? '#DC2626' : row.fee_pct > 30 ? '#D97706' : '#737373'}
          />
        </div>
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>All SKUs — Fee Breakdown</h2>
      <DataTable columns={columns} data={skus} searchable searchKeys={['sku']} pageSize={25} />
    </div>
  )
}
