'use client'
import { useState, useEffect } from 'react'
import MetricCard from '@/components/MetricCard'
import DataTable from '@/components/DataTable'
import BarChart from '@/components/charts/BarChart'
import { formatCurrency, formatNumber, formatPct } from '@/lib/formatters'
import { X, TrendingDown, Truck } from 'lucide-react'
import { useIsMobile } from '@/lib/hooks'

function SKUDrawer({ sku, onClose }) {
  const isMobile = useIsMobile()
  if (!sku) return null
  return (
    <div style={{ position: 'fixed', top: isMobile ? 52 : 0, right: 0, bottom: 0, width: isMobile ? '100%' : 460, background: '#FFF', border: '1px solid #E5E5E5', boxShadow: '-4px 0 24px rgba(0,0,0,0.08)', zIndex: 100, overflowY: 'auto', padding: isMobile ? 16 : 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{sku.sku}</h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#737373', lineHeight: 1.4 }}>{sku.title?.slice(0, 80)}</p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
      </div>

      <div className="rg-2" style={{ gap: 8, marginBottom: 16 }}>
        <div style={{ background: '#F5F5F5', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: '#737373' }}>Cross-state orders</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#DC2626' }}>{sku.cross_state_orders}</div>
          <div style={{ fontSize: 11, color: '#737373' }}>{formatPct(sku.cross_state_pct)} of total</div>
        </div>
        <div style={{ background: '#F0FDF4', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: '#737373' }}>Est. monthly saving</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#16A34A' }}>{formatCurrency(sku.estimated_monthly_saving)}</div>
          <div style={{ fontSize: 11, color: '#737373' }}>₹{sku.fee_per_order_saving}/order saved</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, background: '#FFF1F1', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: '#B91C1C', fontWeight: 600, marginBottom: 4 }}>TOP DEMAND STATE</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{sku.top_demand_state}</div>
          <div style={{ fontSize: 12, color: '#737373' }}>{sku.top_demand_orders} orders</div>
        </div>
        <div style={{ flex: 1, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: '#B45309', fontWeight: 600, marginBottom: 4 }}>MAIN SUPPLY STATE</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{sku.top_supply_state}</div>
          <div style={{ fontSize: 12, color: '#737373' }}>
            {sku.top_demand_state === sku.top_supply_state ? '✓ Matches demand' : '⚠ Mismatch'}
          </div>
        </div>
      </div>

      <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Demand by State</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
        {sku.demand_by_state.map(d => (
          <div key={d.state} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 130, fontSize: 12, color: '#525252', flexShrink: 0 }}>{d.state}</span>
            <div style={{ flex: 1, background: '#F5F5F5', borderRadius: 4, height: 18, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: d.state === sku.top_supply_state ? '#16A34A' : '#000', borderRadius: 4, width: `${(d.orders / sku.demand_by_state[0].orders) * 100}%` }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, width: 30, textAlign: 'right' }}>{d.orders}</span>
          </div>
        ))}
      </div>

      <div style={{ background: '#FAFAFA', border: '1px solid #E5E5E5', borderRadius: 8, padding: '12px 14px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#737373', marginBottom: 6 }}>Recommendation</div>
        <p style={{ margin: 0, fontSize: 13, color: '#000', lineHeight: 1.5 }}>{sku.recommendation}</p>
      </div>
    </div>
  )
}

