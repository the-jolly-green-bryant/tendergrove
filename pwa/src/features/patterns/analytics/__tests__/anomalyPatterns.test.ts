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
  negativeCount: value <= 45 ? 1 : 0,
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
    const otherScores = [1, 2, 3, 4, 5, 6, 7].map((day) => score('other', day, 70))

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

  it('compares another household member’s overall severe days with the viewed person', () => {
    const target = person('target', { displayName: 'Beth' })
    const other = person('other', { displayName: 'Bryant' })
    const targetScores = [20, 20, 80, 80, 80, 80, 80].map((value, index) =>
      score('target', index + 1, value),
    )
    const otherScores = [20, 20, 80, 80, 80, 80, 80].map((value, index) =>
      score('other', index + 1, value),
    )

    const patterns = buildAnomalyPatterns({
      person: target,
      people: [target, other],
      dailyScores: targetScores,
      personDailyScores: { target: targetScores, other: otherScores },
      lifeEvents: [],
    })

    expect(patterns.otherPeople?.top).toMatchObject({
      personName: 'Bryant',
      label: 'Higher-severity days',
      kind: 'severity',
      anomalyRate: 100,
      typicalRate: 0,
    })
  })
})

describe('buildAnomalyPatterns event signals', () => {
  it('does not treat low wellness alone as explicit behavioral escalation', () => {
    const beth = person('beth', {
      checkIns: Array.from({ length: 7 }, (_, index) =>
        checkIn(iso(2025, 5, index + 1), []),
      ),
    })
    const scores = Array.from({ length: 7 }, (_, index) => ({
      ...score('beth', index + 1, 0),
      negativeCount: 0,
    }))

    const patterns = buildAnomalyPatterns({
      person: beth,
      people: [beth],
      dailyScores: scores,
      personDailyScores: { beth: scores },
      lifeEvents: [],
    })

    expect(patterns.baseline).toBeNull()
  })

  it('reports the hard-day rate on event days, not the event rate among hard days', () => {
    const eventId = 'family-therapy'
    const beth = person('beth', {
      displayName: 'Beth',
      checkIns: Array.from({ length: 10 }, (_, index) => ({
        ...checkIn(iso(2025, 5, index + 1), []),
        eventIds: index < 3 ? [eventId] : [],
      })),
    })
    const scores = [20, 20, 80, 80, 80, 80, 80, 80, 80, 80].map((value, index) =>
      score('beth', index + 1, value),
    )

    const patterns = buildAnomalyPatterns({
      person: beth,
      people: [beth],
      dailyScores: scores,
      personDailyScores: { beth: scores },
      lifeEvents: [{ id: eventId, label: 'Family Therapy' }],
    })

    expect(patterns.events?.top).toMatchObject({
      label: 'Family therapy',
      anomalyRate: 67,
      anomalyOccurrences: 2,
      anomalyOpportunities: 3,
      typicalRate: 0,
      typicalOpportunities: 7,
    })
  })

  it('analyzes related events both discretely and as an analytics-only group', () => {
    const beth = person('beth', {
      checkIns: Array.from({ length: 10 }, (_, index) => ({
        ...checkIn(iso(2025, 5, index + 1), []),
        eventIds: index === 0 ? ['pass-day'] : index === 1 ? ['pass-overnight'] : [],
      })),
    })
    const scores = [20, 20, 80, 80, 80, 80, 80, 80, 80, 80].map((value, index) =>
      score('beth', index + 1, value),
    )

    const patterns = buildAnomalyPatterns({
      person: beth,
      people: [beth],
      dailyScores: scores,
      personDailyScores: { beth: scores },
      lifeEvents: [
        { id: 'pass-day', label: 'Pass - Day' },
        { id: 'pass-overnight', label: 'Pass - Overnight' },
      ],
    })

    expect(patterns.events?.top).toMatchObject({
      id: 'analytics-group:passes',
      label: 'Passes',
      anomalyOccurrences: 2,
      anomalyOpportunities: 2,
    })
  })

  it('does not let events older than a year dominate recent insights', () => {
    const oldHospitalization = {
      ...checkIn(iso(2024, 1, 1), []),
      eventIds: ['hospitalization'],
    }
    const recentCheckIns = Array.from({ length: 10 }, (_, index) => ({
      ...checkIn(iso(2025, 5, index + 1), []),
      eventIds: index < 2 ? ['calls'] : [],
    }))
    const beth = person('beth', {
      checkIns: [oldHospitalization, ...recentCheckIns],
    })
    const scores: DailyPersonScore[] = [
      { ...score('beth', 1, 10), date: '2024-01-01' },
      ...[20, 20, 80, 80, 80, 80, 80, 80, 80, 80].map((value, index) =>
        score('beth', index + 1, value),
      ),
    ]

    const patterns = buildAnomalyPatterns({
      person: beth,
      people: [beth],
      dailyScores: scores,
      personDailyScores: { beth: scores },
      lifeEvents: [
        { id: 'hospitalization', label: 'Hospitalization' },
        { id: 'calls', label: 'Call - Beth/Bryant' },
      ],
    })

    expect(patterns.events?.items.map((item) => item.label)).not.toContain(
      'Hospitalization',
    )
    expect(patterns.events?.top.label).toBe('Calls')
  })

  it('compares escalation burden rather than calling every behavior day hard', () => {
    const beth = person('beth', {
      checkIns: Array.from({ length: 10 }, (_, index) => ({
        ...checkIn(iso(2025, 5, index + 1), []),
        eventIds: index < 2 ? ['pass-day'] : [],
      })),
    })
    const scores = Array.from({ length: 10 }, (_, index) => ({
      ...score('beth', index + 1, index < 2 ? 0 : 60),
      // One routine challenge occurs daily; the first two days contain an
      // additional escalation and should be the only behavioral hard days.
      negativeCount: index < 2 ? 2 : 1,
    }))

    const patterns = buildAnomalyPatterns({
      person: beth,
      people: [beth],
      dailyScores: scores,
      personDailyScores: { beth: scores },
      lifeEvents: [{ id: 'pass-day', label: 'Pass - Day' }],
    })

    expect(patterns.baseline).toMatchObject({ thresholdScore: 2, anomalousDays: 2 })
    expect(patterns.events?.top).toMatchObject({ label: 'Passes', anomalyRate: 100 })
  })

  it('shows a repeated event as early evidence before it clears the strong threshold', () => {
    const beth = person('beth', {
      checkIns: Array.from({ length: 10 }, (_, index) => ({
        ...checkIn(iso(2025, 5, index + 1), []),
        eventIds: index < 2 ? ['family-therapy'] : [],
      })),
    })
    const scores = [20, 80, 20, 80, 80, 80, 80, 80, 80, 80].map((value, index) =>
      score('beth', index + 1, value),
    )

    const patterns = buildAnomalyPatterns({
      person: beth,
      people: [beth],
      dailyScores: scores,
      personDailyScores: { beth: scores },
      lifeEvents: [{ id: 'family-therapy', label: 'Family Therapy - Bryant' }],
    })

    expect(patterns.events?.top).toMatchObject({
      label: 'Family therapy',
      evidence: 'early',
      anomalyRate: 50,
      typicalRate: 13,
      anomalyOpportunities: 2,
    })
  })
})
