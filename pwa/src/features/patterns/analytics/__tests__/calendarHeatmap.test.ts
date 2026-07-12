import { describe, expect, it } from 'vitest'

import { buildCalendar, wellbeingLevel } from '../calendarHeatmap'
import type { DailyHouseholdScore } from '../types'

describe('wellbeingLevel', () => {
  it('maps scores to well-being bands (higher = better)', () => {
    expect(wellbeingLevel(0)).toBe('struggling')
    expect(wellbeingLevel(34)).toBe('struggling')
    expect(wellbeingLevel(35)).toBe('mixed')
    expect(wellbeingLevel(59)).toBe('mixed')
    expect(wellbeingLevel(60)).toBe('good')
    expect(wellbeingLevel(79)).toBe('good')
    expect(wellbeingLevel(80)).toBe('thriving')
    expect(wellbeingLevel(100)).toBe('thriving')
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
    eventCount: over['eventCount'] ?? 0,
  })

  it('carries counts and assigns a level and summary', () => {
    const [cell] = buildCalendar([
      day({ score: 70, checkInCount: 3, incidentCount: 2, positiveCount: 1 }),
    ])
    expect(cell.level).toBe('good')
    expect(cell.incidentCount).toBe(2)
    expect(cell.shortSummary).toMatch(/A good day/)
    expect(cell.shortSummary).toMatch(/2 incidents/)
  })

  it('has no level and a gentle summary when there is no data', () => {
    const [cell] = buildCalendar([day({ score: null })])
    expect(cell.level).toBeNull()
    expect(cell.shortSummary).toBe('No check-ins yet')
  })
})
