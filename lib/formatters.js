export function formatCurrency(val) {
  if (val === null || val === undefined) return '₹0'
  const n = Number(val)
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n.toFixed(0)}`
}

export function formatNumber(val) {
  if (val === null || val === undefined) return '0'
  const n = Number(val)
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return Math.round(n).toLocaleString('en-IN')
}

export function formatPct(val, decimals = 1) {
  if (val === null || val === undefined) return '0%'
  return `${Number(val).toFixed(decimals)}%`
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
