import React, { useMemo } from 'react'
import { FlippableCard } from '../../../components/FlippableCard'
import { CardExplanation } from '../../../components/CardExplanation'

import type { TrendPoint } from '../analytics'
import {
  buildPatternStrainTrend,
  type PatternDynamicsDay,
} from '../analytics/patternDynamics'
import { TrendChart } from './TrendChart'
import {
  buildTrendChart,
  currentTrendColor,
  toDelta,
} from './trendSeries'
import { buildGroveScoreTrend } from '../../../lib/groveScore'

export const TrendChartPanel = ({
  points,
  rangeDays,
  showDelta,
  controls,
  action,
  className = '',
  comparisons = [],
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
  readonly showStrain?: boolean
  readonly patternStrainDays?: PatternDynamicsDay[]
  readonly patternStrainEndDate?: string
}): React.JSX.Element => {
  const visiblePoints = useMemo(
    () => points.slice(-rangeDays),
    [points, rangeDays],
  )
  const fullGrovePoints = useMemo(
    () =>
      patternStrainDays.length
        ? buildGroveScoreTrend(points, patternStrainDays)
        : [...points],
    [points, patternStrainDays],
  )
  const grovePoints = useMemo(
    () => fullGrovePoints.slice(-rangeDays),
    [fullGrovePoints, rangeDays],
  )
  const chart = buildTrendChart(
    grovePoints,
    showDelta,
    currentTrendColor(grovePoints),
  )
  if (chart.series[0]) {
    chart.series[0].label = showDelta
      ? 'Raw wellness change'
      : 'Raw wellness'
    chart.series[0].values = showDelta
      ? toDelta(visiblePoints.map((point) => point.score))
      : visiblePoints.map((point) => point.score)
  }
  chart.series.forEach((series) => {
    if (series.label === 'Daily well-being') series.label = 'Daily Grove Score'
    if (series.label === '7-day average') series.label = 'Grove Score trend'
    if (series.label === 'Daily change') series.label = 'Daily Grove Score change'
    if (series.label === 'Trend change') series.label = 'Grove Score trend change'
  })
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
    <FlippableCard
      className={`pattern-chart__container ${className}`.trim()}
      back={(
        <CardExplanation
          summary="This chart shows how Grove Score changes over time."
          points={[
            'The daily line reflects each day’s recorded observations.',
            'The smoother trend line makes longer rises and dips easier to see.',
            'Use the time buttons to look at a shorter or longer period.',
          ]}
        />
      )}
    >
      <TrendChart
        dates={chart.dates}
        series={[...chart.series, ...comparisonSeries, ...strainSeries]}
        clampTo={chart.clampTo}
        baseline={chart.baseline}
        eventCounts={visiblePoints.map((point) => point.eventCount)}
        action={action}
      />
      {controls}
    </FlippableCard>
  )
}
