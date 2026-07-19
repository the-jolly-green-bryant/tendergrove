import React from 'react'

import type { TrendPoint } from '../analytics'
import { TrendChart } from './TrendChart'
import { buildTrendChart, currentTrendColor, toDelta } from './trendSeries'

export const TrendChartPanel = ({
  points,
  rangeDays,
  showDelta,
  controls,
  action,
  className = '',
  comparisons = [],
}: {
  readonly points: readonly TrendPoint[]
  readonly rangeDays: number
  readonly showDelta: boolean
  readonly controls: React.ReactNode
  readonly action?: React.ReactNode
  readonly className?: string
  readonly comparisons?: ReadonlyArray<{
    id: string
    label: string
    color: string
    points: readonly TrendPoint[]
  }>
}): React.JSX.Element => {
  const visiblePoints = points.slice(-rangeDays)
  const chart = buildTrendChart(
    [...visiblePoints],
    showDelta,
    currentTrendColor(points),
  )
  const comparisonSeries = comparisons.map((comparison) => {
    const valuesByDate = new Map(
      comparison.points.map((point) => [point.date, point.rollingAverage]),
    )
    const values = chart.dates.map((date) => valuesByDate.get(date) ?? null)
    return {
      label: `${comparison.label} weighted average`,
      color: comparison.color,
      values: showDelta ? toDelta(values) : values,
      secondary: true,
    }
  })

  return (
    <div className={`pattern-chart__container ${className}`.trim()}>
      <TrendChart
        dates={chart.dates}
        series={[...chart.series, ...comparisonSeries]}
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
