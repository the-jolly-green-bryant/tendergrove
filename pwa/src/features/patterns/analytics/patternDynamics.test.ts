import { describe, expect, it } from 'vitest'
import {
  calculateBurden,
  buildPatternStrainTrend,
  calculateInstability,
  calculatePatternDynamics,
  calculatePersistence,
  calculateRecoveryDifficulty,
  determinePatternStrainBand,
  rootMeanSquareSuccessiveDifference,
  type PatternDynamicsDay,
} from './patternDynamics'

const day = (
  offset: number,
  score: number | null,
  challengeCount = 0,
  positiveCount = challengeCount ? 0 : 1,
): PatternDynamicsDay => {
  const date = new Date(2026, 0, 1 + offset, 12)
  return {
    date: date.toISOString().slice(0, 10),
    score,
    challengeCount,
    positiveCount,
    hasChallenges: challengeCount > 0,
    hasPositiveSigns: positiveCount > 0,
  }
}

const baseline = Array.from({ length: 18 }, (_, index) => day(index, 80, 0, 1))
const dimensions = {
  burden: 10,
  instability: 10,
  persistence: 10,
  recoveryDifficulty: 10,
  intensity: 10,
  confidence: 90,
}

describe('pattern strain burden', () => {
  it('is low when no challenges are recorded', () => {
    expect(calculateBurden([day(20, 85), day(21, 82)], baseline)).toBe(0)
  })

  it('rises when challenges occur every day and cluster together', () => {
    const single = Array.from({ length: 7 }, (_, index) => day(20 + index, 55, 1))
    const clustered = Array.from({ length: 7 }, (_, index) => day(20 + index, 45, 3))
    expect(calculateBurden(single, baseline)).toBeGreaterThan(50)
    expect(calculateBurden(clustered, baseline)).toBeGreaterThan(
      calculateBurden(single, baseline),
    )
  })

  it('captures falling positive availability and ignores missing days', () => {
    const current = [day(20, 70, 0, 0), day(21, null), day(22, 72, 0, 0)]
    expect(calculateBurden(current, baseline)).toBeGreaterThan(0)
    expect(calculateBurden(current, baseline)).toBe(
      calculateBurden(
        current.filter((item) => item.score !== null),
        baseline,
      ),
    )
  })
})

describe('pattern strain instability', () => {
  it('is zero for a flat series and small for a gradual decline', () => {
    expect(
      rootMeanSquareSuccessiveDifference([day(20, 70), day(21, 70), day(22, 70)]),
    ).toBe(0)
    expect(
      calculateInstability([day(20, 80), day(21, 77), day(22, 74)], baseline),
    ).toBeLessThan(30)
  })

  it('responds to alternating values and a large decline more than an improvement', () => {
    const alternating = [day(20, 90), day(21, 30), day(22, 90), day(23, 30)]
    const decline = [day(20, 90), day(21, 40)]
    const improvement = [day(20, 40), day(21, 90)]
    expect(calculateInstability(alternating, baseline)).toBeGreaterThan(60)
    expect(calculateInstability(decline, baseline)).toBeGreaterThan(
      calculateInstability(improvement, baseline),
    )
  })

  it('requires valid transitions and excludes large date gaps', () => {
    expect(calculateInstability([day(20, 80)], baseline)).toBe(0)
    expect(calculateInstability([day(20, 90), day(25, 20)], baseline)).toBe(0)
  })
})

