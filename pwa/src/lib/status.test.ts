import { describe, expect, it } from 'vitest'

import type { RawIndicator } from '../features/patterns/analytics'
import { computeScore, statusFromScore } from './status'

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

  it('keeps Beth in needs-attention when difficult observations persist', () => {
    const score = computeScore(indicators, {
      occurredAt: new Date().toISOString(),
      answersJson: JSON.stringify({ checked: ['sleep', 'voices'] }),
    })

    expect(score).toBe(0)
    expect(statusFromScore(score).label).toBe('Needs attention')
  })

  it('uses observation language rather than clinical risk classifications', () => {
    expect(statusFromScore(90).label).toBe('No notable change')
    expect(statusFromScore(70).label).toBe('More changes recorded')
    expect(statusFromScore(null).label).toBe('Not enough data')
  })
})
