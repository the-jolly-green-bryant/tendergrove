import type { TrendDirection, TrendPoint } from '../analytics'
import type { ChartSeries } from './TrendChart'
import type { PatternStrainBand } from '../analytics/patternDynamics'

/** Everything a page needs to hand a well-being trend to `<TrendChart>`. */
export interface TrendChartConfig {
  dates: string[]
  series: ChartSeries[]
  clampTo: [number, number] | null
  baseline?: number
}

const PRIMARY = 'var(--ion-color-primary)'
const UP = 'var(--ion-color-success-shade)'
const DOWN = 'var(--ion-color-danger)'

export const trendLineColor = (direction: TrendDirection): string => {
  if (direction === 'improving') return UP
  if (direction === 'worsening') return DOWN
  return PRIMARY
}

export const currentTrendColor = (points: readonly TrendPoint[]): string => {
  const rollingScores = points
    .map((point) => point.rollingAverage)
    .filter((score): score is number => score !== null)

  if (rollingScores.length < 2) return DOWN

  const current = rollingScores.at(-1)!
  if (current >= 80) return UP
  if (current >= 60) return 'var(--ion-color-warning-shade)'
  return DOWN
}

export const summarizeVolatility = (
  points: readonly TrendPoint[],
): {
  level: 'low' | 'moderate' | 'high'
  largestChange: number
} => {
  const scores = points.flatMap((point) =>
    point.score === null ? [] : [point.score],
  )
  const changes = scores
    .slice(1)
    .map((score, index) => Math.abs(score - scores[index]))
  const largestChange = Math.round(Math.max(0, ...changes))
  const largeChanges = changes.filter((change) => change >= 15).length
  return {
    level:
      largestChange >= 30 || largeChanges >= 2
        ? 'high'
        : largestChange >= 15
          ? 'moderate'
          : 'low',
    largestChange,
  }
}

export const contextualizeVolatility = (
  volatility: ReturnType<typeof summarizeVolatility>,
  strainBand?: PatternStrainBand,
): ReturnType<typeof summarizeVolatility> => {
  if (!strainBand) return volatility
  if (strainBand === 'low') return { ...volatility, level: 'low' }
  if (strainBand === 'emerging' && volatility.level === 'high') {
    return { ...volatility, level: 'moderate' }
  }
  if (
    (strainBand === 'sustained' || strainBand === 'intensive') &&
    volatility.level !== 'low'
  ) {
    return { ...volatility, level: 'high' }
  }
  return volatility
}

export const toDelta = (values: (number | null)[]): (number | null)[] => {
  let prev: number | null = null
  return values.map((value) => {
    if (value === null) return null
    const delta = prev === null ? null : value - prev
    prev = value
    return delta
  })
}

export const buildTrendChart = (
  points: TrendPoint[],
  showDelta: boolean,
  primaryColor: string = PRIMARY,
): TrendChartConfig => {
  const dates = points.map((p) => p.date)

  if (showDelta) {
    return {
      dates,
      series: [
        {
          label: 'Daily change',
          color: '#a5a5a5',
          values: toDelta(points.map((p) => p.score)),
          dashed: true,
        },
        {
          label: 'Trend change',
          color: primaryColor,
          values: toDelta(points.map((p) => p.rollingAverage)),
        },
      ],
      clampTo: null,
    }
  }

  return {
    dates,
    series: [
      {
        label: 'Daily well-being',
        color: '#a5a5a5',
        values: points.map((p) => p.score),
        dashed: true,
      },
      {
        label: '7-day average',
        color: primaryColor,
        values: points.map((p) => p.rollingAverage),
      },
    ],
    clampTo: null,
  }
}
