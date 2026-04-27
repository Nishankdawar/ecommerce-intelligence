'use client'
import {
  AreaChart as ReAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const tooltipStyle = {
  contentStyle: { borderRadius: 8, border: '1px solid #E5E5E5', backgroundColor: '#FFF', color: '#000', fontSize: 13 },
  labelStyle: { fontWeight: 600 },
}

export default function AreaChart({ data, xKey, areas, height = 260, tickFormatter }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReAreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
        <XAxis dataKey={xKey} tick={{ fill: '#737373', fontSize: 11 }} tickLine={false} />
        <YAxis tick={{ fill: '#737373', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={tickFormatter} />
        <Tooltip {...tooltipStyle} formatter={tickFormatter ? (v) => [tickFormatter(v)] : undefined} />
        <Legend wrapperStyle={{ fontSize: 13, color: '#000' }} />
        {areas.map(a => (
          <Area key={a.key} type="monotone" dataKey={a.key} name={a.label || a.key}
            stroke={a.color || '#000'} fill={a.fill || `${a.color || '#000'}20`}
            strokeWidth={2} dot={false}
          />
        ))}
      </ReAreaChart>
    </ResponsiveContainer>
  )
}
