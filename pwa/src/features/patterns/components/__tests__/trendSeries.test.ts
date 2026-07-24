import { describe, expect, it } from 'vitest'

import type { TrendPoint } from '../../analytics'
import {
  buildTrendChart,
  contextualizeVolatility,
  currentTrendColor,
  summarizeVolatility,
  toDelta,
} from '../trendSeries'

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
    { date: '2025-05-01', score: 50, rollingAverage: 50, eventCount: 2 },
    { date: '2025-05-02', score: 60, rollingAverage: 55, eventCount: 0 },
  ]

  it('shows daily + rolling series with automatic scaling by default', () => {
    const config = buildTrendChart(points, false)
    expect(config.series).toHaveLength(2)
    expect(config.clampTo).toBeNull()
    expect(config.baseline).toBeUndefined()
  })

  it('shows raw and smoothed change without an extra zero line in delta mode', () => {
    const config = buildTrendChart(points, true)
    expect(config.series).toHaveLength(2)
    expect(config.series[0].values).toEqual([null, 10])
    expect(config.series[0].dashed).toBe(true)
    expect(config.series[1].values).toEqual([null, 5])
    expect(config.clampTo).toBeNull()
    expect(config.baseline).toBeUndefined()
  })
})

describe('currentTrendColor', () => {
  const pointsAt = (current: number): TrendPoint[] => [
    { date: '2025-05-01', score: 10, rollingAverage: 10, eventCount: 0 },
    { date: '2025-05-02', score: current, rollingAverage: current, eventCount: 0 },
  ]

  it('keeps a low wellness trend concerning even when it is improving', () => {
    expect(currentTrendColor(pointsAt(19))).toBe('var(--ion-color-danger)')
  })

  it('uses the current wellness level for warning and positive colors', () => {
    expect(currentTrendColor(pointsAt(70))).toBe(
      'var(--ion-color-warning-shade)',
    )
    expect(currentTrendColor(pointsAt(85))).toBe(
      'var(--ion-color-success-shade)',
    )
  })
})

describe('summarizeVolatility', () => {
  const points = (scores: number[]): TrendPoint[] =>
    scores.map((score, index) => ({
      date: `2025-05-${String(index + 1).padStart(2, '0')}`,
      score,
      rollingAverage: score,
      eventCount: 0,
    }))

  it('marks repeated large changes as high volatility', () => {
    expect(summarizeVolatility(points([30, 50, 28, 48]))).toEqual({
      level: 'high',
      largestChange: 22,
    })
  })

  it('keeps ordinary movement visually quiet', () => {
    expect(summarizeVolatility(points([72, 76, 70, 78]))).toEqual({
      level: 'low',
      largestChange: 8,
    })
  })
})

describe('contextualizeVolatility', () => {
  const high = { level: 'high' as const, largestChange: 40 }

  it('keeps low-strain variation quiet and emerging variation moderate', () => {
    expect(contextualizeVolatility(high, 'low').level).toBe('low')
    expect(contextualizeVolatility(high, 'emerging').level).toBe('moderate')
  })

  it('emphasizes repeated movement inside sustained strain', () => {
    expect(contextualizeVolatility(high, 'sustained').level).toBe('high')
  })
})
