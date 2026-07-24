import { describe, expect, it } from 'vitest'

import {
  applyGroveScoreSoftFloor,
  buildGroveScoreTrend,
  calculateGroveScore,
  GROVE_SCORE_WEIGHTS,
  groveScoreRegressionAlpha,
  groveScoreRecoveryAlpha,
  negativeTrajectoryPressure,
} from './groveScore'
import type {
  PatternDynamics,
  PatternDynamicsDay,
} from '../features/patterns/analytics/patternDynamics'

const dynamics = (overrides: Partial<PatternDynamics> = {}): PatternDynamics =>
  ({
    burden: 80,
    instability: 40,
    persistence: 70,
    recoveryDifficulty: 60,
    largestDecline: 20,
    severeDeclines: 1,
    intensity: 68,
    band: 'sustained',
    confidence: 100,
    observations: [],
    dataQuality: {
      observedDays: 20,
      expectedDays: 28,
      coverage: 71,
      observedTransitions: 12,
      baselineDays: 20,
      isSufficient: true,
    },
    summary: '',
    analysisStart: null,
    analysisEnd: null,
    baselineStart: null,
    baselineEnd: null,
    ...overrides,
  }) as PatternDynamics

describe('Grove Score v1', () => {
  it('uses the documented full-confidence compound weights', () => {
    const result = calculateGroveScore(70, dynamics())

    expect(result?.effectiveWeights.wellness).toBeCloseTo(
      GROVE_SCORE_WEIGHTS.wellness,
    )
    expect(result?.effectiveWeights.burden).toBe(
      GROVE_SCORE_WEIGHTS.burden,
    )
    expect(result?.effectiveWeights.persistence).toBe(
      GROVE_SCORE_WEIGHTS.persistence,
    )
    expect(result?.effectiveWeights.recoveryDifficulty).toBe(
      GROVE_SCORE_WEIGHTS.recoveryDifficulty,
    )
    expect(result?.effectiveWeights.instability).toBe(
      GROVE_SCORE_WEIGHTS.instability,
    )
    expect(result?.score).toBe(55)
  })

  it('fades temporal weighting when confidence is limited', () => {
    const result = calculateGroveScore(70, dynamics({ confidence: 50 }))

    expect(result?.effectiveWeights.wellness).toBeCloseTo(0.8)
    expect(result?.score).toBe(63)
  })

  it('does not infer strain when longitudinal evidence is insufficient', () => {
    const result = calculateGroveScore(
      70,
      dynamics({
        confidence: 100,
        dataQuality: {
          ...dynamics().dataQuality,
          isSufficient: false,
        },
      }),
    )

    expect(result?.score).toBe(70)
    expect(result?.effectiveWeights.wellness).toBe(1)
  })

  it('keeps missing observations unknown', () => {
    expect(calculateGroveScore(null, dynamics())).toBeNull()
  })

  it('adds pressure when negative indicators become more frequent', () => {
    const days: PatternDynamicsDay[] = Array.from({ length: 28 }, (_, index) => {
      const date = new Date('2026-06-01T12:00:00')
      date.setDate(date.getDate() + index)
      const worsening = index >= 14
      return {
        date: date.toISOString().slice(0, 10),
        score: worsening ? 42 : 58,
        challengeCount: worsening ? 3 : 1,
        positiveCount: 1,
        hasChallenges: worsening || index % 2 === 0,
        hasPositiveSigns: true,
      }
    })

    expect(negativeTrajectoryPressure(days, '2026-06-28')).toBeGreaterThan(0)
  })

  it('does not add trajectory pressure when challenges are stable', () => {
    const days: PatternDynamicsDay[] = Array.from({ length: 28 }, (_, index) => {
      const date = new Date('2026-06-01T12:00:00')
      date.setDate(date.getDate() + index)
      return {
        date: date.toISOString().slice(0, 10),
        score: 55,
        challengeCount: 1,
        positiveCount: 1,
        hasChallenges: true,
        hasPositiveSigns: true,
      }
    })

    expect(negativeTrajectoryPressure(days, '2026-06-28')).toBe(0)
  })

  it('requires sustained recovery after a disproportionate setback', () => {
    const scores = [55, 56, 54, 55, 20, 54, 55, 56]
    const points = scores.map((score, index) => ({
      date: `2026-07-${String(index + 1).padStart(2, '0')}`,
      score,
      rollingAverage: score,
      eventCount: 0,
    }))
    const days: PatternDynamicsDay[] = points.map((point) => ({
      date: point.date,
      score: point.score,
      challengeCount: point.score < 40 ? 4 : 1,
      positiveCount: 1,
      hasChallenges: true,
      hasPositiveSigns: true,
    }))

    const trend = buildGroveScoreTrend(points, days)
    const beforeSetback = trend[3].rollingAverage!
    const afterThreeRecoveredObservations = trend.at(-1)?.rollingAverage!

    expect(afterThreeRecoveredObservations).toBeLessThan(beforeSetback)
  })

  it('lets low-strain patterns recover faster than sustained-strain patterns', () => {
    const low = groveScoreRecoveryAlpha(
      dynamics({
        band: 'low',
        persistence: 10,
        recoveryDifficulty: 10,
      }),
    )
    const sustained = groveScoreRecoveryAlpha(dynamics())

    expect(low).toBe(0.22)
    expect(sustained).toBe(0.004)
    expect(low).toBeGreaterThan(sustained * 50)
  })

  it('does not let one low-strain downturn carry sustained-strain weight', () => {
    expect(groveScoreRegressionAlpha({ band: 'low' })).toBe(0.22)
    expect(groveScoreRegressionAlpha({ band: 'emerging' })).toBe(0.38)
    expect(groveScoreRegressionAlpha({ band: 'sustained' })).toBe(0.52)
  })

  it('preserves distinctions among severely pressured low scores', () => {
    const deeplyPressured = applyGroveScoreSoftFloor(-20)
    const pressured = applyGroveScoreSoftFloor(-10)
    const atZero = applyGroveScoreSoftFloor(0)

    expect(deeplyPressured).toBeGreaterThan(0)
    expect(pressured).toBeGreaterThan(deeplyPressured)
    expect(atZero).toBeGreaterThan(pressured)
    expect(applyGroveScoreSoftFloor(30)).toBeCloseTo(30, 1)
  })

  it('retains decimal fidelity in the plotted trend', () => {
    const points = [0, 100].map((score, index) => ({
      date: `2026-07-${String(index + 1).padStart(2, '0')}`,
      score,
      rollingAverage: score,
      eventCount: 0,
    }))
    const days: PatternDynamicsDay[] = points.map((point) => ({
      date: point.date,
      score: point.score,
      challengeCount: point.score === 0 ? 3 : 0,
      positiveCount: point.score === 100 ? 2 : 0,
      hasChallenges: point.score === 0,
      hasPositiveSigns: point.score === 100,
    }))

    const plotted = buildGroveScoreTrend(points, days).at(-1)?.rollingAverage

    expect(plotted).not.toBeNull()
    expect(Number.isInteger(plotted)).toBe(false)
  })
})
