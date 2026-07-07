import { describe, expect, it } from 'vitest'

import { computeTrend, rollingAverage, type ScoredDay } from '../trends'

/** Build a 14-day series from an array of scores (null allowed). */
function series(scores: (number | null)[]): ScoredDay[] {
  return scores.map((score, i) => ({
    date: `2025-05-${String(i + 1).padStart(2, '0')}`,
    score,
  }))
}

describe('rollingAverage', () => {
  it('smooths with a trailing window and skips missing days', () => {
    const result = rollingAverage(series([10, 20, null, 40]), 2)
    expect(result[0]).toBe(10) // [10]
    expect(result[1]).toBe(15) // [10,20]
    expect(result[2]).toBe(20) // [20] (null skipped)
    expect(result[3]).toBe(40) // [40] (null skipped)
  })

  it('is null while no scores exist in the window', () => {
    expect(rollingAverage(series([null, null]))[0]).toBeNull()
  })
})

describe('computeTrend', () => {
  it('reports worsening when recent distress is meaningfully higher', () => {
    const prev = [40, 40, 40, 40, 40, 40, 40]
    const curr = [60, 60, 60, 60, 60, 60, 60]
    const trend = computeTrend(series([...prev, ...curr]))
    expect(trend.previous7DayAverage).toBe(40)
    expect(trend.current7DayAverage).toBe(60)
    expect(trend.delta).toBe(20)
    expect(trend.direction).toBe('worsening')
    expect(trend.confidence).toBe('high')
  })

  it('reports improving when recent distress is meaningfully lower', () => {
    const trend = computeTrend(
      series([70, 70, 70, 70, 70, 70, 70, 45, 45, 45, 45, 45, 45, 45]),
    )
    expect(trend.direction).toBe('improving')
    expect(trend.delta).toBe(-25)
  })

  it('reports stable when movement is within the noise band', () => {
    const trend = computeTrend(
      series([50, 50, 50, 50, 50, 50, 50, 52, 52, 52, 52, 52, 52, 52]),
    )
    expect(trend.direction).toBe('stable')
  })

  it('reports insufficient with too few recent scored days', () => {
    const trend = computeTrend(
      series([
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        50,
        50,
        null,
        null,
        null,
        null,
        null,
      ]),
    )
    expect(trend.direction).toBe('insufficient')
    expect(trend.confidence).toBe('low')
  })

  it('produces one chart point per day', () => {
    const trend = computeTrend(series(new Array(14).fill(50)))
    expect(trend.points).toHaveLength(14)
    expect(trend.points[13].rollingAverage).toBe(50)
  })
})
