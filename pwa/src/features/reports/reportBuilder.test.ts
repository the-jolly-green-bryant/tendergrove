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
    expect(report.text).toContain('Major sleep disruption was noted in 1 of 1 check-ins')
  })

  it('exports check-ins and signals as CSV', () => {
    expect(reportCsv(person)).toContain('Major sleep disruption')
    expect(reportCsv(person)).toContain('Medication appointment scheduled')
  })

  it('supports continued-care discussion when Beth has persistent difficult observations', () => {
    const beth = {
      ...person,
      id: 'beth',
      displayName: 'Beth',
      checkIns: [
        { occurredAt: new Date().toISOString(), answersJson: JSON.stringify({ checked: ['sleep'] }), note: 'Discussed medication with doctor.' },
        { occurredAt: new Date(Date.now() - 86_400_000).toISOString(), answersJson: JSON.stringify({ checked: ['sleep'] }), note: 'Sleep disruption continued.' },
        { occurredAt: new Date(Date.now() - 172_800_000).toISOString(), answersJson: JSON.stringify({ checked: ['sleep', 'support'] }), note: 'Accepted support after a difficult night.' },
      ],
    } as unknown as RawPerson

    const report = buildProviderReport({ person: beth, reason: 'Ongoing changes', questions: '' })

    expect(report.text).toContain('Difficult observations were noted in 3 of 3 check-ins')
    expect(report.text).toContain('supports continued clinical care')
    expect(report.recent).not.toBeGreaterThan(50)
  })

  it('does not let a short sustained difficult period disappear inside many steadier days', () => {
    const indicators = [
      { id: 'difficult', name: 'Severe distress', polarity: 'undesired', active: true },
      { id: 'p1', name: 'Connected', polarity: 'desired', active: true },
      { id: 'p2', name: 'Daily care', polarity: 'desired', active: true },
    ]
    const checkIns = Array.from({ length: 30 }, (_, index) => {
      const date = new Date()
      date.setHours(12, 0, 0, 0)
      date.setDate(date.getDate() - (29 - index))
      return {
        occurredAt: date.toISOString(),
        answersJson: JSON.stringify({ checked: index < 5 ? ['difficult'] : ['p1', 'p2'] }),
      }
    })
    const report = buildProviderReport({ person: { ...person, indicators, checkIns } as unknown as RawPerson, reason: '', questions: '' })

    expect(report.text).toContain('For 5 days in a row')
    expect(report.text).toContain('should not be obscured by better days')
    expect(report.difficultPeriods[0]?.days).toBe(5)
    expect(report.observations).toHaveLength(30)
  })

  it('explains when pass or visit days are harder than usual in plain language', () => {
    const indicators = [
      { id: 'hard', name: 'Severe distress', polarity: 'undesired', active: true },
      { id: 'good', name: 'Accepted support', polarity: 'desired', active: true },
    ]
    const checkIns = Array.from({ length: 8 }, (_, index) => {
      const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() - (7 - index))
      const passDay = index < 3
      return { occurredAt: date.toISOString(), answersJson: JSON.stringify({ checked: passDay ? ['hard'] : ['good'], events: passDay ? ['pass'] : [] }) }
    })
    const report = buildProviderReport({
      person: { ...person, indicators, checkIns } as unknown as RawPerson,
      reason: '', questions: '', lifeEvents: [{ id: 'pass', label: 'Pass - Day' }],
    })

    expect(report.text).toContain('days with a day pass, the average score was 0/100')
    expect(report.text).toContain('harder than usual')
    expect(report.text).toContain('difficult to sustain without continued clinical care')
  })
})
