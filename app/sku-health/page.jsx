'use client'
import { useState, useEffect } from 'react'
import MetricCard from '@/components/MetricCard'
import StatusBadge from '@/components/StatusBadge'
import DataTable from '@/components/DataTable'
import RadarChart from '@/components/charts/RadarChart'
import DonutChart from '@/components/charts/DonutChart'
import { formatPct, formatNumber, formatCurrency } from '@/lib/formatters'
import { X } from 'lucide-react'

function Drawer({ sku, onClose }) {
  if (!sku) return null
  const radarData = [
    { subject: 'Conversion', value: sku.scores.conversion },
    { subject: 'Traffic', value: sku.scores.traffic },
    { subject: 'Buy Box', value: sku.scores.buy_box },
    { subject: 'Return Rate', value: sku.scores.return_rate },
    { subject: 'Inventory', value: sku.scores.inventory_efficiency },
    { subject: 'B2B', value: sku.scores.b2b },
  ]

  let action = ''
  if (sku.classification === 'INVEST') action = 'Strong performer. Increase ad budget and ensure adequate inventory.'
  else if (sku.classification === 'WATCH' && sku.scores.conversion < 50) action = 'Conversion below catalog average. Review listing quality and pricing.'
  else if (sku.classification === 'WATCH' && sku.scores.traffic < 50) action = 'Low session volume. Consider running a deal or improving keywords.'
  else if (sku.classification === 'DISCONTINUE' && sku.metrics.return_rate > 5) action = 'High return rate. Review product quality and listing accuracy.'
  else action = 'No sales movement. Evaluate liquidation or removal.'

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 480, background: '#FFF', border: '1px solid #E5E5E5', boxShadow: '-4px 0 24px rgba(0,0,0,0.08)', zIndex: 100, overflowY: 'auto', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: '#737373', marginBottom: 4 }}>{sku.asin}</div>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{sku.sku}</h2>
          <p style={{ fontSize: 12, color: '#737373', margin: '4px 0 0', lineHeight: 1.4 }}>{sku.title?.slice(0, 80)}</p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ fontSize: 36, fontWeight: 800, color: '#000' }}>{sku.overall_score}</div>
        <StatusBadge status={sku.classification} />
      </div>
      <RadarChart data={radarData} height={260} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16, marginBottom: 20 }}>
        {[
          ['Sessions', formatNumber(sku.metrics.sessions)],
          ['Conversion', formatPct(sku.metrics.conversion_rate)],
          ['Buy Box %', formatPct(sku.metrics.buy_box_pct)],
          ['Return Rate', formatPct(sku.metrics.return_rate)],
          ['Days Cover', sku.metrics.days_cover !== null ? `${sku.metrics.days_cover}d` : 'N/A'],
          ['B2B Revenue', formatCurrency(sku.metrics.b2b_revenue)],
        ].map(([label, val]) => (
          <div key={label} style={{ background: '#FAFAFA', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#000', marginTop: 2 }}>{val}</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#FAFAFA', border: '1px solid #E5E5E5', borderRadius: 8, padding: '12px 14px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#737373', marginBottom: 6 }}>Recommended Action</div>
        <p style={{ margin: 0, fontSize: 13, color: '#000', lineHeight: 1.5 }}>{action}</p>
      </div>
    </div>
  )
}

export default function SKUHealthPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetch('/api/engines/sku-health').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return <div style={{ padding: 40, color: '#737373' }}>Loading...</div>

  const invest = data.filter(s => s.classification === 'INVEST').length
  const watch = data.filter(s => s.classification === 'WATCH').length
  const disc = data.filter(s => s.classification === 'DISCONTINUE').length

  const filtered = filter === 'All' ? data : data.filter(s => s.classification === filter)

  const tableData = filtered.map(s => ({ ...s, _onClick: () => setSelected(s) }))

  const columns = [
    { key: 'sku', label: 'SKU', sortable: true },
    { key: 'title', label: 'Title', wrap: true, sortable: false, render: v => <span style={{ maxWidth: 280, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span> },
    { key: 'overall_score', label: 'Score', sortable: true, render: (v, row) => <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><strong>{v}</strong><StatusBadge status={row.classification} /></span> },
    { key: 'scores', label: 'Conv.', sortable: false, render: (v) => <span>{v?.conversion ?? '—'}</span> },
    { key: 'scores', label: 'Traffic', sortable: false, render: (v) => <span>{v?.traffic ?? '—'}</span> },
    { key: 'metrics', label: 'Buy Box%', sortable: false, render: (v) => formatPct(v?.buy_box_pct) },
    { key: 'metrics', label: 'Return Rate', sortable: false, render: (v) => formatPct(v?.return_rate) },
    { key: 'metrics', label: 'Days Cover', sortable: false, render: (v) => v?.days_cover !== null && v?.days_cover !== undefined ? `${v.days_cover}d` : 'N/A' },
    { key: 'classification', label: 'Class', sortable: true, render: v => <StatusBadge status={v} /> },
  ]

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>SKU Health Score</h1>
      <p style={{ fontSize: 13, color: '#737373', margin: '0 0 24px' }}>Monthly performance scoring across 6 dimensions</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <MetricCard label="Total SKUs" value={data.length} />
        <MetricCard label="INVEST" value={invest} color="#16A34A" />
        <MetricCard label="WATCH" value={watch} color="#D97706" />
        <MetricCard label="DISCONTINUE" value={disc} color="#DC2626" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 12 }}>Score Distribution</h2>
          <div style={{ display: 'flex', gap: 4 }}>
            {[0, 20, 40, 60, 80].map(bucket => {
              const count = data.filter(s => s.overall_score >= bucket && s.overall_score < bucket + 20).length
              const pct = (count / data.length) * 100
              return (
                <div key={bucket} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ height: 80, display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{ width: '100%', background: bucket >= 60 ? '#16A34A' : bucket >= 40 ? '#D97706' : '#DC2626', borderRadius: '4px 4px 0 0', height: `${Math.max(4, pct)}%`, opacity: 0.8 }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#737373', marginTop: 4 }}>{bucket}–{bucket + 20}</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{count}</div>
                </div>
              )
            })}
          </div>
        </div>
        <div style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 12 }}>Classification Split</h2>
          <DonutChart
            data={[
              { name: 'INVEST', value: invest },
              { name: 'WATCH', value: watch },
              { name: 'DISCONTINUE', value: disc },
            ]}
            colors={['#16A34A', '#D97706', '#DC2626']}
            height={180}
          />
        </div>
      </div>

      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>All SKUs</h2>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          style={{ padding: '6px 12px', border: '1px solid #000', borderRadius: 8, fontSize: 13, background: '#FFF', cursor: 'pointer' }}>
          {['All', 'INVEST', 'WATCH', 'DISCONTINUE'].map(f => <option key={f}>{f}</option>)}
        </select>
        <span style={{ fontSize: 12, color: '#737373' }}>Showing {filtered.length} SKUs · Click row for details</span>
      </div>

      <DataTable columns={columns} data={tableData} searchable searchKeys={['sku', 'title', 'asin']} pageSize={25} />

      {selected && <Drawer sku={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
