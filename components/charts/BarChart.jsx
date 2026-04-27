'use client'
import {
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, LabelList
} from 'recharts'

const tooltipStyle = {
  contentStyle: { borderRadius: 8, border: '1px solid #E5E5E5', backgroundColor: '#FFF', color: '#000', fontSize: 13 },
}

export default function BarChart({
  data, xKey, bars, height = 260, layout = 'vertical',
  tickFormatter, labelFormatter, colorFn
}) {
  const isHorizontal = layout === 'horizontal'
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReBarChart
        data={data}
        layout={layout}
        margin={{ top: 4, right: isHorizontal ? 8 : 80, left: isHorizontal ? 0 : 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" horizontal={!isHorizontal} vertical={isHorizontal} />
        {isHorizontal ? (
          <>
            <XAxis dataKey={xKey} tick={{ fill: '#737373', fontSize: 11 }} tickLine={false} />
            <YAxis tick={{ fill: '#737373', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={tickFormatter} />
          </>
        ) : (
          <>
            <XAxis type="number" tick={{ fill: '#737373', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={tickFormatter} />
            <YAxis dataKey={xKey} type="category" tick={{ fill: '#737373', fontSize: 11 }} tickLine={false} width={160} />
          </>
        )}
        <Tooltip {...tooltipStyle} formatter={tickFormatter ? (v) => [tickFormatter(v)] : undefined} />
        {bars.length > 1 && <Legend wrapperStyle={{ fontSize: 13, color: '#000' }} />}
        {bars.map(b => (
          <Bar key={b.key} dataKey={b.key} name={b.label || b.key} fill={b.color || '#000'}
            radius={[2, 2, 2, 2]} maxBarSize={32} stackId={b.stack}>
            {colorFn && data.map((_, i) => <Cell key={i} fill={colorFn(data[i])} />)}
          </Bar>
        ))}
      </ReBarChart>
    </ResponsiveContainer>
  )
}
