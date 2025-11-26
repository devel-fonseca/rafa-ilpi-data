import React from 'react'
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'

interface SparklineProps {
  data: Array<{ value: number }>
  color?: string
  height?: number
  domain?: [number, number]
}

export function Sparkline({
  data,
  color = '#3b82f6',
  height = 60,
  domain = ['dataMin', 'dataMax']
}: SparklineProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="bg-muted rounded flex items-center justify-center text-xs text-muted-foreground"
        style={{ height }}
      >
        Sem dados
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 0, bottom: 5, left: 0 }}>
        <YAxis domain={domain} hide />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          animationDuration={300}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}