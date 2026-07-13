import { describe, expect, it } from 'vitest'

import { findRelationships, pearson } from '../relationships'
import type { AnalyticsPersonRef, DailyPersonScore } from '../types'

const dailyScores = (personId: string, scores: (number | null)[]): DailyPersonScore[] =>
  scores.map((score, i) => ({
    personId,
    date: `2025-05-${String(i + 1).padStart(2, '0')}`,
    score,
    checkInCount: score === null ? 0 : 1,
    incidentCount: 0,
    positiveCount: 0,
    negativeCount: 0,
    hasData: score !== null,
    eventCount: 0,
  }))

const you: AnalyticsPersonRef = { id: 'you', displayName: 'You', role: 'self' }
const child: AnalyticsPersonRef = { id: 'child', displayName: 'Child A', role: 'child' }

describe('pearson', () => {
  it('is 1 for a perfectly rising pair', () => {
    expect(
      pearson([
        [1, 2],
        [2, 4],
        [3, 6],
      ]),
    ).toBeCloseTo(1)
  })
  it('is null with no variance', () => {
    expect(
      pearson([
        [5, 1],
        [5, 2],
        [5, 3],
      ]),
    ).toBeNull()
  })
})

describe('findRelationships', () => {
  it('finds a strong same-day relationship between two people', () => {
    const scores = [20, 40, 30, 60, 50, 80, 70, 90]
    const rel = findRelationships([you, child], {
      you: dailyScores('you', scores),
      child: dailyScores('child', scores),
    })
    expect(rel).toHaveLength(1)
    expect(rel[0].confidence).toBe('high')
    expect(rel[0].correlation).toBeGreaterThan(0.6)
    expect(rel[0].chartData).toHaveLength(scores.length)
    // Non-blaming, non-causal language only.
    expect(rel[0].summary).not.toMatch(/caus|blame|fault|diagnos/i)
  })

  it('detects a next-day lead relationship', () => {
    // Child's distress echoes your distress one day later.
    const yourScores = [10, 80, 20, 85, 15, 90, 25, 88]
    const childScores = [50, 10, 80, 20, 85, 15, 90, 25] // shifted +1 day behind you
    const rel = findRelationships([you, child], {
      you: dailyScores('you', yourScores),
      child: dailyScores('child', childScores),
    })
    expect(rel).toHaveLength(1)
    expect(rel[0].lagDays).toBe(1)
    expect(rel[0].personAName).toBe('You') // you lead, child follows
    expect(rel[0].personBName).toBe('Child A')
  })

  it('returns nothing for uncorrelated series', () => {
    const rel = findRelationships([you, child], {
      you: dailyScores('you', [10, 90, 15, 85, 20, 80, 25, 75]),
      child: dailyScores('child', [50, 52, 48, 51, 49, 50, 51, 49]),
    })
    expect(rel).toHaveLength(0)
  })

  it('returns nothing with too few overlapping days', () => {
    const rel = findRelationships([you, child], {
      you: dailyScores('you', [10, 20, 30]),
      child: dailyScores('child', [10, 20, 30]),
    })
    expect(rel).toHaveLength(0)
  })
})
