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
    expect(report.text).toContain('Missing or incomplete data is excluded')
    expect(report.text).toContain('1% of the baseline window has recorded data')
    expect(report.text).toContain('3% of the recent window has recorded data')
    expect(report.text).toContain('“Major sleep disruption” was noted in 1 of 1 recent observations')
    expect(report.text).toContain('PATTERN STRAIN')
    expect(report.patternDynamics.dataQuality.observedDays).toBe(1)
    expect(report.text).toContain('Research & Methodology in Grove: /about/research')
    expect(report.text).toContain('Emotion dynamics in children and adolescents')
    expect(report.text).toContain('not a diagnosis, validated risk assessment, or level-of-care recommendation')
    expect(report.calendarDays).toHaveLength(90)
    expect(report.calendarDays.filter((day) => day.level === 'missing')).toHaveLength(89)
  })

  it('exports check-ins and signals as CSV', () => {
    expect(reportCsv(person)).toContain('Major sleep disruption')
    expect(reportCsv(person)).toContain('Medication appointment scheduled')
  })

  it('lets persistent observations speak without recommending care', () => {
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
    expect(report.text).not.toContain('supports continued clinical care')
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

    expect(report.text).toContain('Concern-range stretch: 5 consecutive scored days')
    expect(report.text).toContain('behavioral improvements were recorded in the days before or after')
    expect(report.difficultPeriods[0]?.days).toBe(5)
    expect(report.observations).toHaveLength(30)
  })

  it('compares any sufficiently recorded event without hardcoding passes', () => {
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

    expect(report.text).toContain('“Pass - Day” was recorded on 3 scored days')
    expect(report.text).toContain('averaged 0 wellness points')
    expect(report.text).toContain('and a baseline of')
    expect(report.text).toContain('coincided with a wellness score 100 points lower')
    expect(report.text).not.toContain('continued clinical care')
  })

  it('compares a person with other household members on overlapping recorded days', () => {
    const dates = Array.from({ length: 8 }, (_, index) => {
      const date = new Date()
      date.setHours(12, 0, 0, 0)
      date.setDate(date.getDate() - index)
      return date.toISOString()
    })
    const checkIns = dates.map((occurredAt, index) => ({
      occurredAt,
      answersJson: JSON.stringify({ checked: index % 2 ? ['sleep'] : ['support'] }),
    }))
    const other = {
      ...person,
      id: 'caregiver-1',
      displayName: 'Alex',
      checkIns,
    } as unknown as RawPerson
    const selected = { ...person, checkIns } as unknown as RawPerson

    const report = buildProviderReport({
      person: selected,
      householdPeople: [selected, other],
      reason: '',
      questions: '',
    })

    expect(report.householdCorrelation).toMatchObject({
      coefficient: 1,
      pairedDays: 8,
      strength: 'strong',
      direction: 'positive',
      noteworthy: true,
    })
    expect(report.text).toContain('average wellness of other household members')
  })
})
