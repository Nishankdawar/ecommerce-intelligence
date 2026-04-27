'use client'
import { useState, useEffect } from 'react'
import AlertCard from '@/components/AlertCard'
import BarChart from '@/components/charts/BarChart'
import { formatCurrency, formatNumber } from '@/lib/formatters'

const alertTypes = ['STOCKOUT_IMMINENT', 'SHIPMENT_DELAY', 'DEAD_INVENTORY', 'CONCENTRATION_RISK']

export default function AlertsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sevFilter, setSevFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')

  useEffect(() => {
    fetch('/api/engines/alerts').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading || !data) return <div style={{ padding: 40, color: '#737373' }}>Loading...</div>

  const { summary, alerts, shipment_stats } = data

  const filtered = alerts.filter(a => {
    if (sevFilter !== 'All' && a.severity !== sevFilter) return false
    if (typeFilter !== 'All' && a.type !== typeFilter) return false
    return true
  })

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 24px' }}>Operational Alerts</h1>

      {/* Severity counts */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFF1F1', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 20px' }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#DC2626' }}>🔴 {summary.critical}</span>
          <span style={{ fontSize: 13, color: '#B91C1C' }}>Critical</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 20px' }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#D97706' }}>🟠 {summary.warning}</span>
          <span style={{ fontSize: 13, color: '#B45309' }}>Warning</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F5F5F5', border: '1px solid #E5E5E5', borderRadius: 10, padding: '10px 20px' }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#525252' }}>🔵 {summary.info}</span>
          <span style={{ fontSize: 13, color: '#525252' }}>Info</span>
        </div>
      </div>

      {/* Shipment delay detail */}
      {shipment_stats && (
        <div style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 16 }}>Shipment Performance</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            {[
              ['Total Shipments', formatNumber(shipment_stats.total_shipments)],
              ['Delayed', formatNumber(shipment_stats.delayed_count)],
              ['Delay Rate', `${shipment_stats.delay_rate}%`],
              ['Avg Delay', `${shipment_stats.avg_delay_days} days`],
              ['Overdue Pending', formatNumber(shipment_stats.overdue_pending)],
            ].map(([label, val]) => (
              <div key={label} style={{ background: '#FAFAFA', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#737373' }}>Severity:</span>
        {['All', 'CRITICAL', 'WARNING', 'INFO'].map(s => (
          <button key={s} onClick={() => setSevFilter(s)} style={{
            padding: '5px 14px', border: '1px solid', borderRadius: 8, fontSize: 12, cursor: 'pointer',
            background: sevFilter === s ? '#000' : '#FFF', color: sevFilter === s ? '#FFF' : '#000', borderColor: sevFilter === s ? '#000' : '#E5E5E5',
          }}>{s}</button>
        ))}
        <span style={{ fontSize: 13, color: '#737373', marginLeft: 8 }}>Type:</span>
        {['All', ...alertTypes].map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} style={{
            padding: '5px 14px', border: '1px solid', borderRadius: 8, fontSize: 12, cursor: 'pointer',
            background: typeFilter === t ? '#000' : '#FFF', color: typeFilter === t ? '#FFF' : '#000', borderColor: typeFilter === t ? '#000' : '#E5E5E5',
          }}>{t === 'All' ? 'All' : t.replace(/_/g, ' ')}</button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: '#737373', marginBottom: 12 }}>{filtered.length} alerts</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(a => <AlertCard key={a.id} alert={a} />)}
        {filtered.length === 0 && (
          <div style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: 32, textAlign: 'center', color: '#A3A3A3', fontSize: 13 }}>
            No alerts matching current filters.
          </div>
        )}
      </div>
    </div>
  )
}
