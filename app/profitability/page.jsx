'use client'
import { useState, useEffect } from 'react'
import MetricCard from '@/components/MetricCard'
import StatusBadge from '@/components/StatusBadge'
import DataTable from '@/components/DataTable'
import BarChart from '@/components/charts/BarChart'
import { formatCurrency, formatPct } from '@/lib/formatters'
import { X } from 'lucide-react'
import { useIsMobile } from '@/lib/hooks'

function ProfitDrawer({ sku, onClose }) {
  const isMobile = useIsMobile()
  if (!sku) return null
  const b = sku.breakdown
  const steps = [
    { label: 'Gross Revenue', value: sku.gross_revenue, type: 'positive' },
    { label: 'Commission', value: -b.commission, type: 'fee' },
    { label: 'FBA Fulfillment', value: -b.fba_fulfillment, type: 'fee' },
    { label: 'Closing Fee', value: -b.closing_fee, type: 'fee' },
    { label: 'Technology Fee', value: -b.tech_fee, type: 'fee' },
    { label: 'Promo Rebates', value: -b.promo, type: 'fee' },
    { label: 'TCS', value: -b.tcs, type: 'fee' },
    { label: 'TDS', value: -b.tds, type: 'fee' },
    { label: 'Refunds', value: b.refunds, type: b.refunds < 0 ? 'fee' : 'neutral' },
    { label: 'Reimbursements', value: b.reimbursement, type: b.reimbursement > 0 ? 'positive' : 'neutral' },
  ].filter(s => s.value !== 0)

  return (
    <div style={{ position: 'fixed', top: isMobile ? 52 : 0, right: 0, bottom: 0, width: isMobile ? '100%' : 420, background: '#FFF', border: '1px solid #E5E5E5', boxShadow: '-4px 0 24px rgba(0,0,0,0.08)', zIndex: 100, overflowY: 'auto', padding: isMobile ? 16 : 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: '#737373', marginBottom: 2 }}>SKU Profitability</div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{sku.sku}</h2>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
      </div>
      <div className="rg-3" style={{ marginBottom: 16, gap: 8 }}>
        <div style={{ background: '#F5F5F5', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: '#737373' }}>Gross</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{formatCurrency(sku.gross_revenue)}</div>
        </div>
        <div style={{ background: '#F0FDF4', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: '#737373' }}>Net</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#16A34A' }}>{formatCurrency(sku.net_proceeds)}</div>
        </div>
        <div style={{ background: sku.margin_pct < 50 ? '#FFF1F1' : '#F0FDF4', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: '#737373' }}>Margin</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: sku.margin_pct < 50 ? '#DC2626' : '#16A34A' }}>{formatPct(sku.margin_pct)}</div>
        </div>
      </div>

      <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Revenue → Net Proceeds Breakdown</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {steps.map(step => (
          <div key={step.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#FAFAFA', borderRadius: 6 }}>
            <span style={{ fontSize: 13, color: '#525252' }}>{step.label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: step.type === 'fee' ? '#DC2626' : step.type === 'positive' ? '#000' : '#16A34A' }}>
              {step.value >= 0 ? '+' : ''}{formatCurrency(step.value)}
            </span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#000', borderRadius: 8, marginTop: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#FFF' }}>Net Proceeds</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#FFF' }}>{formatCurrency(sku.net_proceeds)}</span>
        </div>
      </div>
    </div>
  )
}

export default function ProfitabilityPage() {
  const isMobile = useIsMobile()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetch('/api/engines/profitability').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading || !data) return <div style={{ padding: 40, color: '#737373' }}>Loading...</div>

  const { summary, skus } = data
  const top15 = skus.slice(0, 15)
  const bottom10 = [...skus].filter(s => s.margin_pct > 0).sort((a, b) => a.margin_pct - b.margin_pct).slice(0, 10)

  const columns = [
    { key: 'sku', label: 'SKU', sortable: true },
    { key: 'units', label: 'Units', sortable: true, align: 'right' },
    { key: 'gross_revenue', label: 'Gross Revenue', sortable: true, align: 'right', render: v => formatCurrency(v) },
    { key: 'total_fees', label: 'Total Fees', sortable: true, align: 'right', render: v => <span style={{ color: '#DC2626' }}>−{formatCurrency(v)}</span> },
    { key: 'net_proceeds', label: 'Net Proceeds', sortable: true, align: 'right', render: v => <span style={{ fontWeight: 600, color: v < 0 ? '#DC2626' : '#16A34A' }}>{formatCurrency(v)}</span> },
    { key: 'margin_pct', label: 'Margin %', sortable: true, align: 'right', render: v => <span style={{ fontWeight: 600, color: v < 40 ? '#DC2626' : v < 60 ? '#D97706' : '#16A34A' }}>{formatPct(v)}</span> },
    { key: 'fee_pct', label: 'Fee %', sortable: true, align: 'right', render: v => <span style={{ color: v > 40 ? '#DC2626' : '#737373' }}>{formatPct(v)}</span> },
  ]

  const tableData = skus.map(s => ({ ...s, _onClick: () => setSelected(s) }))

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>SKU Profitability</h1>
      <p style={{ fontSize: 13, color: '#737373', margin: '0 0 20px' }}>March 2026 · Net proceeds after all Amazon fees, TDS, TCS · Click any SKU for full breakdown</p>

      <div className="rg-4" style={{ marginBottom: 20 }}>
        <MetricCard label="Gross Revenue" value={formatCurrency(summary.total_gross_revenue)} />
        <MetricCard label="Total Fees Paid" value={formatCurrency(summary.total_fees_paid)} color="#DC2626" sub="commission + FBA + closing + tech" />
        <MetricCard label="Net Proceeds" value={formatCurrency(summary.total_net_proceeds)} color="#16A34A" />
        <MetricCard label="Avg Margin" value={formatPct(summary.avg_margin_pct)} color={summary.avg_margin_pct < 60 ? '#D97706' : '#16A34A'} sub={`${summary.fee_heavy_skus} SKUs with fees >40%`} />
      </div>

      {summary.fee_heavy_skus > 0 && (
        <div style={{ background: '#FFF1F1', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#B91C1C' }}>
          ⚠ <strong>{summary.fee_heavy_skus} SKUs</strong> have Amazon fees exceeding 40% of selling price. Consider repricing or switching from FBA to MFN for these items.
        </div>
      )}

      <div className="rg-2">
        <div style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 12 }}>Top 15 SKUs by Gross Revenue</h2>
          <BarChart
            data={top15.map(s => ({ name: s.sku, gross: s.gross_revenue, net: s.net_proceeds }))}
            xKey="name" layout="vertical" height={isMobile ? 280 : 400}
            bars={[
              { key: 'gross', label: 'Gross Revenue', color: '#E5E5E5', stack: 'a' },
              { key: 'net', label: 'Net Proceeds', color: '#000', stack: 'b' },
            ]}
            tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`}
          />
        </div>
        <div style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 4 }}>Lowest Margin SKUs</h2>
          <p style={{ fontSize: 12, color: '#737373', margin: '0 0 12px' }}>SKUs where fees are eating the most into revenue</p>
          <BarChart
            data={bottom10.map(s => ({ name: s.sku, margin: s.margin_pct }))}
            xKey="name" layout="vertical" height={isMobile ? 220 : 320}
            bars={[{ key: 'margin', label: 'Margin %' }]}
            tickFormatter={v => `${v}%`}
            colorFn={row => row.margin < 40 ? '#DC2626' : row.margin < 60 ? '#D97706' : '#16A34A'}
          />
        </div>
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>All SKUs · Click row for full breakdown</h2>
      <DataTable columns={columns} data={tableData} searchable searchKeys={['sku']} pageSize={25} />
      {selected && <ProfitDrawer sku={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
