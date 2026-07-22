import { describe, expect, it } from 'vitest'
import { buildProviderReport, reportCsv } from './reportBuilder'
import type { RawPerson } from '../patterns/analytics'

const person = {
  id: 'child-1', displayName: 'Sam', role: 'child', archived: false,
  indicators: [
    { id: 'sleep', name: 'Major sleep disruption', polarity: 'undesired', active: true },
    { id: 'support', name: 'Accepted support', polarity: 'desired', active: true },
  ],
  checkIns: [
    { occurredAt: new Date().toISOString(), answersJson: JSON.stringify({ checked: ['sleep'] }), note: 'Medication appointment scheduled.' },
  ],
} as unknown as RawPerson

describe('provider report', () => {
  it('states limitations and does not turn missing days into wellness data', () => {
    const report = buildProviderReport({ person, reason: 'Sleep changed', questions: 'What should we watch?' })
    expect(report.text).toContain('not a diagnosis')
    expect(report.text).toContain('Missing days were not treated as good or bad days')
    expect(report.text).toContain('Major sleep disruption: 1 check-ins')
  })

  it('exports check-ins and signals as CSV', () => {
    expect(reportCsv(person)).toContain('Major sleep disruption')
    expect(reportCsv(person)).toContain('Medication appointment scheduled')
  })
})