describe('pattern strain persistence and recovery', () => {
  it('rates isolated, two-day, and long difficult episodes progressively', () => {
    const isolated = [day(20, 40), day(21, 80), day(22, 80)]
    const twoDay = [day(20, 40), day(21, 45), day(22, 80), day(23, 80)]
    const long = [
      day(20, 40),
      day(21, 45),
      day(22, 42),
      day(23, 44),
      day(24, 80),
      day(25, 80),
    ]
    expect(calculatePersistence(twoDay, baseline)).toBeGreaterThan(
      calculatePersistence(isolated, baseline),
    )
    expect(calculatePersistence(long, baseline)).toBeGreaterThan(
      calculatePersistence(twoDay, baseline),
    )
  })

  it('treats observed dates as neighbors across missing-day gaps', () => {
    const continuous = [day(20, 40), day(21, 40), day(22, 40)]
    const split = [day(20, 40), day(24, 40), day(28, 40)]
    expect(calculatePersistence(split, baseline)).toBe(
      calculatePersistence(continuous, baseline),
    )
  })

  it('treats sparse easier observations as neighboring recovery evidence', () => {
    const continuous = [day(20, 35, 2, 0), day(21, 75), day(22, 78)]
    const sparse = [day(20, 35, 2, 0), day(26, 75), day(34, 78)]
    expect(calculateRecoveryDifficulty(sparse, baseline)).toBe(
      calculateRecoveryDifficulty(continuous, baseline),
    )
  })

  it('keeps chronically poor absolute levels visible despite a poor baseline', () => {
    const poorBaseline = Array.from({ length: 18 }, (_, index) =>
      day(index, 38, 0, 1),
    )
    const stillPoor = Array.from({ length: 8 }, (_, index) =>
      day(30 + index * 3, 40, 0, 1),
    )
    expect(calculatePersistence(stillPoor, poorBaseline)).toBeGreaterThanOrEqual(65)
    expect(calculateRecoveryDifficulty(stillPoor, poorBaseline)).toBeGreaterThanOrEqual(
      55,
    )
  })

  it('does not count a return to a poor baseline as meaningful recovery', () => {
    const poorBaseline = Array.from({ length: 18 }, (_, index) =>
      day(index, 38, 0, 1),
    )
    const returnToPoorBaseline = [
      day(20, 20, 2, 0),
      day(25, 38, 0, 1),
      day(32, 40, 0, 1),
    ]
    const actualRecovery = [day(20, 20, 2, 0), day(25, 70), day(32, 74)]
    expect(
      calculateRecoveryDifficulty(returnToPoorBaseline, poorBaseline),
    ).toBeGreaterThan(calculateRecoveryDifficulty(actualRecovery, poorBaseline))
  })

  it('requires sustained recovery and identifies unresolved or slower episodes', () => {
    const immediate = [day(20, 40), day(21, 80), day(22, 82)]
    const relapse = [day(20, 40), day(21, 80), day(22, 40), day(23, 80), day(24, 82)]
    const unresolved = [day(20, 40), day(21, 45), day(22, 42)]
    expect(calculateRecoveryDifficulty(relapse, baseline)).toBeGreaterThan(
      calculateRecoveryDifficulty(immediate, baseline),
    )
    expect(calculateRecoveryDifficulty(unresolved, baseline)).toBeGreaterThan(
      calculateRecoveryDifficulty(immediate, baseline),
    )
    expect(calculateRecoveryDifficulty([day(20, 80), day(21, 82)], baseline)).toBe(0)
  })

  it('combines recovery evidence across multiple episodes', () => {
    const mixedEpisodes = [
      day(20, 40),
      day(21, 80),
      day(22, 82),
      day(23, 40),
      day(24, 45),
      day(25, 50),
      day(26, 80),
      day(27, 82),
    ]
    expect(calculateRecoveryDifficulty(mixedEpisodes, baseline)).toBeGreaterThan(0)
  })
})

