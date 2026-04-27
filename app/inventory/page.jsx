'use client'
import { useState, useEffect } from 'react'
import MetricCard from '@/components/MetricCard'
import StatusBadge from '@/components/StatusBadge'
import DataTable from '@/components/DataTable'
import BarChart from '@/components/charts/BarChart'
import { formatCurrency, formatNumber } from '@/lib/formatters'


export default function InventoryPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('active')

  useEffect(() => {
    fetch('/api/engines/inventory').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading || !data) return <div style={{ padding: 40, color: '#737373' }}>Loading...</div>

  const { summary, skus, dead_inventory } = data

  const topDays = [...skus].filter(s => s.days_remaining !== null).sort((a, b) => a.days_remaining - b.days_remaining).slice(0, 20)
  const topDead = [...dead_inventory].sort((a, b) => b.units_stuck - a.units_stuck).slice(0, 10)

  const shrinkage = skus.filter(s => s.lost_units > 0 || s.damaged_units > 0)

  const activeColumns = [
    { key: 'msku', label: 'SKU', sortable: true },
    { key: 'title', label: 'Title', sortable: false, render: v => <span style={{ maxWidth: 260, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span> },
    { key: 'current_stock', label: 'Stock', sortable: true, align: 'right' },
    { key: 'daily_velocity', label: 'Velocity/day', sortable: true, align: 'right' },
    { key: 'days_remaining', label: 'Days Left', sortable: true, align: 'right', render: v => v !== null ? v : '∞' },
    { key: 'stockout_date', label: 'Stockout Date', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: v => <StatusBadge status={v} /> },
    { key: 'recommended_qty', label: 'Recom. Qty', sortable: false, align: 'right', render: v => v || '—' },
    { key: 'reorder_by', label: 'Reorder By', sortable: false },
    { key: 'location', label: 'Location', sortable: false },
  ]

  const deadColumns = [
    { key: 'msku', label: 'SKU', sortable: true },
    { key: 'title', label: 'Title', sortable: false, render: v => <span style={{ maxWidth: 260, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span> },
    { key: 'units_stuck', label: 'Units Stuck', sortable: true, align: 'right' },
    { key: 'estimated_monthly_cost', label: 'Est. Cost/Month *', sortable: true, align: 'right', render: v => <span style={{ color: '#D97706' }}>{formatCurrency(v)}</span> },
    { key: 'recommended_action', label: 'Action', sortable: true, render: v => <span style={{ fontWeight: 600 }}>{v}</span> },
    { key: 'action_reason', label: 'Reason', sortable: false, wrap: true },
  ]

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>Inventory Intelligence</h1>
      <p style={{ fontSize: 13, color: '#A3A3A3', margin: '0 0 4px' }}>Velocity based on 2-day window. Accuracy improves with more data.</p>

      <div className="rg-4">
        <MetricCard label="Critical Stockout" value={summary.critical_stockout} color="#DC2626" sub="< 7 days remaining" />
        <MetricCard label="Warning Stockout" value={summary.warning_stockout} color="#D97706" sub="7–15 days remaining" />
        <MetricCard label="Dead Inventory SKUs" value={summary.dead_inventory_skus} color="#737373" />
        <MetricCard label="Dead Storage Cost" value={formatCurrency(summary.estimated_dead_storage_cost_monthly)} color="#D97706" sub="est. ₹20/unit/month · not from FBA fee report" />
      </div>

      <div className="rg-2">
        <div style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 12 }}>Top 20 SKUs by Days Remaining</h2>
          <BarChart
            data={topDays.map(s => ({ name: s.msku, days: s.days_remaining }))}
            xKey="name"
            bars={[{ key: 'days', label: 'Days' }]}
            layout="vertical"
            height={400}
            colorFn={row => {
              const d = row.days
              if (d < 7) return '#DC2626'
              if (d < 15) return '#D97706'
              if (d < 30) return '#EAB308'
              return '#16A34A'
            }}
          />
        </div>
        <div style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 12 }}>Top 10 Dead Inventory by Units</h2>
          <BarChart
            data={topDead.map(s => ({ name: s.msku, units: s.units_stuck }))}
            xKey="name"
            bars={[{ key: 'units', label: 'Units Stuck', color: '#737373' }]}
            layout="vertical"
            height={300}
          />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[['active', 'Active Inventory'], ['dead', 'Dead Inventory'], ['shrinkage', 'Shrinkage Tracker']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '7px 16px', border: '1px solid', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: tab === key ? 600 : 400,
            background: tab === key ? '#000' : '#FFF', color: tab === key ? '#FFF' : '#000', borderColor: tab === key ? '#000' : '#E5E5E5'
          }}>{label}</button>
        ))}
      </div>

      {tab === 'active' && <DataTable columns={activeColumns} data={skus} searchable searchKeys={['msku', 'title']} pageSize={25} />}
      {tab === 'dead' && (
        <>
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '9px 14px', marginBottom: 12, fontSize: 12, color: '#B45309', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>⚠</span>
            <span>
              Storage cost is estimated at <strong>₹20/unit/month</strong> (approximate FBA standard rate).
              Actual fees vary by size tier, category, and storage duration. For exact figures, download the <strong>FBA Fee Preview</strong> or <strong>Long-Term Storage Fee</strong> report from Seller Central.
            </span>
          </div>
          <DataTable columns={deadColumns} data={dead_inventory} searchable searchKeys={['msku', 'title']} pageSize={25} />
        </>
      )}
      {tab === 'shrinkage' && (
        <DataTable
          columns={[
            { key: 'msku', label: 'SKU' },
            { key: 'title', label: 'Title', render: v => <span style={{ maxWidth: 300, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span> },
            { key: 'lost_units', label: 'Lost Units', align: 'right' },
            { key: 'damaged_units', label: 'Damaged Units', align: 'right' },
            { key: 'current_stock', label: 'Current Stock', align: 'right' },
          ]}
          data={shrinkage}
          pageSize={25}
        />
      )}
    </div>
  )
}
