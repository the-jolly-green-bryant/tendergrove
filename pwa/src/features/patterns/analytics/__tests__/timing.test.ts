import { describe, expect, it } from 'vitest'

import { buildGeneratedInsights } from '../generatedInsights'
import { analyzeHousehold, type RawPerson } from '../index'
import { buildDayOfWeek, buildTimeOfDay } from '../timing'
import type { TimingAnalysis, TrendResult } from '../types'
import { checkIn, indicator, iso, NOW } from './fixtures'

/** Scores keyed to specific weekdays. May 2, 9, 16, 23 2025 are Fridays. */
const scored = (entries: Array<[string, number | null]>) =>
  entries.map(([date, score]) => ({ date, score }))

describe('buildDayOfWeek', () => {
  it('computes per-weekday challenging/positive rates from scores', () => {
    const dow = buildDayOfWeek(
      scored([
        ['2025-05-02', 20], // Fri — challenging
        ['2025-05-09', 30], // Fri — challenging
        ['2025-05-16', 80], // Fri — positive
        ['2025-05-05', 90], // Mon — positive
      ]),
    )
    const friday = dow[5]
    expect(friday.label).toBe('Fri')
    expect(friday.sampleSize).toBe(3)
    expect(friday.challengingRate).toBeCloseTo((2 / 3) * 100)
    expect(friday.positiveRate).toBeCloseTo((1 / 3) * 100)
    expect(dow[1].positiveRate).toBe(100) // Monday
    expect(dow[2].sampleSize).toBe(0) // Tuesday — no data
    expect(dow[2].challengingRate).toBeNull()
  })
})

describe('buildTimeOfDay', () => {
  it('distributes incidents across the hours', () => {
    const { buckets, total } = buildTimeOfDay([
      { occurredAt: iso(2025, 5, 10, 18) },
      { occurredAt: iso(2025, 5, 11, 18) },
      { occurredAt: iso(2025, 5, 12, 18) },
      { occurredAt: iso(2025, 5, 13, 9) },
      { occurredAt: iso(2025, 5, 14, 9) },
    ])
    expect(total).toBe(5)
    expect(buckets[18].count).toBe(3)
    expect(buckets[18].percentage).toBeCloseTo(60)
    expect(buckets[9].count).toBe(2)
  })
})

describe('buildGeneratedInsights', () => {
  const timing: TimingAnalysis = {
    dayOfWeek: buildDayOfWeek(
      scored([
        ['2025-05-02', 20],
        ['2025-05-09', 20],
        ['2025-05-16', 20],
        ['2025-05-23', 20], // 4 hard Fridays
      ]),
    ),
    timeOfDay: buildTimeOfDay([]).buckets,
    totalIncidents: 0,
    heatmap: [],
    indicatorCorrelations: [
      {
        indicatorId: 'cope',
        label: 'Used coping skills',
        personName: 'You',
        polarity: 'desired',
        correlation: 0.62,
        confidence: 'high',
        sampleSize: 12,
        summary: '…',
      },
    ],
  }
  const trend: TrendResult = {
    current7DayAverage: 60,
    previous7DayAverage: 50,
    delta: 10,
    direction: 'improving',
    points: [],
    confidence: 'high',
  }

  it('returns insights ordered by priority, including a hardest-weekday call-out', () => {
    const insights = buildGeneratedInsights({ timing, trend })
    expect(insights.length).toBeGreaterThan(0)
    // Sorted ascending by priority.
    for (let i = 1; i < insights.length; i++) {
      expect(insights[i].priority).toBeGreaterThanOrEqual(insights[i - 1].priority)
    }
    expect(insights.some((i) => i.icon === 'calendar')).toBe(true)
    expect(insights.some((i) => i.icon === 'leaf')).toBe(true)
  })
})

describe('analyzeHousehold — timing integration', () => {
  it('attaches household + per-person timing and a positive indicator correlation', () => {
    const cope = indicator('desired', 'coping', { id: 'cope' })
    const copeDays = [2, 4, 6, 8].map((d) => checkIn(iso(2025, 5, d), [cope.id]))
    const flatDays = [10, 12, 14, 16].map((d) => checkIn(iso(2025, 5, d), []))
    const raw: RawPerson[] = [
      {
        id: 'p1',
        displayName: 'You',
        role: 'self',
        avatarUrl: null,
        archived: false,
        indicators: [{ id: 'cope', name: 'coping', polarity: 'desired', active: true }],
        checkIns: [...copeDays, ...flatDays].map((c) => ({
          occurredAt: c.occurredAt,
          answersJson: { checked: c.checkedIndicatorIds },
          id: 'blah',
        })),
        events: [],
      },
    ]

    const result = analyzeHousehold(raw, { now: NOW, windowDays: 30 })
    expect(result.timing.dayOfWeek).toHaveLength(7)
    expect(result.personTiming.p1).toBeDefined()

    const cope1 = result.personTiming.p1.indicatorCorrelations.find(
      (c) => c.indicatorId === 'cope',
    )
    expect(cope1).toBeDefined()
    expect(cope1!.correlation).toBeGreaterThan(0.5)
    expect(Array.isArray(result.generatedInsights)).toBe(true)
    expect(result.personGeneratedInsights.p1).toBeDefined()
  })
})
