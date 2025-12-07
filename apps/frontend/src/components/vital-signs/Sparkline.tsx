import React from 'react'
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts'

interface SparklineProps {
  data: Array<{ value: number }>
  color?: string
  height?: number
  domain?: [number, number]
  unit?: string
}

export function Sparkline({
  data,
  color = '#3b82f6',
  height = 60,
  domain = ['dataMin', 'dataMax'],
  unit = ''
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
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length > 0) {
              return (
                <div className="bg-popover border border-border rounded-md px-2 py-1 shadow-md">
                  <p className="text-xs font-medium">
                    {payload[0].value} {unit}
                  </p>
                </div>
              )
            }
            return null
          }}
          cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '3 3' }}
        />
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