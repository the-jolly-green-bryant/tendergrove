import { describe, expect, it } from 'vitest'

import { analyzeHousehold, type RawPerson } from '../index'
import { buildPersonView } from '../personView'
import { NOW } from './fixtures'

/** May day at noon, as an ISO string. */
function may(day: number): string {
  return new Date(2025, 4, day, 12).toISOString()
}

const p1: RawPerson = {
  id: 'p1',
  displayName: 'Child A',
  role: 'child',
  indicators: [
    { id: 'sleep', name: 'poor sleep', polarity: 'undesired', active: true },
    { id: 'dys', name: 'dysregulation', polarity: 'undesired', active: true },
  ],
  checkIns: [
    ...[2, 6, 10, 14, 18].map((d) => ({
      occurredAt: may(d),
      answersJson: { checked: ['sleep'] },
    })),
    ...[3, 7, 11, 15].map((d) => ({
      occurredAt: may(d),
      answersJson: { checked: ['dys'] },
    })),
  ],
  events: [],
}

const p2: RawPerson = {
  id: 'p2',
  displayName: 'You',
  role: 'self',
  indicators: [{ id: 'fatigue', name: 'fatigue', polarity: 'undesired', active: true }],
  checkIns: [{ occurredAt: may(20), answersJson: { checked: ['fatigue'] } }],
  events: [],
}

describe('buildPersonView', () => {
  const result = analyzeHousehold([p1, p2], { now: NOW, windowDays: 30 })

  it("uses the person's own trend and daily scores", () => {
    const view = buildPersonView(result, 'p1')
    expect(view.trend).toBe(result.personTrends.p1)
    expect(view.dailyScores).toBe(result.personDailyScores.p1)
    expect(view.scoredDays).toBe(9) // 5 sleep days + 4 dysregulation days
  })

  it('keeps only correlations involving the person', () => {
    const view = buildPersonView(result, 'p1')
    expect(view.correlations.length).toBeGreaterThan(0)
    expect(
      view.correlations.every(
        (c) => c.sourcePersonId === 'p1' || c.targetPersonId === 'p1',
      ),
    ).toBe(true)
  })

  it('shows no correlations for a person without any', () => {
    expect(buildPersonView(result, 'p2').correlations).toHaveLength(0)
  })

  it('builds a per-person calendar spanning the window', () => {
    expect(buildPersonView(result, 'p1').calendar).toHaveLength(30)
  })
})
