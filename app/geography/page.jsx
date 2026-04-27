'use client'
import { useState, useEffect } from 'react'
import DataTable from '@/components/DataTable'
import BarChart from '@/components/charts/BarChart'
import { formatCurrency, formatNumber } from '@/lib/formatters'

export default function GeographyPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/engines/geography').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading || !data) return <div style={{ padding: 40, color: '#737373' }}>Loading...</div>

  const { by_state, by_city, by_sku } = data

  // Top 15 states by AOV — only include states with ≥5 orders to avoid noise
  const aovData = [...by_state]
    .filter(s => s.orders >= 5 && s.avg_order_value > 0)
    .sort((a, b) => b.avg_order_value - a.avg_order_value)
    .slice(0, 15)

  // Catalog avg AOV for reference line context
  const catalogAvgAOV = by_state.reduce((s, r) => s + r.revenue, 0) /
    Math.max(by_state.reduce((s, r) => s + r.orders, 0), 1)

  const totalOrders = by_state.reduce((s, r) => s + r.orders, 0)
  const top3 = by_state.slice(0, 3)
  const top3Pct = totalOrders > 0 ? Math.round(top3.reduce((s, r) => s + r.orders, 0) / totalOrders * 100) : 0

  const stateColumns = [
    { key: 'state', label: 'State', sortable: true },
    { key: 'orders', label: 'Orders', sortable: true, align: 'right', render: v => formatNumber(v) },
    { key: 'revenue', label: 'Revenue', sortable: true, align: 'right', render: v => formatCurrency(v) },
    { key: 'avg_order_value', label: 'Avg Order Value', sortable: true, align: 'right', render: v => formatCurrency(v) },
  ]

  const cityColumns = [
    { key: 'city', label: 'City', sortable: true },
    { key: 'state', label: 'State', sortable: true },
    { key: 'orders', label: 'Orders', sortable: true, align: 'right', render: v => formatNumber(v) },
    { key: 'revenue', label: 'Revenue', sortable: true, align: 'right', render: v => formatCurrency(v) },
  ]


  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px' }}>Geographic Demand</h1>
      <div style={{ background: '#F5F5F5', border: '1px solid #E5E5E5', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#737373' }}>
        Based on merchant-fulfilled orders only. FBA order geography available after SP-API integration.
      </div>

      <div style={{ background: '#FAFAFA', border: '1px solid #E5E5E5', borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#000' }}>
        Top 3 states ({top3.map(s => s.state).join(', ')}) drive <strong>{top3Pct}%</strong> of all orders.
      </div>

      {/* AOV insight callout */}
      {aovData.length > 0 && (() => {
        const top = aovData[0]
        const abovePct = Math.round(((top.avg_order_value - catalogAvgAOV) / catalogAvgAOV) * 100)
        return (
          <div style={{ background: '#FAFAFA', border: '1px solid #E5E5E5', borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#000' }}>
            <strong>{top.state}</strong> has the highest avg order value at{' '}
            <strong>{formatCurrency(top.avg_order_value)}</strong> — {' '}
            {abovePct > 0 ? <span style={{ color: '#16A34A' }}>{abovePct}% above</span> : <span style={{ color: '#DC2626' }}>{Math.abs(abovePct)}% below</span>}
            {' '}catalog average ({formatCurrency(catalogAvgAOV)}). Consider targeting premium SKUs here.
          </div>
        )
      })()}

      <div className="rg-2">
        <div style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>Avg Order Value by State</h2>
            <p style={{ margin: 0, fontSize: 12, color: '#737373' }}>
              States sorted by AOV · only states with ≥5 orders shown · catalog avg {formatCurrency(catalogAvgAOV)}
            </p>
          </div>
          <BarChart
            data={aovData.map(s => ({ name: s.state, aov: Math.round(s.avg_order_value) }))}
            xKey="name"
            bars={[{ key: 'aov', label: 'Avg Order Value', color: '#000' }]}
            layout="vertical"
            tickFormatter={v => formatCurrency(v)}
            height={420}
            colorFn={row => row.aov >= catalogAvgAOV ? '#000' : '#A3A3A3'}
          />
        </div>
        <div style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 12 }}>Top States by Orders</h2>
          <BarChart
            data={by_state.slice(0, 10).map(s => ({ name: s.state, orders: s.orders }))}
            xKey="name"
            bars={[{ key: 'orders', label: 'Orders', color: '#000' }]}
            layout="vertical"
            height={340}
          />
        </div>
      </div>

      <div className="rg-2">
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Top 10 States</h2>
          <DataTable columns={stateColumns} data={by_state.slice(0, 10)} pageSize={10} />
        </div>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Top 10 Cities</h2>
          <DataTable columns={cityColumns} data={by_city.slice(0, 10)} pageSize={10} />
        </div>
      </div>
    </div>
  )
}
