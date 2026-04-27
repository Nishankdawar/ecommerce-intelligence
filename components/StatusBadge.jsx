const styles = {
  INVEST:              { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  WATCH:               { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
  DISCONTINUE:         { bg: '#FFF1F1', color: '#B91C1C', border: '#FECACA' },
  CRITICAL:            { bg: '#FFF1F1', color: '#B91C1C', border: '#FECACA' },
  WARNING:             { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
  INFO:                { bg: '#F5F5F5', color: '#525252', border: '#E5E5E5' },
  OK:                  { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  DEAD:                { bg: '#F5F5F5', color: '#737373', border: '#E5E5E5' },
  WATCH_STATUS:        { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
  'B2B HEALTHY':       { bg: '#F5F5F5', color: '#000', border: '#E5E5E5' },
  'UNTAPPED':          { bg: '#000', color: '#FFF', border: '#000' },
  'MISSING B2B PRICING': { bg: '#000', color: '#FFF', border: '#000' },
  'B2B NOT VISIBLE':   { bg: '#F5F5F5', color: '#737373', border: '#E5E5E5' },
  'UNDERPERFORMING':   { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
}

export default function StatusBadge({ status }) {
  const s = styles[status] || { bg: '#F5F5F5', color: '#525252', border: '#E5E5E5' }
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 600,
      whiteSpace: 'nowrap', display: 'inline-block',
    }}>
      {status}
    </span>
  )
}