describe('pattern strain classification and narrative', () => {
  it('classifies low dimensions as Low strain', () => {
    expect(determinePatternStrainBand(dimensions)).toBe('low')
  })

  it('limits a single elevated dimension to Emerging strain', () => {
    expect(
      determinePatternStrainBand({ ...dimensions, instability: 80, intensity: 30 }),
    ).toBe('emerging')
  })

  it('never lets instability alone produce Intensive strain', () => {
    expect(
      determinePatternStrainBand({ ...dimensions, instability: 100, intensity: 80 }),
    ).toBe('elevated')
  })

  it('requires persistence with burden or recovery for Sustained strain', () => {
    expect(
      determinePatternStrainBand({
        ...dimensions,
        burden: 60,
        persistence: 65,
        intensity: 55,
      }),
    ).toBe('sustained')
  })

  it('recognizes sustained high burden with difficult recovery', () => {
    expect(
      determinePatternStrainBand({
        ...dimensions,
        burden: 83,
        instability: 39,
        persistence: 43,
        recoveryDifficulty: 62,
        intensity: 60,
      }),
    ).toBe('sustained')
  })

  it('recognizes sustained high burden with persistent difficulty on normalized scores', () => {
    expect(
      determinePatternStrainBand({
        ...dimensions,
        burden: 78,
        instability: 32,
        persistence: 48,
        recoveryDifficulty: 38,
        intensity: 51,
      }),
    ).toBe('sustained')
  })

  it('keeps burden plus volatility emerging without persistence or recovery difficulty', () => {
    expect(
      determinePatternStrainBand({
        ...dimensions,
        burden: 69,
        instability: 72,
        persistence: 6,
        recoveryDifficulty: 11,
        intensity: 36,
      }),
    ).toBe('emerging')
  })

  it('requires burden, persistence, recovery, intensity, and confidence for Intensive strain', () => {
    const intensive = {
      ...dimensions,
      burden: 80,
      persistence: 75,
      recoveryDifficulty: 75,
      intensity: 75,
    }
    expect(determinePatternStrainBand(intensive)).toBe('intensive')
    expect(determinePatternStrainBand({ ...intensive, confidence: 20 })).not.toBe(
      'intensive',
    )
  })

  it('uses guarded, non-clinical wording with sparse data', () => {
    const result = calculatePatternDynamics(
      [day(20, 30, 2), day(21, 35, 2)],
      baseline.slice(0, 3),
    )
    expect(result.summary).toMatch(/^Available observations suggest/)
    expect(result.summary.toLowerCase()).not.toContain('stable')
    expect(result.summary.toLowerCase()).not.toContain('diagnos')
    expect(result.observations.some((item) => item.dimension === 'data-quality')).toBe(
      true,
    )
    expect(result.band).not.toBe('intensive')
  })

  it('selects the strongest dimensions without prohibited status language', () => {
    const current = Array.from({ length: 10 }, (_, index) =>
      day(20 + index, index % 2 ? 35 : 55, 2, 0),
    )
    const result = calculatePatternDynamics(current, baseline)
    expect(result.observations[0].importance).toBe('primary')
    expect(result.observations).toHaveLength(3)
    expect(
      `${result.summary} ${result.observations.map((item) => item.detail).join(' ')}`.toLowerCase(),
    ).not.toMatch(/\b(stable|crisis|diagnosis|inpatient)\b/)
  })

  it('classifies the Beth reference pattern as sustained or intensive strain', () => {
    const current = Array.from({ length: 28 }, (_, index) => {
      const scores = [45, 38, 18, 42, 25, 12, 35]
      return day(100 + index, scores[index % scores.length], 2, 0)
    })
    const result = calculatePatternDynamics(current, baseline)
    expect(['sustained', 'intensive']).toContain(result.band)
    expect(result.persistence).toBeGreaterThanOrEqual(65)
    expect(result.recoveryDifficulty).toBeGreaterThanOrEqual(65)
    expect(result.largestDecline).toBeGreaterThanOrEqual(20)
    expect(
      result.observations.some((item) =>
        item.detail.includes('largest recent decline'),
      ),
    ).toBe(true)
  })

  it('keeps missing days as unknown rather than treating them as easier days', () => {
    const recorded = [day(20, 35, 2, 0), day(22, 30, 2, 0), day(24, 40, 2, 0)]
    const withMissing = [
      recorded[0],
      day(21, null),
      recorded[1],
      day(23, null),
      recorded[2],
    ]
    const recordedResult = calculatePatternDynamics(recorded, baseline)
    const missingResult = calculatePatternDynamics(withMissing, baseline)
    expect(missingResult.burden).toBe(recordedResult.burden)
    expect(missingResult.persistence).toBe(recordedResult.persistence)
    expect(missingResult.dataQuality.observedDays).toBe(3)
    expect(missingResult.dataQuality.coverage).toBe(11)
  })
})

describe('pattern strain trend', () => {
  it('builds rolling strain points across the past three months', () => {
    const history = Array.from({ length: 120 }, (_, index) =>
      index < 70
        ? day(index, 82, 0, 1)
        : day(index, index % 4 === 0 ? 25 : 45, 2, 0),
    )
    const trend = buildPatternStrainTrend(history, day(119, 0).date)
    expect(trend).toHaveLength(14)
    expect(trend.at(-1)?.intensity).not.toBeNull()
    expect(['elevated', 'sustained', 'intensive']).toContain(trend.at(-1)?.band)
  })

  it('leaves under-observed periods unknown', () => {
    const sparse = Array.from({ length: 5 }, (_, index) => day(115 + index, 35, 2, 0))
    const trend = buildPatternStrainTrend(sparse, day(119, 0).date)
    expect(trend.every((point) => point.intensity === null && point.band === null)).toBe(
      true,
    )
  })
})
