import { describe, expect, it } from 'vitest'

import { buildAnomalyPatterns } from '../anomalyPatterns'
import type { DailyPersonScore } from '../types'
import { checkIn, indicator, iso, person } from './fixtures'

const score = (personId: string, day: number, value: number): DailyPersonScore => ({
  personId,
  date: `2025-05-${String(day).padStart(2, '0')}`,
  score: value,
  checkInCount: 1,
  incidentCount: 0,
  positiveCount: 0,
  negativeCount: 0,
  hasData: true,
  eventCount: 0,
})

describe('buildAnomalyPatterns other people signals', () => {
  it('ignores archived indicator ids preserved in historical check-ins', () => {
    const target = person('target', { displayName: 'Beth' })
    const activeChallenge = indicator('undesired', 'Active challenge', {
      id: 'active-challenge',
    })
    const archivedChallenge = indicator('undesired', 'Archived challenge', {
      id: 'archived-challenge',
      active: false,
    })
    const other = person('other', {
      displayName: 'Steph',
      indicators: [activeChallenge, archivedChallenge],
      checkIns: [
        checkIn(iso(2025, 5, 1), ['active-challenge', 'archived-challenge']),
        checkIn(iso(2025, 5, 2), ['active-challenge', 'archived-challenge']),
        ...[3, 4, 5, 6, 7].map((day) => checkIn(iso(2025, 5, day), [])),
      ],
    })
    const targetScores = [20, 20, 80, 80, 80, 80, 80].map((value, index) =>
      score('target', index + 1, value),
    )
    const otherScores = [1, 2, 3, 4, 5, 6, 7].map((day) =>
      score('other', day, 70),
    )

    const patterns = buildAnomalyPatterns({
      person: target,
      people: [target, other],
      dailyScores: targetScores,
      personDailyScores: { target: targetScores, other: otherScores },
      lifeEvents: [],
    })

    expect(patterns.otherPeople?.items).toHaveLength(1)
    expect(patterns.otherPeople?.items[0]).toMatchObject({
      label: 'Active challenge',
      personName: 'Steph',
    })
  })
})
