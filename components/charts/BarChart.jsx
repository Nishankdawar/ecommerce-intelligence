'use client'
import {
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, LabelList
} from 'recharts'

const tooltipStyle = {
  contentStyle: { borderRadius: 8, border: '1px solid #E5E5E5', backgroundColor: '#FFF', color: '#000', fontSize: 13 },
}

// Custom tick that truncates long labels and shows full text on title (native browser tooltip)
function TruncatedTick({ x, y, payload, maxChars = 22 }) {
  const text = String(payload.value || '')
  const display = text.length > maxChars ? text.slice(0, maxChars - 1) + '…' : text
  return (
    <g transform={`translate(${x},${y})`}>
      <title>{text}</title>
      <text x={0} y={0} dy={4} textAnchor="end" fill="#737373" fontSize={11}>{display}</text>
    </g>
  )
}

export default function BarChart({
  data, xKey, bars, height = 260, layout = 'vertical',
  tickFormatter, labelFormatter, colorFn, yAxisWidth
}) {
  const isHorizontal = layout === 'horizontal'
  // Auto-size Y axis: use provided width, or derive from longest label (capped 140–220)
  const autoWidth = yAxisWidth ?? Math.min(220, Math.max(140,
    Math.max(...data.map(d => String(d[xKey] || '').length)) * 7
  ))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReBarChart
        data={data}
        layout={layout}
        margin={{ top: 4, right: isHorizontal ? 8 : 16, left: isHorizontal ? 0 : 4, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" horizontal={!isHorizontal} vertical={isHorizontal} />
        {isHorizontal ? (
          <>
            <XAxis dataKey={xKey} tick={{ fill: '#737373', fontSize: 11 }} tickLine={false} interval={0} />
            <YAxis tick={{ fill: '#737373', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={tickFormatter} />
          </>
        ) : (
          <>
            <XAxis type="number" tick={{ fill: '#737373', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={tickFormatter} />
            <YAxis
              dataKey={xKey} type="category"
              tick={<TruncatedTick maxChars={Math.floor(autoWidth / 7)} />}
              tickLine={false} width={autoWidth} interval={0}
            />
          </>
        )}
        <Tooltip {...tooltipStyle} formatter={tickFormatter ? (v) => [tickFormatter(v)] : undefined} />
        {bars.length > 1 && <Legend wrapperStyle={{ fontSize: 13, color: '#000' }} />}
        {bars.map(b => (
          <Bar key={b.key} dataKey={b.key} name={b.label || b.key} fill={b.color || '#000'}
            radius={[2, 2, 2, 2]} maxBarSize={28} stackId={b.stack}>
            {colorFn && data.map((_, i) => <Cell key={i} fill={colorFn(data[i])} />)}
          </Bar>
        ))}
      </ReBarChart>
    </ResponsiveContainer>
  )
}
