'use client'
import { useState } from 'react'
import { AlertTriangle, AlertCircle, Info, Package, Truck, BarChart2, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react'

const severityStyle = {
  CRITICAL: { border: '#DC2626', icon: AlertCircle, iconColor: '#DC2626', tagColor: '#B91C1C' },
  WARNING:  { border: '#D97706', icon: AlertTriangle, iconColor: '#D97706', tagColor: '#B45309' },
  INFO:     { border: '#000', icon: Info, iconColor: '#525252', tagColor: '#525252' },
}

const typeIcon = {
  STOCKOUT_IMMINENT: Package,
  SHIPMENT_DELAY: Truck,
  DEAD_INVENTORY: TrendingDown,
  CONCENTRATION_RISK: BarChart2,
}

const whStatusStyle = {
  CRITICAL:    { bg: '#FFF1F1', color: '#B91C1C', border: '#FECACA', dot: '#DC2626' },
  WARNING:     { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A', dot: '#D97706' },
  OK:          { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0', dot: '#16A34A' },
  NO_MOVEMENT: { bg: '#F5F5F5', color: '#737373', border: '#E5E5E5', dot: '#A3A3A3' },
}

function WarehouseBreakdown({ warehouses }) {
  return (
    <div style={{ marginTop: 12, border: '1px solid #E5E5E5', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ background: '#FAFAFA', padding: '7px 12px', borderBottom: '1px solid #E5E5E5', display: 'grid', gridTemplateColumns: '1fr 80px 100px 90px 90px', gap: 8 }}>
        {['Warehouse', 'Stock', 'Velocity/day', 'Days Left', 'Status'].map(h => (
          <span key={h} style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#737373' }}>{h}</span>
        ))}
      </div>
      {warehouses.map(wh => {
        const s = whStatusStyle[wh.status] || whStatusStyle.OK
        return (
          <div key={wh.location} style={{ padding: '8px 12px', borderBottom: '1px solid #F5F5F5', display: 'grid', gridTemplateColumns: '1fr 80px 100px 90px 90px', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#000' }}>🏭 {wh.location}</span>
            <span style={{ fontSize: 13, color: '#000' }}>{wh.stock} units</span>
            <span style={{ fontSize: 13, color: '#737373' }}>{wh.daily_velocity} u/day</span>
            <span style={{ fontSize: 13, color: wh.days_remaining !== null ? '#000' : '#A3A3A3' }}>
              {wh.days_remaining !== null ? `${wh.days_remaining}d` : '∞'}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 999, padding: '2px 8px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
              {wh.status.replace('_', ' ')}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function AlertCard({ alert }) {
  const [expanded, setExpanded] = useState(false)
  const sev = severityStyle[alert.severity] || severityStyle.INFO
  const Icon = typeIcon[alert.type] || AlertTriangle
  const SevIcon = sev.icon

  const hasWarehouses = alert.type === 'STOCKOUT_IMMINENT' && alert.warehouses?.length > 0
  const criticalWarehouses = alert.warehouses?.filter(w => w.status === 'CRITICAL') || []
  const warningWarehouses = alert.warehouses?.filter(w => w.status === 'WARNING') || []

  return (
    <div style={{
      background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12,
      borderLeft: `4px solid ${sev.border}`,
    }}>
      {/* Main row */}
      <div style={{ padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <SevIcon size={18} color={sev.iconColor} style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: sev.tagColor, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon size={12} />
              {alert.type.replace(/_/g, ' ')}
            </span>
            {alert.sku && <span style={{ fontSize: 11, color: '#737373', background: '#F5F5F5', borderRadius: 4, padding: '1px 6px' }}>{alert.sku}</span>}
            {alert.metric_value !== undefined && (
              <span style={{ marginLeft: 'auto', background: '#000', color: '#FFF', borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                {alert.metric_value} {alert.metric_unit?.replace(/_/g, ' ')}
              </span>
            )}
          </div>

          <p style={{ margin: '0 0 10px', fontSize: 14, color: '#000', lineHeight: 1.5 }}>{alert.message}</p>

          {/* Stock + velocity summary chips */}
          {hasWarehouses && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, background: '#F5F5F5', border: '1px solid #E5E5E5', borderRadius: 6, padding: '4px 10px', color: '#000' }}>
                📦 <strong>{alert.current_stock}</strong> units total
              </span>
              <span style={{ fontSize: 12, background: '#F5F5F5', border: '1px solid #E5E5E5', borderRadius: 6, padding: '4px 10px', color: '#000' }}>
                ⚡ <strong>{alert.daily_velocity}</strong> units/day
              </span>
              {criticalWarehouses.length > 0 && (
                <span style={{ fontSize: 12, background: '#FFF1F1', border: '1px solid #FECACA', borderRadius: 6, padding: '4px 10px', color: '#B91C1C', fontWeight: 600 }}>
                  🔴 {criticalWarehouses.length} warehouse{criticalWarehouses.length > 1 ? 's' : ''} critical
                </span>
              )}
              {warningWarehouses.length > 0 && (
                <span style={{ fontSize: 12, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, padding: '4px 10px', color: '#B45309', fontWeight: 600 }}>
                  🟠 {warningWarehouses.length} warehouse{warningWarehouses.length > 1 ? 's' : ''} warning
                </span>
              )}
              <button
                onClick={() => setExpanded(e => !e)}
                style={{ marginLeft: 'auto', fontSize: 12, color: '#737373', background: 'none', border: '1px solid #E5E5E5', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                {expanded ? 'Hide' : 'View'} warehouse breakdown
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>
          )}

          {expanded && hasWarehouses && <WarehouseBreakdown warehouses={alert.warehouses} />}

          {alert.recommended_action && (
            <div style={{ background: '#FAFAFA', border: '1px solid #E5E5E5', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#000', marginTop: expanded ? 12 : 0 }}>
              <span style={{ fontWeight: 600 }}>Action: </span>{alert.recommended_action}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
