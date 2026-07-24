import { describe, expect, it } from 'vitest'

import type { RawIndicator } from '../features/patterns/analytics'
import { computeScore, derivePersonStatus, statusFromScore } from './status'

const indicators = [
  { id: 'sleep', name: 'Severe sleep disruption', polarity: 'undesired', active: true },
  { id: 'voices', name: 'Responding to things others do not perceive', polarity: 'undesired', active: true },
  { id: 'support', name: 'Accepted support', polarity: 'desired', active: true },
] as RawIndicator[]

describe('shared observation status', () => {
  it('does not treat unchecked difficult signals as positive observations', () => {
    const score = computeScore(indicators, {
      occurredAt: new Date().toISOString(),
      answersJson: JSON.stringify({ checked: ['support'] }),
    })

    expect(score).toBe(100)
  })

  it('keeps Beth in concern when difficult observations persist', () => {
    const score = computeScore(indicators, {
      occurredAt: new Date().toISOString(),
      answersJson: JSON.stringify({ checked: ['sleep', 'voices'] }),
    })

    expect(score).toBe(0)
    expect(statusFromScore(score).label).toBe('Concern')
  })

  it('uses observation language rather than clinical risk classifications', () => {
    expect(statusFromScore(90).label).toBe('Steady')
    expect(statusFromScore(70).label).toBe('Watch')
    expect(statusFromScore(null).label).toBe('No data')
  })

  it('uses Pattern Strain labels for a sufficiently observed current pattern', () => {
    const now = new Date(2026, 3, 30, 12)
    const checkIns = Array.from({ length: 24 }, (_, index) => {
      const occurredAt = new Date(now)
      occurredAt.setDate(occurredAt.getDate() - index * 3)
      return {
        occurredAt: occurredAt.toISOString(),
        answersJson: JSON.stringify({ checked: index < 9 ? ['sleep', 'voices'] : ['support'] }),
      }
    })
    expect(derivePersonStatus(indicators, checkIns, now).label).toMatch(/strain$/)
  })

  it('uses a forming state instead of a score-derived strain label when data is sparse', () => {
    expect(derivePersonStatus(indicators, [{
      occurredAt: new Date().toISOString(),
      answersJson: JSON.stringify({ checked: ['sleep'] }),
    }]).label).toBe('Pattern forming')
  })
})
