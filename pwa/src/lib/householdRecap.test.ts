import { describe, expect, it } from 'vitest'

import type { RawPerson } from '../features/patterns/analytics'
import { createHouseholdRecap } from './householdRecap'

const indicators = Array.from({ length: 10 }, (_, index) => ({
  id: `indicator-${index}`,
  name: `Indicator ${index}`,
  polarity: 'desired',
  active: true,
}))

const checkIn = (date: string, wellness: number) => ({
  id: `${date}-${wellness}`,
  occurredAt: `${date}T12:00:00.000Z`,
  answersJson: {
    checked: indicators.slice(0, wellness / 10).map(({ id }) => id),
  },
})

const person = (
  id: string,
  displayName: string,
  scores: Array<[date: string, wellness: number]>,
): RawPerson => ({
  id,
  displayName,
  role: 'child',
  avatarUrl: null,
  archived: false,
  indicators,
  checkIns: scores.map(([date, score]) => checkIn(date, score)),
})

const selectedDate = new Date('2026-06-15T12:00:00.000Z')

describe('household attention priority', () => {
  it('surfaces a catastrophic personal drop ahead of a persistently low score', () => {
    const beth = person('beth', 'Beth', [
      ['2026-06-01', 40],
      ['2026-06-02', 40],
      ['2026-06-03', 40],
      ['2026-06-15', 40],
    ])
    const steph = person('steph', 'Steph', [
      ['2026-06-01', 80],
      ['2026-06-02', 80],
      ['2026-06-03', 80],
      ['2026-06-15', 20],
    ])

    const recap = createHouseholdRecap([beth, steph], selectedDate)

    expect(recap?.featuredPerson?.displayName).toBe('Steph')
    expect(recap?.featuredPerson?.attentionReason).toContain('dropped 60 points')
    expect(recap?.needsCare.map(({ displayName }) => displayName)).toEqual([
      'Steph',
      'Beth',
    ])
  })

  it('keeps persistent low wellness ahead of a modest decline', () => {
    const beth = person('beth', 'Beth', [
      ['2026-06-01', 40],
      ['2026-06-02', 40],
      ['2026-06-03', 40],
      ['2026-06-15', 40],
    ])
    const steph = person('steph', 'Steph', [
      ['2026-06-01', 90],
      ['2026-06-02', 90],
      ['2026-06-03', 90],
      ['2026-06-15', 70],
    ])

    const recap = createHouseholdRecap([beth, steph], selectedDate)

    expect(recap?.featuredPerson?.displayName).toBe('Beth')
    expect(recap?.featuredPerson?.attentionReason).toContain(
      'consistently remained in the needs-care range',
    )
  })

  it('keeps a recent catastrophic day in view after the latest score improves', () => {
    const beth = person('beth', 'Beth', [
      ['2026-06-01', 50],
      ['2026-06-02', 50],
      ['2026-06-03', 50],
      ['2026-06-15', 50],
    ])
    const steph = person('steph', 'Steph', [
      ['2026-06-01', 90],
      ['2026-06-02', 90],
      ['2026-06-03', 90],
      ['2026-06-13', 20],
      ['2026-06-15', 90],
    ])

    const recap = createHouseholdRecap([beth, steph], selectedDate)

    expect(recap?.featuredPerson?.displayName).toBe('Steph')
    expect(recap?.featuredPerson?.attentionReason).toContain(
      'recent wellness has been well below',
    )
    expect(recap?.doingWell.map(({ displayName }) => displayName)).not.toContain('Steph')
  })

  it('falls back to current need when there is not enough baseline history', () => {
    const beth = person('beth', 'Beth', [['2026-06-15', 50]])
    const steph = person('steph', 'Steph', [['2026-06-15', 30]])

    const recap = createHouseholdRecap([beth, steph], selectedDate)

    expect(recap?.featuredPerson?.displayName).toBe('Steph')
  })
})
