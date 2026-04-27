'use client'
import { RadarChart as ReRadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts'

const tooltipStyle = {
  contentStyle: { borderRadius: 8, border: '1px solid #E5E5E5', backgroundColor: '#FFF', color: '#000', fontSize: 13 },
}

export default function RadarChart({ data, height = 280 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReRadarChart data={data} margin={{ top: 16, right: 16, bottom: 16, left: 16 }}>
        <PolarGrid stroke="#E5E5E5" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: '#737373', fontSize: 12 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#A3A3A3', fontSize: 10 }} />
        <Tooltip {...tooltipStyle} />
        <Radar name="Score" dataKey="value" stroke="#000" fill="#000" fillOpacity={0.12} strokeWidth={2} />
      </ReRadarChart>
    </ResponsiveContainer>
  )
}
