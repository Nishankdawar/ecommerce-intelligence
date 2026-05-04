'use client'
import DataRequired from '@/components/DataRequired'
import MonthSelector from '@/components/MonthSelector'
import { useState, useEffect } from 'react'
import MetricCard from '@/components/MetricCard'
import DataTable from '@/components/DataTable'
import { formatCurrency, formatNumber, formatPct } from '@/lib/formatters'
import { X } from 'lucide-react'
import { useIsMobile } from '@/lib/hooks'

function WaterfallRow({ label, value, isTotal }) {
  const isNeg = value < 0
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: isTotal ? '12px 14px' : '8px 14px',
      background: isTotal ? '#000' : '#FAFAFA',
      borderRadius: isTotal ? 8 : 6,
      marginBottom: 4,
    }}>
      <span style={{ fontSize: 13, color: isTotal ? '#FFF' : '#525252' }}>{label}</span>
      <span style={{ fontSize: isTotal ? 15 : 13, fontWeight: isTotal ? 700 : 600, color: isTotal ? '#FFF' : isNeg ? '#DC2626' : value > 0 ? '#16A34A' : '#737373' }}>
        {value >= 0 ? '+' : ''}{formatCurrency(value)}
      </span>
    </div>
  )
}

function OrderDrawer({ order, onClose }) {
  const isMobile = useIsMobile()
  if (!order) return null
  return (
    <div style={{ position: 'fixed', top: isMobile ? 52 : 0, right: 0, bottom: 0, width: isMobile ? '100%' : 400, background: '#FFF', border: '1px solid #E5E5E5', boxShadow: '-4px 0 24px rgba(0,0,0,0.08)', zIndex: 100, overflowY: 'auto', padding: isMobile ? 16 : 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: '#737373' }}>Order ID</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{order.order_id}</div>
          <div style={{ fontSize: 12, color: '#737373', marginTop: 2 }}>SKU: {order.sku} · {order.posted_date}</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
      </div>
      <WaterfallRow label="Revenue Collected" value={order.revenue} />
      <WaterfallRow label="Commission" value={order.commission} />
      <WaterfallRow label="FBA Fulfillment Fees" value={order.fba_fees} />
      <WaterfallRow label="Closing Fee" value={order.closing_fee} />
      <WaterfallRow label="Technology Fee" value={order.tech_fee} />
      <WaterfallRow label="Promo Rebates" value={order.promo} />
      <WaterfallRow label="TCS" value={order.tcs} />
      <WaterfallRow label="TDS (194-O)" value={order.tds} />
      {order.refunds !== 0 && <WaterfallRow label="Refunds" value={order.refunds} />}
      {order.reimbursements !== 0 && <WaterfallRow label="Reimbursements" value={order.reimbursements} />}
      <WaterfallRow label="Net Proceeds" value={order.net_proceeds} isTotal />
      <div style={{ marginTop: 16, background: '#F5F5F5', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
        <span style={{ fontSize: 12, color: '#737373' }}>Margin: </span>
        <span style={{ fontSize: 16, fontWeight: 700, color: order.margin_pct < 40 ? '#DC2626' : '#16A34A' }}>{formatPct(order.margin_pct)}</span>
      </div>
    </div>
  )
}

export default function SettlementPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [tab, setTab] = useState('cycles')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [skuFilter, setSkuFilter] = useState('')

  function loadData(month) {
    setLoading(true)
    const url = month ? `/api/engines/settlement?month=${month}` : '/api/engines/settlement'
    fetch(url).then(r => r.json()).then(d => {
      setData(d)
      if (!month && d.coverage?.selected_month) setSelectedMonth(d.coverage.selected_month)
      setLoading(false)
    })
  }

  useEffect(() => { loadData(null) }, [])

  function handleMonthChange(month) { setSelectedMonth(month); loadData(month) }

  if (loading || !data) return <div style={{ padding: 40, color: '#737373' }}>Loading...</div>
  if (data?._unavailable) return <DataRequired moduleName="Settlement Reconciliation" missingFiles={data.missing_files || []} />

  const { summary, cycles, orders, coverage } = data
  const filteredOrders = skuFilter
    ? orders.filter(o => o.sku.toLowerCase().includes(skuFilter.toLowerCase()))
    : orders

  const orderColumns = [
    { key: 'order_id', label: 'Order ID', sortable: false, render: v => <span style={{ fontSize: 12 }}>{v}</span> },
    { key: 'sku', label: 'SKU', sortable: true },
    { key: 'posted_date', label: 'Date', sortable: true },
    { key: 'revenue', label: 'Revenue', sortable: true, align: 'right', render: v => formatCurrency(v) },
    { key: 'total_fees', label: 'Fees', sortable: true, align: 'right', render: v => <span style={{ color: '#DC2626' }}>−{formatCurrency(v)}</span> },
    { key: 'net_proceeds', label: 'Net', sortable: true, align: 'right', render: v => <span style={{ fontWeight: 600, color: v < 0 ? '#DC2626' : '#16A34A' }}>{formatCurrency(v)}</span> },
    { key: 'margin_pct', label: 'Margin', sortable: true, align: 'right', render: v => <span style={{ color: v < 40 ? '#DC2626' : v < 60 ? '#D97706' : '#16A34A' }}>{formatPct(v)}</span> },
  ]

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>Settlement Reconciliation</h1>
      <p style={{ fontSize: 13, color: '#737373', margin: '0 0 16px' }}>See what Amazon actually paid and why · gross revenue → deductions → bank deposit</p>

      <MonthSelector coverage={coverage} selectedMonth={selectedMonth} onMonthChange={handleMonthChange} />

      {/* Row 1 — Revenue & Net */}
      <div className="rg-3" style={{ marginBottom: 8 }}>
        <MetricCard label="Gross Revenue" value={formatCurrency(summary.gross_revenue)} sub="principal + tax + shipping" />
        <MetricCard label="Total Fees Deducted" value={formatCurrency(summary.total_fees)} color="#DC2626" sub="commission + FBA + closing + tech + promo" />
        <MetricCard label="Net Settlement" value={formatCurrency(summary.total_deposit)} color="#16A34A" sub={`${summary.total_settlements} cycles · ${summary.total_orders} orders`} />
      </div>

      {/* Row 2 — Fee breakdown */}
      <div style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: '16px 20px', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#737373', marginBottom: 12 }}>Fee Breakdown</div>
        <div className="rg-4" style={{ marginBottom: 0 }}>
          <MetricCard label="Commission" value={formatCurrency(summary.commission)} color="#DC2626" sub="referral fee" />
          <MetricCard label="FBA Fulfillment" value={formatCurrency(summary.fba_fees)} color="#DC2626" sub="pick & pack + weight handling" />
          <MetricCard label="Closing Fee" value={formatCurrency(summary.closing_fees)} color="#DC2626" sub="per-order fixed fee" />
          <MetricCard label="Technology Fee" value={formatCurrency(summary.tech_fees)} color="#DC2626" sub="platform fee" />
        </div>
        <div className="rg-4" style={{ marginBottom: 0, marginTop: 8 }}>
          <MetricCard label="Promo Rebates" value={formatCurrency(summary.promo_rebates)} color="#D97706" sub="discounts + shipping rebates" />
          <MetricCard label="TCS Deducted" value={formatCurrency(summary.total_tcs_deducted)} color="#D97706" sub="recoverable via GST return" />
          <MetricCard label="TDS Deducted (194-O)" value={formatCurrency(summary.total_tds_deducted)} color="#D97706" sub="recoverable via ITR" />
          <MetricCard label="Reimbursements" value={formatCurrency(summary.total_reimbursements)} color="#16A34A" sub="lost packages + free replacements" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['cycles', 'Settlement Cycles'], ['orders', 'Per-Order View']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '7px 16px', border: '1px solid', borderRadius: 8, fontSize: 13, cursor: 'pointer',
            background: tab === key ? '#000' : '#FFF', color: tab === key ? '#FFF' : '#000', borderColor: tab === key ? '#000' : '#E5E5E5', fontWeight: tab === key ? 600 : 400
          }}>{label}</button>
        ))}
      </div>

      {tab === 'cycles' && (
        <div className="rg-2">
          {cycles.map(c => (
            <div key={c.settlement_id} style={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#737373', marginBottom: 2 }}>Settlement ID</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{c.settlement_id}</div>
                  <div style={{ fontSize: 12, color: '#737373', marginTop: 4 }}>{c.order_count} orders</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#737373' }}>Net Settlement</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#16A34A' }}>{formatCurrency(c.net_settlement)}</div>
                </div>
              </div>
              <WaterfallRow label="Gross Revenue" value={c.waterfall.gross_revenue} />
              <WaterfallRow label="Commission" value={c.waterfall.commission} />
              <WaterfallRow label="FBA Fees" value={c.waterfall.fba_fees} />
              <WaterfallRow label="Closing Fees" value={c.waterfall.closing_fees} />
              <WaterfallRow label="Technology Fees" value={c.waterfall.tech_fees} />
              <WaterfallRow label="Promo Rebates" value={c.waterfall.promo} />
              <WaterfallRow label="TCS" value={c.waterfall.tcs} />
              <WaterfallRow label="TDS (194-O)" value={c.waterfall.tds} />
              {c.waterfall.refunds !== 0 && <WaterfallRow label="Refunds" value={c.waterfall.refunds} />}
              {c.waterfall.reimbursements !== 0 && <WaterfallRow label="Reimbursements" value={c.waterfall.reimbursements} />}
              {c.waterfall.other !== 0 && <WaterfallRow label="Other" value={c.waterfall.other} />}
              <WaterfallRow label="Net Settlement" value={c.net_settlement} isTotal />
            </div>
          ))}
        </div>
      )}

      {tab === 'orders' && (
        <>
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              value={skuFilter}
              onChange={e => setSkuFilter(e.target.value)}
              placeholder="Filter by SKU..."
              style={{ padding: '7px 12px', border: '1px solid #000', borderRadius: 8, fontSize: 13, outline: 'none', width: 260 }}
            />
            <span style={{ fontSize: 12, color: '#737373' }}>{filteredOrders.length} orders · Click row for full breakdown</span>
          </div>
          <DataTable
            columns={orderColumns}
            data={filteredOrders.map(o => ({ ...o, _onClick: () => setSelectedOrder(o) }))}
            pageSize={30}
          />
        </>
      )}

      {selectedOrder && <OrderDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
    </div>
  )
}
