import { describe, expect, it } from 'vitest'

import {
  analyzeHousehold,
  normalizeHousehold,
  parseCheckedIds,
  runAnalytics,
  type RawPerson,
} from '../index'
import { NOW } from './fixtures'

describe('parseCheckedIds', () => {
  it('reads a parsed object', () => {
    expect(parseCheckedIds({ checked: ['a', 'b'] })).toEqual(['a', 'b'])
  })
  it('reads a JSON string (AWSJSON round-trip)', () => {
    expect(parseCheckedIds('{"checked":["a"]}')).toEqual(['a'])
  })
  it('is safe on garbage / missing data', () => {
    expect(parseCheckedIds('not json')).toEqual([])
    expect(parseCheckedIds(null)).toEqual([])
    expect(parseCheckedIds({ checked: [1, 'a', null] })).toEqual(['a'])
  })
})

describe('normalizeHousehold', () => {
  const raw: RawPerson[] = [
    {
      id: 'p1',
      displayName: 'Child A',
      role: 'child',
      archived: false,
      indicators: [
        { id: 'i1', name: 'poor sleep', polarity: 'undesired', active: true },
        { id: 'i2', name: 'mystery', polarity: 'weird-value', active: true }, // invalid polarity
        null,
      ],
      checkIns: [{ occurredAt: NOW.toISOString(), answersJson: '{"checked":["i1"]}' }],
      events: [
        { occurredAt: NOW.toISOString(), type: 'incident', title: 'meltdown' },
        {
          occurredAt: NOW.toISOString(),
          type: 'note',
          title: 'note (not an incident)',
        },
      ],
    },
    { id: 'p2', displayName: 'Archived', archived: true },
  ]

  it('drops archived people by default', () => {
    const input = normalizeHousehold(raw, { now: NOW })
    expect(input.people.map((p) => p.id)).toEqual(['p1'])
  })

  it('normalizes invalid polarity to null and keeps valid ones', () => {
    const [p1] = normalizeHousehold(raw, { now: NOW }).people
    expect(p1.indicators.find((i) => i.id === 'i1')!.polarity).toBe('undesired')
    expect(p1.indicators.find((i) => i.id === 'i2')!.polarity).toBeNull()
  })

  it('extracts only incident events as incidents', () => {
    const [p1] = normalizeHousehold(raw, { now: NOW }).people
    expect(p1.incidents).toHaveLength(1)
    expect(p1.incidents[0].title).toBe('meltdown')
  })

  it('parses checked indicator ids from check-ins', () => {
    const [p1] = normalizeHousehold(raw, { now: NOW }).people
    expect(p1.checkIns[0].checkedIndicatorIds).toEqual(['i1'])
  })
})

describe('runAnalytics / analyzeHousehold', () => {
  it('produces a coherent result over the window', () => {
    const raw: RawPerson[] = [
      {
        id: 'p1',
        displayName: 'Child A',
        role: 'child',
        indicators: [
          { id: 'i1', name: 'meltdown', polarity: 'undesired', active: true },
        ],
        checkIns: [
          {
            occurredAt: new Date(2025, 4, 30, 12).toISOString(),
            answersJson: { checked: ['i1'] },
          },
          {
            occurredAt: new Date(2025, 4, 29, 12).toISOString(),
            answersJson: { checked: [] },
          },
        ],
        events: [],
      },
    ]

    const result = analyzeHousehold(raw, { now: NOW, windowDays: 30 })

    expect(result.window.days).toBe(30)
    expect(result.householdDailyScores).toHaveLength(30)
    expect(result.calendar).toHaveLength(30)
    expect(result.people).toEqual([{ id: 'p1', displayName: 'Child A', role: 'child' }])
    expect(result.personDailyScores.p1).toHaveLength(30)

    // May 30 had a meltdown → lowest well-being (0) on the last day of the window.
    const lastDay = result.householdDailyScores.find((d) => d.date === '2025-05-30')
    expect(lastDay!.score).toBe(0)
    expect(result.overview.weeklyInsight.detail).toBeTruthy()
  })

  it('reports low-confidence, gentle copy when there is too little data', () => {
    const result = runAnalytics({ people: [], now: NOW, windowDays: 30 })
    expect(result.dataQuality.hasEnoughData).toBe(false)
    expect(result.dataQuality.message).toMatch(/still gathering/i)
    expect(result.correlations).toHaveLength(0)
    expect(result.relationships).toHaveLength(0)
  })
})
