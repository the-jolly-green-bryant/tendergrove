import { describe, expect, it } from 'vitest'

import type { TrendPoint } from '../../analytics'
import { buildTrendChart, toDelta } from '../trendSeries'

describe('toDelta', () => {
  it('turns values into day-to-day change, leaving the first blank', () => {
    expect(toDelta([50, 55, 40])).toEqual([null, 5, -15])
  })

  it('measures change from the last known value across gaps', () => {
    expect(toDelta([50, null, 70])).toEqual([null, null, 20])
  })

  it('leaves the leading blank until the first score', () => {
    expect(toDelta([null, 60, 66])).toEqual([null, null, 6])
  })
})

describe('buildTrendChart', () => {
  const points: TrendPoint[] = [
    { date: '2025-05-01', score: 50, rollingAverage: 50 },
    { date: '2025-05-02', score: 60, rollingAverage: 55 },
  ]

  it('shows daily + rolling series clamped to 0–100 by default', () => {
    const config = buildTrendChart(points, false)
    expect(config.series).toHaveLength(2)
    expect(config.clampTo).toEqual([0, 100])
    expect(config.baseline).toBeUndefined()
  })

  it('shows a single change series with a zero baseline in delta mode', () => {
    const config = buildTrendChart(points, true)
    expect(config.series).toHaveLength(1)
    expect(config.series[0].values).toEqual([null, 10])
    expect(config.clampTo).toBeNull()
    expect(config.baseline).toBe(0)
  })
})
