import React from 'react'

import type { TrendPoint } from '../analytics'
import {
  buildPatternStrainTrend,
  PATTERN_STRAIN_LABELS,
  type PatternDynamics,
  type PatternDynamicsDay,
} from '../analytics/patternDynamics'
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
  patternDynamics,
  showStrain = false,
  patternStrainDays = [],
  patternStrainEndDate,
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
  readonly patternDynamics?: PatternDynamics
  readonly showStrain?: boolean
  readonly patternStrainDays?: PatternDynamicsDay[]
  readonly patternStrainEndDate?: string
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
  const strainTrend =
    showStrain && patternStrainEndDate
      ? buildPatternStrainTrend(
          patternStrainDays,
          patternStrainEndDate,
          rangeDays,
          Math.max(1, Math.round(rangeDays / 13)),
        )
      : []
  const strainByDate = new Map(
    strainTrend.map((point) => [point.date, point.intensity]),
  )
  const strainValues = chart.dates.map((date) => strainByDate.get(date) ?? null)
  const strainSeries =
    showStrain && strainValues.some((value) => value !== null)
      ? [
          {
            label: 'Pattern Strain (higher = more strain)',
            color: '#7c3aed',
            values: showDelta ? toDelta(strainValues) : strainValues,
            secondary: true,
          },
        ]
      : []

  return (
    <div className={`pattern-chart__container ${className}`.trim()}>
      <TrendChart
        dates={chart.dates}
        series={[...chart.series, ...comparisonSeries, ...strainSeries]}
        clampTo={chart.clampTo}
        baseline={chart.baseline}
        eventCounts={visiblePoints.map((point) => point.eventCount)}
        statusValues={visiblePoints.map((point) => point.score)}
        strain={
          patternDynamics
            ? {
                label: PATTERN_STRAIN_LABELS[patternDynamics.band],
                band: patternDynamics.band,
                forming: !patternDynamics.dataQuality.isSufficient,
              }
            : undefined
        }
        action={action}
      />
      {controls}
    </div>
  )
}
