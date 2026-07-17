import type { TrendDirection, TrendPoint } from '../analytics'
import type { ChartSeries } from './TrendChart'

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
  const history = rollingScores.slice(0, -1)
  const historicalMean = history.reduce((sum, score) => sum + score, 0) / history.length
  return current >= historicalMean ? UP : DOWN
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