export default function WarehouseOptimizationPage() {
  const isMobile = useIsMobile()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetch('/api/engines/warehouse-optimization').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading || !data) return <div style={{ padding: 40, color: '#737373' }}>Loading...</div>

  const { summary, skus, catalog_demand, catalog_supply } = data
  const withOpportunity = skus.filter(s => s.estimated_monthly_saving > 0)

  const columns = [
    { key: 'sku', label: 'SKU', sortable: true },
    { key: 'total_orders', label: 'Orders', sortable: true, align: 'right' },
    { key: 'top_demand_state', label: 'Top Demand State', sortable: true },
    { key: 'top_supply_state', label: 'Current Supply State', sortable: true, render: (v, row) => (
      <span style={{ color: v === row.top_demand_state ? '#16A34A' : '#DC2626', fontWeight: 600 }}>{v}</span>
    )},
    { key: 'cross_state_pct', label: 'Cross-State %', sortable: true, align: 'right', render: v => <span style={{ color: v > 70 ? '#DC2626' : v > 40 ? '#D97706' : '#16A34A' }}>{formatPct(v)}</span> },
    { key: 'avg_cross_state_fee', label: 'Cross-State Fee', sortable: true, align: 'right', render: v => formatCurrency(v) },
    { key: 'avg_intra_state_fee', label: 'Intra-State Fee', sortable: true, align: 'right', render: v => formatCurrency(v) },
    { key: 'estimated_monthly_saving', label: 'Est. Saving/mo', sortable: true, align: 'right', render: v => <span style={{ fontWeight: 600, color: v > 0 ? '#16A34A' : '#737373' }}>{v > 0 ? formatCurrency(v) : '—'}</span> },
  ]

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>Warehouse Optimization</h1>
      <p style={{ fontSize: 13, color: '#737373', margin: '0 0 8px' }}>March 2026 · Identify where demand is coming from vs where stock is sitting · reduce cross-state shipping costs</p>
      <div style={{ background: '#F5F5F5', border: '1px solid #E5E5E5', borderRadius: 8, padding: '8px 14px', marginBottom: 20, fontSize: 12, color: '#737373' }}>
        Cross-state orders (IGST) typically incur higher FBA weight handling fees than intra-state (CGST+SGST). Sending stock closer to demand clusters reduces per-order fulfillment cost.
      </div>

      <div className="rg-4">
        <MetricCard label="SKUs Analyzed" value={summary.total_skus_analyzed} />
        <MetricCard label="SKUs with Opportunity" value={summary.skus_with_opportunity} color="#D97706" />
        <MetricCard label="Cross-State Orders" value={`${summary.cross_state_order_pct}%`} color="#DC2626" sub="of all FBA orders" />
        <MetricCard label="Est. Total Monthly Saving" value={formatCurrency(summary.total_estimated_monthly_saving)} color="#16A34A" sub="if optimised" />
      </div>

      <div className="rg-2">
        <div style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 4 }}>Top 15 Savings Opportunities</h2>
          <p style={{ fontSize: 12, color: '#737373', margin: '0 0 12px' }}>Estimated monthly saving by redistributing stock to demand states</p>
          <BarChart
            data={withOpportunity.slice(0, 15).map(s => ({ name: s.sku, saving: s.estimated_monthly_saving }))}
            xKey="name" layout="vertical" height={isMobile ? 280 : 400}
            bars={[{ key: 'saving', label: 'Est. Monthly Saving', color: '#16A34A' }]}
            tickFormatter={v => `₹${v.toFixed(0)}`}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 12 }}>Demand by State (Catalog)</h2>
            <BarChart
              data={catalog_demand.slice(0, 10).map(d => ({ name: d.state, orders: d.orders }))}
              xKey="name" layout="vertical" height={260}
              bars={[{ key: 'orders', label: 'Orders', color: '#000' }]}
            />
          </div>
          <div style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 12 }}>Supply by State (Current Stock)</h2>
            <BarChart
              data={catalog_supply.slice(0, 10).map(d => ({ name: d.state, orders: d.orders }))}
              xKey="name" layout="vertical" height={260}
              bars={[{ key: 'orders', label: 'Fulfilled from', color: '#525252' }]}
            />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>All SKUs</h2>
        <span style={{ fontSize: 12, color: '#737373' }}>· Click row for demand map + recommendation</span>
      </div>
      <DataTable
        columns={columns}
        data={skus.map(s => ({ ...s, _onClick: () => setSelected(s) }))}
        searchable searchKeys={['sku']} pageSize={25}
      />
      {selected && <SKUDrawer sku={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
