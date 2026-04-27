'use client'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const tooltipStyle = {
  contentStyle: { borderRadius: 8, border: '1px solid #E5E5E5', backgroundColor: '#FFF', color: '#000', fontSize: 13 },
}

export default function DonutChart({ data, nameKey = 'name', valueKey = 'value', colors = ['#000', '#737373', '#E5E5E5'], height = 240, formatter }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey={valueKey} nameKey={nameKey} cx="50%" cy="50%"
          innerRadius="55%" outerRadius="80%" paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
        </Pie>
        <Tooltip {...tooltipStyle} formatter={formatter || ((v) => [v.toLocaleString()])} />
        <Legend wrapperStyle={{ fontSize: 13, color: '#000' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
