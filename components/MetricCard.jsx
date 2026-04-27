export default function MetricCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div style={{
      background: '#FFF', border: '1px solid #E5E5E5', borderRadius: 12,
      padding: '20px', display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#737373' }}>
          {label}
        </span>
        {Icon && <Icon size={16} color="#A3A3A3" />}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || '#000', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: '#737373' }}>{sub}</div>}
    </div>
  )
}
