import { describe, expect, it } from 'vitest'

import { analyzeHousehold, type RawPerson } from '../index'
import { buildPersonView, buildScopedView } from '../personView'
import { NOW } from './fixtures'

/** May day at noon, as an ISO string. */
const may = (day: number): string => new Date(2025, 4, day, 12).toISOString()

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

  it('gives a person-scoped overview whose weekly copy names the person', () => {
    const view = buildPersonView(result, 'p1')
    expect(view.personName).toBe('Child A')
    // Weekly insight either reflects the person or admits insufficient data,
    // but never says "Household".
    expect(view.overview.weeklyInsight.detail).not.toMatch(/Household/)
  })
})

describe('buildScopedView', () => {
  const result = analyzeHousehold([p1, p2], { now: NOW, windowDays: 30 })

  it('returns the household view when no person is selected', () => {
    const view = buildScopedView(result, null)
    expect(view.personId).toBeNull()
    expect(view.personName).toBeNull()
    expect(view.correlations).toBe(result.correlations)
    expect(view.overview).toBe(result.overview)
  })

  it('scopes to a single person when selected', () => {
    const view = buildScopedView(result, 'p1')
    expect(view.personId).toBe('p1')
    expect(view.personName).toBe('Child A')
    expect(
      view.correlations.every(
        (c) => c.sourcePersonId === 'p1' || c.targetPersonId === 'p1',
      ),
    ).toBe(true)
  })

  it('falls back to the household view for an unknown person', () => {
    const view = buildScopedView(result, 'does-not-exist')
    expect(view.personId).toBeNull()
    expect(view.correlations).toBe(result.correlations)
  })
})
