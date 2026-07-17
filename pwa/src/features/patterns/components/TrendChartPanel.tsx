import React from 'react'

import type { TrendPoint } from '../analytics'
import { TrendChart } from './TrendChart'
import { buildTrendChart, currentTrendColor } from './trendSeries'

export const TrendChartPanel = ({
  points,
  rangeDays,
  showDelta,
  controls,
  action,
  className = '',
}: {
  readonly points: readonly TrendPoint[]
  readonly rangeDays: number
  readonly showDelta: boolean
  readonly controls: React.ReactNode
  readonly action?: React.ReactNode
  readonly className?: string
}): React.JSX.Element => {
  const visiblePoints = points.slice(-rangeDays)
  const chart = buildTrendChart(
    [...visiblePoints],
    showDelta,
    currentTrendColor(points),
  )

  return (
    <div className={`pattern-chart__container ${className}`.trim()}>
      <TrendChart
        dates={chart.dates}
        series={chart.series}
        clampTo={chart.clampTo}
        baseline={chart.baseline}
        eventCounts={visiblePoints.map((point) => point.eventCount)}
        statusValues={visiblePoints.map((point) => point.score)}
        action={action}
      />
      {controls}
    </div>
  )
}
