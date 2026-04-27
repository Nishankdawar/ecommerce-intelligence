'use client'
import { useState, useEffect } from 'react'
import MetricCard from '@/components/MetricCard'
import StatusBadge from '@/components/StatusBadge'
import DataTable from '@/components/DataTable'
import RadarChart from '@/components/charts/RadarChart'
import DonutChart from '@/components/charts/DonutChart'
import Tooltip, { LabelWithTooltip } from '@/components/Tooltip'
import { formatPct, formatNumber, formatCurrency } from '@/lib/formatters'
import { SKU_HEALTH_DIMENSIONS, SKU_HEALTH_OVERALL } from '@/lib/constants'
import { X, ChevronDown, ChevronUp } from 'lucide-react'

function ScoringMethodology() {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ background: '#FAFAFA', border: '1px solid #E5E5E5', borderRadius: 12, marginBottom: 24 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#000' }}>How is the Health Score calculated?</span>
          <span style={{ fontSize: 12, color: '#737373', marginLeft: 10 }}>6 dimensions · weighted average</span>
        </div>
        {open ? <ChevronUp size={16} color="#737373" /> : <ChevronDown size={16} color="#737373" />}
      </button>

      {open && (
        <div style={{ borderTop: '1px solid #E5E5E5', padding: '20px' }}>
          {/* Overall formula */}
          <div style={{ background: '#000', color: '#FFF', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 12, fontFamily: 'monospace', lineHeight: 1.7, overflowX: 'auto', wordBreak: 'break-word' }}>
            <div style={{ fontSize: 11, color: '#A3A3A3', marginBottom: 6, fontFamily: 'inherit', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Overall Score Formula</div>
            {SKU_HEALTH_OVERALL.formula}
          </div>

          {/* Classification thresholds — horizontally scrollable on mobile */}
          <div style={{ overflowX: 'auto', marginBottom: 20, paddingBottom: 4 }}>
            <div style={{ display: 'flex', gap: 10, minWidth: 480 }}>
              {SKU_HEALTH_OVERALL.classifications.map(c => (
                <div key={c.label} style={{ flex: 1, minWidth: 150, background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 8, padding: '12px 14px', borderLeft: `3px solid ${c.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <StatusBadge status={c.label} />
                    <span style={{ fontSize: 12, color: '#737373' }}>{c.range}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: '#525252', lineHeight: 1.5 }}>{c.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Per-dimension breakdown */}
          <div className="rg-2" style={{ marginBottom: 0 }}>
            {Object.values(SKU_HEALTH_DIMENSIONS).map(dim => (
              <div key={dim.label} style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{dim.label}</span>
                  <span style={{ fontSize: 11, background: '#F5F5F5', border: '1px solid #E5E5E5', borderRadius: 999, padding: '2px 8px', color: '#525252' }}>weight {dim.weight}</span>
                </div>
                <p style={{ margin: '0 0 8px', fontSize: 12, color: '#525252', lineHeight: 1.5 }}>{dim.tooltip}</p>
                <div style={{ background: '#F5F5F5', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontFamily: 'monospace', color: '#000', marginBottom: 8 }}>
                  {dim.formula}
                </div>
                <div style={{ fontSize: 11, color: '#737373', marginBottom: 6 }}>
                  <span style={{ fontWeight: 500 }}>Source:</span> {dim.source}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {dim.thresholds.map(t => (
                    <div key={t.range} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#525252' }}>
                      <span>{t.range}</span>
                      <span style={{ fontWeight: 600, color: '#000' }}>{t.score} pts</span>
                    </div>
                  ))}
                </div>
                {dim.note && (
                  <div style={{ marginTop: 8, fontSize: 11, color: '#A3A3A3', fontStyle: 'italic', lineHeight: 1.4 }}>{dim.note}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <div style={{ fontSize: 36, fontWeight: 800, color: '#000' }}>{sku.overall_score}</div>
        <div>
          <StatusBadge status={sku.classification} />
          <div style={{ fontSize: 11, color: '#737373', marginTop: 4 }}>
            {sku.classification === 'INVEST' && 'Score ≥ 70 · strong performer'}
            {sku.classification === 'WATCH' && 'Score 40–69 · needs attention'}
            {sku.classification === 'DISCONTINUE' && 'Score < 40 · poor performance'}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: '#737373', marginBottom: 16 }}>
        Overall = Conversion×0.25 + Traffic×0.20 + Buy Box×0.20 + Return Rate×0.15 + Inventory×0.10 + B2B×0.10
      </div>
      <RadarChart data={radarData} height={260} />
      <div className="rg-2" style={{ marginTop: 16, marginBottom: 20, gap: 10 }}>
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

  const D = SKU_HEALTH_DIMENSIONS
  const columns = [
    { key: 'sku', label: 'SKU', sortable: true },
    { key: 'title', label: 'Title', wrap: true, sortable: false, render: v => <span style={{ maxWidth: 280, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span> },
    { key: 'overall_score', label: 'Score', sortable: true, render: (v, row) => <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><strong>{v}</strong><StatusBadge status={row.classification} /></span> },
    { key: 'scores', label: <LabelWithTooltip label="Conv." tooltip={`${D.conversion.label} (${D.conversion.weight}) — ${D.conversion.tooltip}`} />, sortable: false, render: (v) => <span>{v?.conversion ?? '—'}</span> },
    { key: 'scores', label: <LabelWithTooltip label="Traffic" tooltip={`${D.traffic.label} (${D.traffic.weight}) — ${D.traffic.tooltip}`} />, sortable: false, render: (v) => <span>{v?.traffic ?? '—'}</span> },
    { key: 'metrics', label: <LabelWithTooltip label="Buy Box%" tooltip={D.buy_box.tooltip} />, sortable: false, render: (v) => formatPct(v?.buy_box_pct) },
    { key: 'metrics', label: <LabelWithTooltip label="Return Rate" tooltip={D.return_rate.tooltip} />, sortable: false, render: (v) => formatPct(v?.return_rate) },
    { key: 'metrics', label: <LabelWithTooltip label="Days Cover" tooltip={D.inventory_efficiency.tooltip} />, sortable: false, render: (v) => v?.days_cover !== null && v?.days_cover !== undefined ? `${v.days_cover}d` : 'N/A' },
    { key: 'classification', label: 'Class', sortable: true, render: v => <StatusBadge status={v} /> },
  ]

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>SKU Health Score</h1>
      <p style={{ fontSize: 13, color: '#737373', margin: '0 0 20px' }}>Monthly performance scoring across 6 dimensions · weighted average</p>

      <ScoringMethodology />

      <div className="rg-4">
        <MetricCard label="Total SKUs" value={data.length} sub="scored this month" />
        <MetricCard
          label="INVEST"
          value={invest}
          color="#16A34A"
          sub={
            <Tooltip content="Score ≥ 70 · Strong performer across most dimensions. Prioritise ad spend, stock replenishment, and growth initiatives.">
              <span style={{ cursor: 'help', borderBottom: '1px dashed #A3A3A3' }}>Score ≥ 70 · what does this mean?</span>
            </Tooltip>
          }
        />
        <MetricCard
          label="WATCH"
          value={watch}
          color="#D97706"
          sub={
            <Tooltip content="Score 40–69 · Underperforming in at least one key dimension. Investigate weak scores (e.g. low conversion, poor Buy Box, high returns) and take corrective action.">
              <span style={{ cursor: 'help', borderBottom: '1px dashed #A3A3A3' }}>Score 40–69 · what does this mean?</span>
            </Tooltip>
          }
        />
        <MetricCard
          label="DISCONTINUE"
          value={disc}
          color="#DC2626"
          sub={
            <Tooltip content="Score < 40 · Consistently poor performance across multiple dimensions. Evaluate listing improvements, price corrections, or consider removing from catalog.">
              <span style={{ cursor: 'help', borderBottom: '1px dashed #A3A3A3' }}>Score &lt; 40 · what does this mean?</span>
            </Tooltip>
          }
        />
      </div>

      <div className="rg-21">
        <div style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>Score Distribution</h2>
              <p style={{ margin: 0, fontSize: 12, color: '#737373' }}>Overall Health Score = weighted average of 6 dimensions</p>
            </div>
          </div>
          {/* Dimension weight pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {Object.values(SKU_HEALTH_DIMENSIONS).map(dim => (
              <Tooltip key={dim.label} content={
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{dim.label} · {dim.weight}</div>
                  <div style={{ color: '#D4D4D4', marginBottom: 6 }}>{dim.tooltip}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#A3A3A3' }}>{dim.formula}</div>
                </div>
              } maxWidth={300}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#F5F5F5', border: '1px solid #E5E5E5', borderRadius: 999, padding: '3px 10px', fontSize: 11, cursor: 'help', color: '#525252' }}>
                  {dim.label} <span style={{ fontWeight: 600, color: '#000' }}>{dim.weight}</span>
                </span>
              </Tooltip>
            ))}
          </div>
          {/* Histogram */}
          <div style={{ display: 'flex', gap: 4 }}>
            {[0, 20, 40, 60, 80].map(bucket => {
              const count = data.filter(s => s.overall_score >= bucket && s.overall_score < bucket + 20).length
              const pct = (count / data.length) * 100
              const label = bucket >= 60 ? 'INVEST' : bucket >= 40 ? 'WATCH' : 'DISCONTINUE'
              return (
                <Tooltip key={bucket} content={`${count} SKUs score ${bucket}–${bucket + 20} · ${label}`}>
                  <div style={{ flex: 1, textAlign: 'center', cursor: 'default' }}>
                    <div style={{ height: 80, display: 'flex', alignItems: 'flex-end' }}>
                      <div style={{ width: '100%', background: bucket >= 60 ? '#16A34A' : bucket >= 40 ? '#D97706' : '#DC2626', borderRadius: '4px 4px 0 0', height: `${Math.max(4, pct)}%`, opacity: 0.8 }} />
                    </div>
                    <div style={{ fontSize: 10, color: '#737373', marginTop: 4 }}>{bucket}–{bucket + 20}</div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{count}</div>
                  </div>
                </Tooltip>
              )
            })}
          </div>
        </div>
        <div style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 4 }}>Classification Split</h2>
          <DonutChart
            data={[
              { name: 'INVEST', value: invest },
              { name: 'WATCH', value: watch },
              { name: 'DISCONTINUE', value: disc },
            ]}
            colors={['#16A34A', '#D97706', '#DC2626']}
            height={160}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {SKU_HEALTH_OVERALL.classifications.map(c => (
              <div key={c.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color, flexShrink: 0, marginTop: 3 }} />
                <div>
                  <span style={{ fontWeight: 600, color: c.color }}>{c.label}</span>
                  <span style={{ color: '#737373' }}> ({c.range}) — </span>
                  <span style={{ color: '#525252' }}>{c.description}</span>
                </div>
              </div>
            ))}
          </div>
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
