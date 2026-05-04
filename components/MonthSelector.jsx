import { AlertTriangle, CheckCircle } from 'lucide-react'
import Link from 'next/link'

const MONTH_LABELS = {
  '2026-01': 'January 2026', '2026-02': 'February 2026', '2026-03': 'March 2026',
  '2026-04': 'April 2026',   '2026-05': 'May 2026',      '2026-06': 'June 2026',
}

function label(m) { return MONTH_LABELS[m] || m }

export default function MonthSelector({ coverage, selectedMonth, onMonthChange }) {
  if (!coverage) return null

  const { available_months, is_partial } = coverage

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
      {/* Month dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 13, color: '#737373', whiteSpace: 'nowrap' }}>Viewing data for:</label>
        <select
          value={selectedMonth || ''}
          onChange={e => onMonthChange(e.target.value)}
          style={{ padding: '7px 12px', border: '1px solid #000', borderRadius: 8, fontSize: 13, background: '#FFF', cursor: 'pointer', fontWeight: 600 }}
        >
          {available_months.map(m => (
            <option key={m} value={m}>{label(m)}</option>
          ))}
        </select>
      </div>

      {/* Partial data warning */}
      {is_partial && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#B45309' }}>
          <AlertTriangle size={13} />
          <span>
            Partial data for {label(selectedMonth)} — only {coverage.total_rows_in_month || 'some'} settlement rows available.
            Upload more settlement files for complete month view.{' '}
            <Link href="/settings/data" style={{ color: '#B45309', fontWeight: 600 }}>Upload →</Link>
          </span>
        </div>
      )}

      {!is_partial && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#15803D' }}>
          <CheckCircle size={13} />
          <span>Settlement data loaded for {label(selectedMonth)}</span>
        </div>
      )}

      {/* Upload more months link */}
      <div style={{ marginLeft: 'auto', fontSize: 12, color: '#A3A3A3', display: 'flex', alignItems: 'center', gap: 4 }}>
        Want data for other months?{' '}
        <Link href="/settings/data" style={{ color: '#737373', fontWeight: 600 }}>Upload settlement files →</Link>
      </div>
    </div>
  )
}
