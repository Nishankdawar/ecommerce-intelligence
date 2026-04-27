'use client'
import { useState, useEffect } from 'react'
import { TrendingUp, ShoppingCart, Users, Package, AlertTriangle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import MetricCard from '@/components/MetricCard'
import AlertCard from '@/components/AlertCard'
import AreaChart from '@/components/charts/AreaChart'
import DonutChart from '@/components/charts/DonutChart'
import { formatCurrency, formatNumber, formatPct } from '@/lib/formatters'

function PageSection({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      {title && <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#000' }}>{title}</h2>}
      {children}
    </div>
  )
}

function Card({ children, style }) {
  return (
    <div style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: 20, ...style }}>
      {children}
    </div>
  )
}

export default function DashboardPage() {
  const [digest, setDigest] = useState(null)
  const [skuHealth, setSkuHealth] = useState(null)
  const [alerts, setAlerts] = useState(null)
  const [inventory, setInventory] = useState(null)
  const [listingQuality, setListingQuality] = useState(null)
  const [promotions, setPromotions] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/engines/digest').then(r => r.json()),
      fetch('/api/engines/sku-health').then(r => r.json()),
      fetch('/api/engines/alerts').then(r => r.json()),
      fetch('/api/engines/inventory').then(r => r.json()),
      fetch('/api/engines/listing-quality').then(r => r.json()),
      fetch('/api/engines/promotions').then(r => r.json()),
    ]).then(([d, s, a, inv, lq, p]) => {
      setDigest(d); setSkuHealth(s); setAlerts(a); setInventory(inv); setListingQuality(lq); setPromotions(p)
      setLoading(false)
    }).catch(console.error)
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: '#737373' }}>
      Loading data...
    </div>
  )

  const overview = digest?.overview || {}
  const trend = digest?.daily_revenue_trend || []
  const top5 = digest?.top5_by_revenue || []

  const investCount = skuHealth?.filter(s => s.classification === 'INVEST').length || 0
  const watchCount = skuHealth?.filter(s => s.classification === 'WATCH').length || 0
  const discCount = skuHealth?.filter(s => s.classification === 'DISCONTINUE').length || 0

  const criticalAlerts = alerts?.alerts?.filter(a => a.severity === 'CRITICAL').slice(0, 3) || []

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#000', margin: 0 }}>Seller Snapshot</h1>
          <p style={{ fontSize: 13, color: '#737373', margin: '4px 0 0' }}>April 2026 · All figures from Business Report + Order Data</p>
        </div>
      </div>

      {/* Row 1: Business Overview */}
      <PageSection title="Business Overview">
        <div className="rg-6" style={{ marginBottom: 0 }}>
          <MetricCard label="Monthly Revenue" value={formatCurrency(overview.total_monthly_revenue)} icon={TrendingUp} />
          <MetricCard label="B2C Revenue" value={formatCurrency(overview.total_b2c_revenue)} />
          <MetricCard label="B2B Revenue" value={formatCurrency(overview.total_b2b_revenue)} />
          <MetricCard label="MFN Orders (Mar31–Apr24)" value={formatNumber(overview.total_orders)} icon={ShoppingCart} sub="MFN only · FBA orders via SP-API" />
          <MetricCard label="Active SKUs" value={formatNumber(overview.total_skus_active)} icon={Package} />
          <MetricCard label="Avg Conversion" value={formatPct(overview.avg_conversion_rate)} icon={Users} />
        </div>
      </PageSection>

      {/* Row 2: Revenue Trend + B2C/B2B Split */}
      <div className="rg-21">
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Daily Revenue Trend</h2>
            <span style={{ fontSize: 11, color: '#A3A3A3' }}>Estimated from order data (MFN + FBA shipments)</span>
          </div>
          <AreaChart
            data={trend}
            xKey="date"
            areas={[{ key: 'revenue', label: 'Total Revenue', color: '#000' }]}
            tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`}
          />
        </Card>
        <Card>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, marginTop: 0 }}>B2C vs B2B Revenue</h2>
          <DonutChart
            data={[
              { name: 'B2C Revenue', value: overview.total_b2c_revenue || 0 },
              { name: 'B2B Revenue', value: overview.total_b2b_revenue || 0 },
            ]}
            colors={['#000', '#737373']}
            formatter={(v) => [formatCurrency(v)]}
          />
        </Card>
      </div>

      {/* Row 3: Health Overview */}
      <PageSection title="SKU Health Overview">
        <div className="rg-3" style={{ marginBottom: 0 }}>
          <MetricCard label="INVEST" value={investCount} color="#16A34A" sub="Strong performers" />
          <MetricCard label="WATCH" value={watchCount} color="#D97706" sub="Needs attention" />
          <MetricCard label="DISCONTINUE" value={discCount} color="#DC2626" sub="Low performance" />
        </div>
      </PageSection>

      {/* Row 4 + 5: Alerts + Top SKUs */}
      <div className="rg-2">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Critical Alerts</h2>
            <Link href="/alerts" style={{ fontSize: 12, color: '#737373', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {criticalAlerts.length === 0
              ? <Card><p style={{ margin: 0, color: '#737373', fontSize: 13 }}>No critical alerts.</p></Card>
              : criticalAlerts.map(a => <AlertCard key={a.id} alert={a} />)
            }
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Top 5 SKUs — compact ranked list */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Top 5 SKUs by Revenue</h2>
              <Link href="/sku-health" style={{ fontSize: 12, color: '#737373', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {top5.map((s, i) => {
                const pct = overview.total_monthly_revenue > 0
                  ? ((s.revenue / overview.total_monthly_revenue) * 100).toFixed(1)
                  : 0
                return (
                  <div key={s.sku} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 4 ? '1px solid #F5F5F5' : 'none' }}>
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: i === 0 ? '#000' : '#F5F5F5', color: i === 0 ? '#FFF' : '#737373', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {i + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.sku}</div>
                      <div style={{ fontSize: 11, color: '#737373', marginTop: 1 }}>{s.units?.toLocaleString()} units sold</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#000' }}>{formatCurrency(s.revenue)}</div>
                      <div style={{ fontSize: 11, color: '#A3A3A3' }}>{pct}% of total</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Revenue mix snapshot */}
          <Card>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 12px' }}>Revenue Mix</h2>
            <div className="rg-2" style={{ gap: 10, marginBottom: 0 }}>
              {[
                { label: 'B2C Revenue', value: formatCurrency(overview.total_b2c_revenue), sub: formatPct((overview.total_b2c_revenue / overview.total_monthly_revenue) * 100) + ' of total', color: '#000' },
                { label: 'B2B Revenue', value: formatCurrency(overview.total_b2b_revenue), sub: formatPct((overview.total_b2b_revenue / overview.total_monthly_revenue) * 100) + ' of total', color: '#525252' },
                { label: 'Promo-driven', value: formatCurrency(promotions?.summary?.promo_revenue), sub: formatPct(promotions?.summary?.promo_revenue_pct) + ' of orders revenue', color: promotions?.summary?.promo_revenue_pct > 50 ? '#D97706' : '#000' },
                { label: 'Organic', value: formatCurrency(promotions?.summary?.organic_revenue), sub: formatPct(100 - (promotions?.summary?.promo_revenue_pct || 0)) + ' of orders revenue', color: '#16A34A' },
              ].map(item => (
                <div key={item.label} style={{ background: '#FAFAFA', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, color: '#737373', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: 11, color: '#A3A3A3', marginTop: 2 }}>{item.sub}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Row 6: Quick Wins */}
      <PageSection title="Quick Wins">
        <div className="rg-4" style={{ marginBottom: 0 }}>
          <Link href="/listing-quality" style={{ textDecoration: 'none' }}>
            <Card style={{ cursor: 'pointer', borderLeft: '3px solid #000' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#000' }}>{listingQuality?.summary?.missing_mrp || 0}</div>
              <div style={{ fontSize: 12, color: '#737373', marginTop: 4 }}>SKUs missing MRP</div>
              <div style={{ fontSize: 11, color: '#A3A3A3', marginTop: 6 }}>Fix for higher conversion →</div>
            </Card>
          </Link>
          <Link href="/b2b" style={{ textDecoration: 'none' }}>
            <Card style={{ cursor: 'pointer', borderLeft: '3px solid #000' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#000' }}>{listingQuality?.summary?.missing_b2b_price || 0}</div>
              <div style={{ fontSize: 12, color: '#737373', marginTop: 4 }}>SKUs missing B2B pricing</div>
              <div style={{ fontSize: 11, color: '#A3A3A3', marginTop: 6 }}>Enable B2B pricing →</div>
            </Card>
          </Link>
          <Link href="/inventory" style={{ textDecoration: 'none' }}>
            <Card style={{ cursor: 'pointer', borderLeft: '3px solid #DC2626' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#DC2626' }}>{inventory?.summary?.critical_stockout || 0}</div>
              <div style={{ fontSize: 12, color: '#737373', marginTop: 4 }}>SKUs at stockout risk</div>
              <div style={{ fontSize: 11, color: '#A3A3A3', marginTop: 6 }}>Replenish now →</div>
            </Card>
          </Link>
          <Link href="/inventory" style={{ textDecoration: 'none' }}>
            <Card style={{ cursor: 'pointer', borderLeft: '3px solid #D97706' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#D97706' }}>{formatCurrency(inventory?.summary?.estimated_dead_storage_cost_monthly || 0)}</div>
              <div style={{ fontSize: 12, color: '#737373', marginTop: 4 }}>Dead inventory cost/month</div>
              <div style={{ fontSize: 11, color: '#A3A3A3', marginTop: 6 }}>Est. @ ₹20/unit · View dead inventory →</div>
            </Card>
          </Link>
        </div>
      </PageSection>

      {/* Row 7: Promo Dependency Warning */}
      {promotions?.summary?.promo_revenue_pct > 50 && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={16} color="#D97706" />
          <span style={{ fontSize: 13, color: '#B45309' }}>
            <strong>{promotions.summary.promo_revenue_pct}%</strong> of revenue is promotion-dependent.
            Plan for revenue drop when promos end.{' '}
            <Link href="/promotions" style={{ color: '#B45309', fontWeight: 600 }}>View breakdown →</Link>
          </span>
        </div>
      )}
    </div>
  )
}
