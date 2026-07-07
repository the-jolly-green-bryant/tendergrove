import { describe, expect, it } from 'vitest'

import { buildCalendar, distressLevel } from '../calendarHeatmap'
import type { DailyHouseholdScore } from '../types'

describe('distressLevel', () => {
  it('maps scores to the mockup bands', () => {
    expect(distressLevel(0)).toBe('low')
    expect(distressLevel(25)).toBe('low')
    expect(distressLevel(26)).toBe('moderate')
    expect(distressLevel(60)).toBe('moderate')
    expect(distressLevel(61)).toBe('high')
    expect(distressLevel(80)).toBe('high')
    expect(distressLevel(81)).toBe('veryHigh')
    expect(distressLevel(100)).toBe('veryHigh')
  })
})

describe('buildCalendar', () => {
  const day = (over: Partial<DailyHouseholdScore>): DailyHouseholdScore => ({
    date: '2025-05-10',
    score: null,
    contributingPeople: 0,
    checkInCount: 0,
    incidentCount: 0,
    positiveCount: 0,
    negativeCount: 0,
    ...over,
  })

  it('carries counts and assigns a level and summary', () => {
    const [cell] = buildCalendar([
      day({ score: 70, checkInCount: 3, incidentCount: 2, positiveCount: 1 }),
    ])
    expect(cell.level).toBe('high')
    expect(cell.incidentCount).toBe(2)
    expect(cell.shortSummary).toMatch(/Harder day/)
    expect(cell.shortSummary).toMatch(/2 incidents/)
  })

  it('has no level and a gentle summary when there is no data', () => {
    const [cell] = buildCalendar([day({ score: null })])
    expect(cell.level).toBeNull()
    expect(cell.shortSummary).toBe('No check-ins yet')
  })
})
