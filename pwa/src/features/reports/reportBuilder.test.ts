import { describe, expect, it } from 'vitest'
import {
  buildProviderReport,
  isHouseholdConcernOverlapNoteworthy,
  isHouseholdCorrelationNoteworthy,
  preferredComparisonFromReferences,
  preferredContextualComparison,
  preferredWellnessComparison,
  reportCsv,
} from './reportBuilder'
import type { RawPerson } from '../patterns/analytics'
import { buildPersonGroveScoreTrend } from '../../lib/groveScore'

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
  it('prefers an adverse recent comparison over a favorable baseline comparison', () => {
    expect(preferredWellnessComparison(60, 50, 75)?.phrase).toBe(
      '20% below baseline',
    )
    expect(preferredWellnessComparison(60, 50, 55)?.phrase).toBe(
      '20% above baseline',
    )
    expect(preferredWellnessComparison(60, 60, 60)).toBeNull()
  })

  it('uses the metric context to choose the most adverse reference period', () => {
    expect(preferredContextualComparison(80, 70, 60, 'higher')?.phrase).toBe(
      '33% above baseline',
    )
    expect(preferredContextualComparison(40, 60, 50, 'lower')?.phrase).toBe(
      '33% below baseline',
    )
  })

  it('excludes zero references because percentage change from zero is undefined', () => {
    expect(
      preferredComparisonFromReferences(
        76,
        [
          { label: 'historical baseline', value: 0 },
          { label: 'baseline', value: 50 },
        ],
        'higher',
      )?.phrase,
    ).toBe('52% above baseline')
    expect(
      preferredComparisonFromReferences(
        76,
        [{ label: 'historical baseline', value: 0 }],
        'higher',
      ),
    ).toBeNull()
  })

  it('limits the historical baseline to the rolling 365-day window', () => {
    const oldDate = new Date()
    oldDate.setDate(oldDate.getDate() - 400)
    const report = buildProviderReport({
      person: {
        ...person,
        checkIns: [
          {
            occurredAt: oldDate.toISOString(),
            answersJson: JSON.stringify({ checked: ['support'] }),
          },
          {
            occurredAt: new Date().toISOString(),
            answersJson: JSON.stringify({ checked: ['sleep'] }),
          },
        ],
      } as unknown as RawPerson,
      reason: '',
      questions: '',
    })

    expect(report.allTimeObservations).toHaveLength(1)
  })

  it('states limitations and does not turn missing days into wellness data', () => {
    const report = buildProviderReport({ person, reason: 'Sleep changed', questions: 'What should we watch?' })
    expect(report.text).toContain('not a diagnosis')
    expect(report.text).toContain('Missing or incomplete data is excluded')
    expect(report.text).toContain('1% of the baseline window has recorded data')
    expect(report.text).toContain('3% of the recent window has recorded data')
    expect(report.text).toContain('No difficult signals changed meaningfully from baseline')
    expect(report.text).toContain('PATTERN STRAIN')
    expect(report.text).toContain('GROVE SCORE V1')
    expect(report.groveScore?.score).toBeTypeOf('number')
    expect(report.patternDynamics.dataQuality.observedDays).toBe(1)
    expect(report.text).toContain('Research & Methodology in Grove: /about/research')
    expect(report.text).toContain('Emotion dynamics in children and adolescents')
    expect(report.text).toContain('not a diagnosis, validated risk assessment, or level-of-care recommendation')
    expect(report.calendarDays).toHaveLength(90)
    expect(report.calendarDays.filter((day) => day.level === 'missing')).toHaveLength(89)
    expect(report.groveScoreDistribution).toMatchObject({ days: 1 })
    expect(report.groveScoreDistribution?.minimum).toBe(
      report.groveScoreDistribution?.maximum,
    )
    expect(report.groveScoreDistribution?.baseline).toBeNull()
  })

  it('uses the same canonical Grove Score trend as the person page', () => {
    const report = buildProviderReport({ person, reason: '', questions: '' })
    const canonicalLatest = buildPersonGroveScoreTrend(person).at(-1)

    expect(report.calendarDays.at(-1)?.weightedScore).toBe(
      canonicalLatest?.rollingAverage,
    )
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
    expect(report.text).toContain(
      'Wellness averaged 0 points on those days, 100% below baseline',
    )
    expect(report.text).not.toContain('other scored days')
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

  it('does not infer a household relationship from concurrent concern days alone', () => {
    expect(isHouseholdCorrelationNoteworthy(30, 0.33)).toBe(false)
    expect(isHouseholdCorrelationNoteworthy(21, 0.47)).toBe(true)
    expect(isHouseholdCorrelationNoteworthy(21, 0.66)).toBe(true)
    expect(isHouseholdCorrelationNoteworthy(6, 0.9)).toBe(false)
    expect(isHouseholdConcernOverlapNoteworthy(1)).toBe(false)
    expect(isHouseholdConcernOverlapNoteworthy(2)).toBe(false)
    expect(isHouseholdConcernOverlapNoteworthy(3)).toBe(true)
  })

  it('does not label little-or-no household correlation as concerning context', () => {
    const dates = Array.from({ length: 8 }, (_, index) => {
      const date = new Date()
      date.setHours(12, 0, 0, 0)
      date.setDate(date.getDate() - index)
      return date.toISOString()
    })
    const selected = {
      ...person,
      checkIns: dates.map((occurredAt, index) => ({
        occurredAt,
        answersJson: JSON.stringify({
          checked: index % 2 ? ['sleep'] : ['support'],
        }),
      })),
    } as unknown as RawPerson
    const other = {
      ...person,
      id: 'caregiver-2',
      displayName: 'Taylor',
      checkIns: dates.map((occurredAt, index) => ({
        occurredAt,
        answersJson: JSON.stringify({
          checked: Math.floor(index / 2) % 2 ? ['sleep'] : ['support'],
        }),
      })),
    } as unknown as RawPerson

    const report = buildProviderReport({
      person: selected,
      householdPeople: [selected, other],
      reason: '',
      questions: '',
    })

    expect(report.householdCorrelation?.strength).toBe('little or no')
    expect(report.householdCorrelationNarrative).toContain(
      'do not show a consistent household wellness relationship',
    )
    expect(report.householdCorrelationNarrative).not.toContain(
      'concerning household context',
    )
  })
})
