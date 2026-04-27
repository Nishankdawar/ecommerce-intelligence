import { AlertTriangle, AlertCircle, Info, Package, Truck, BarChart2, TrendingDown } from 'lucide-react'

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

export default function AlertCard({ alert }) {
  const sev = severityStyle[alert.severity] || severityStyle.INFO
  const Icon = typeIcon[alert.type] || AlertTriangle
  const SevIcon = sev.icon

  return (
    <div style={{
      background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12,
      borderLeft: `4px solid ${sev.border}`, padding: '16px 20px',
      display: 'flex', gap: 16, alignItems: 'flex-start',
    }}>
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
        {alert.recommended_action && (
          <div style={{ background: '#FAFAFA', border: '1px solid #E5E5E5', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#000' }}>
            <span style={{ fontWeight: 600 }}>Action: </span>{alert.recommended_action}
          </div>
        )}
      </div>
    </div>
  )
}
