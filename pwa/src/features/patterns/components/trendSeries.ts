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
const SECONDARY = 'var(--ion-color-secondary-shade)'
const UP = 'var(--ion-color-success-shade)'
const DOWN = 'var(--ion-color-danger)'

/** Colour the primary line by direction: green rising, red falling, brand flat. */
export function trendLineColor(direction: TrendDirection): string {
  if (direction === 'improving') return UP
  if (direction === 'worsening') return DOWN
  return PRIMARY
}

/**
 * Day-to-day change: each point becomes its difference from the previous
 * scored day. The first scored point has no prior, so it is left blank.
 */
export function toDelta(values: (number | null)[]): (number | null)[] {
  let prev: number | null = null
  return values.map((value) => {
    if (value === null) return null
    const delta = prev === null ? null : value - prev
    prev = value
    return delta
  })
}

/**
 * Build the chart config for a trend, honouring the shared "delta" toggle.
 *
 *  - Absolute: the daily score plus a dashed 7-day rolling average, axis 0–100.
 *  - Delta: a single day-to-day change line around a zero baseline, so dramatic
 *    swings are obvious. The axis auto-scales through negatives.
 */
export function buildTrendChart(
  points: TrendPoint[],
  showDelta: boolean,
  primaryColor: string = PRIMARY,
): TrendChartConfig {
  const dates = points.map((p) => p.date)

  if (showDelta) {
    return {
      dates,
      series: [
        {
          label: 'Day-to-day change',
          color: primaryColor,
          values: toDelta(points.map((p) => p.score)),
        },
      ],
      clampTo: null,
      baseline: 0,
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
