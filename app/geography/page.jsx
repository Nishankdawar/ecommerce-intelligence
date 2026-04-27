'use client'
import { useState, useEffect } from 'react'
import DataTable from '@/components/DataTable'
import BarChart from '@/components/charts/BarChart'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import dynamic from 'next/dynamic'

const IndiaMap = dynamic(() => import('@/components/charts/IndiaMap'), { ssr: false })

export default function GeographyPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedSku, setSelectedSku] = useState('ALL')

  useEffect(() => {
    fetch('/api/engines/geography').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading || !data) return <div style={{ padding: 40, color: '#737373' }}>Loading...</div>

  const { by_state, by_city, by_sku } = data

  const activeSkuData = selectedSku === 'ALL' ? by_state : (() => {
    const skuEntry = by_sku.find(s => s.sku === selectedSku || s.asin === selectedSku)
    if (!skuEntry) return by_state
    return skuEntry.top_states.map(s => ({ state: s.state, orders: s.orders, revenue: 0, avg_order_value: 0 }))
  })()

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

  const skuOptions = [{ sku: 'ALL', asin: 'ALL' }, ...by_sku.slice(0, 100)]

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px' }}>Geographic Demand</h1>
      <div style={{ background: '#F5F5F5', border: '1px solid #E5E5E5', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#737373' }}>
        Based on merchant-fulfilled orders only. FBA order geography available after SP-API integration.
      </div>

      <div style={{ background: '#FAFAFA', border: '1px solid #E5E5E5', borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#000' }}>
        Top 3 states ({top3.map(s => s.state).join(', ')}) drive <strong>{top3Pct}%</strong> of all orders.
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <label style={{ fontSize: 13, color: '#737373' }}>Filter by SKU:</label>
        <select value={selectedSku} onChange={e => setSelectedSku(e.target.value)}
          style={{ padding: '6px 12px', border: '1px solid #000', borderRadius: 8, fontSize: 13, background: '#FFF', maxWidth: 300 }}>
          {skuOptions.map(s => <option key={s.asin} value={s.sku || s.asin}>{s.sku === 'ALL' ? 'All SKUs' : s.sku}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 12 }}>India — Orders by State</h2>
          <IndiaMap stateData={activeSkuData} />
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
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
