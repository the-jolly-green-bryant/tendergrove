import { describe, expect, it } from 'vitest'

import {
  INCIDENT_ONLY_BASE,
  INCIDENT_POINTS,
  aggregateHouseholdDay,
  scorePersonDay,
} from '../scoring'
import { checkIn, incident, indicator, iso, person } from './fixtures'

const DAY = '2025-05-10'
const AT = iso(2025, 5, 10)

describe('scorePersonDay — indicator scoring (higher = better)', () => {
  it('is null when there is no check-in and no incident (missing data is not a good day)', () => {
    const p = person('p1', { indicators: [indicator('undesired', 'meltdown')] })
    const result = scorePersonDay(p, DAY)
    expect(result.score).toBeNull()
    expect(result.hasData).toBe(false)
  })

  it('scores lowest well-being when an undesired indicator occurred', () => {
    const meltdown = indicator('undesired', 'meltdown')
    const p = person('p1', {
      indicators: [meltdown],
      checkIns: [checkIn(AT, [meltdown.id])],
    })
    const result = scorePersonDay(p, DAY)
    expect(result.score).toBe(0)
    expect(result.negativeCount).toBe(1)
    expect(result.positiveCount).toBe(0)
  })

  it('scores highest well-being when an undesired indicator stayed away', () => {
    const meltdown = indicator('undesired', 'meltdown')
    const p = person('p1', {
      indicators: [meltdown],
      checkIns: [checkIn(AT, [])],
    })
    expect(scorePersonDay(p, DAY).score).toBe(100)
  })

  it('scores highest well-being when a desired indicator occurred', () => {
    const slept = indicator('desired', 'slept well')
    const p = person('p1', {
      indicators: [slept],
      checkIns: [checkIn(AT, [slept.id])],
    })
    const result = scorePersonDay(p, DAY)
    expect(result.score).toBe(100)
    expect(result.positiveCount).toBe(1)
  })

  it('averages a mixed check-in (one good, one bad → 50)', () => {
    const meltdown = indicator('undesired', 'meltdown')
    const slept = indicator('desired', 'slept well')
    const p = person('p1', {
      indicators: [meltdown, slept],
      checkIns: [checkIn(AT, [meltdown.id, slept.id])],
    })
    expect(scorePersonDay(p, DAY).score).toBe(50)
  })

  it('takes the union of checked indicators across multiple check-ins in a day', () => {
    const a = indicator('undesired', 'a')
    const b = indicator('undesired', 'b')
    const p = person('p1', {
      indicators: [a, b],
      checkIns: [
        checkIn(iso(2025, 5, 10, 9), [a.id]),
        checkIn(iso(2025, 5, 10, 18), [b.id]),
      ],
    })
    const result = scorePersonDay(p, DAY)
    // both undesired occurred → both bad → lowest well-being
    expect(result.score).toBe(0)
    expect(result.checkInCount).toBe(2)
    expect(result.negativeCount).toBe(2)
  })

  it('ignores checks for indicators that are no longer active/known', () => {
    const active = indicator('undesired', 'active')
    const p = person('p1', {
      indicators: [active],
      checkIns: [checkIn(AT, [active.id, 'ghost-indicator'])],
    })
    const result = scorePersonDay(p, DAY)
    expect(result.negativeCount).toBe(1) // ghost not counted
    expect(result.score).toBe(0)
  })
})

describe('scorePersonDay — incidents lower well-being', () => {
  it('anchors an incident-only day to a meaningful (lowered) baseline', () => {
    const p = person('p1', { incidents: [incident(AT)] })
    const result = scorePersonDay(p, DAY)
    // internal distress = base + points; well-being = 100 - that
    expect(result.score).toBe(100 - (INCIDENT_ONLY_BASE + INCIDENT_POINTS)) // 45
    expect(result.incidentCount).toBe(1)
    expect(result.hasData).toBe(true)
  })

  it('pulls a high indicator score down by the incident weight', () => {
    const slept = indicator('desired', 'slept well')
    const p = person('p1', {
      indicators: [slept],
      checkIns: [checkIn(AT, [slept.id])], // well-being 100 before incidents
      incidents: [incident(AT)],
    })
    expect(scorePersonDay(p, DAY).score).toBe(100 - INCIDENT_POINTS) // 80
  })

  it('clamps to 0 when a bad indicator day and incidents both pile on', () => {
    const meltdown = indicator('undesired', 'meltdown')
    const p = person('p1', {
      indicators: [meltdown],
      checkIns: [checkIn(AT, [meltdown.id])], // 0
      incidents: [incident(AT), incident(AT)],
    })
    expect(scorePersonDay(p, DAY).score).toBe(0)
  })
})

describe('aggregateHouseholdDay', () => {
  it('averages person scores and ignores people with no data', () => {
    const meltdown = indicator('undesired', 'm')
    const slept = indicator('desired', 's')
    const p1 = person('p1', {
      indicators: [meltdown],
      checkIns: [checkIn(AT, [meltdown.id])],
    })
    const p2 = person('p2', {
      indicators: [slept],
      checkIns: [checkIn(AT, [slept.id])],
    })
    const p3 = person('p3', { indicators: [slept] }) // no data this day

    const day = aggregateHouseholdDay(DAY, [
      scorePersonDay(p1, DAY), // 0
      scorePersonDay(p2, DAY), // 100
      scorePersonDay(p3, DAY), // null
    ])

    expect(day.score).toBe(50) // (0 + 100) / 2
    expect(day.contributingPeople).toBe(2)
  })

  it('is null when nobody had data', () => {
    const p = person('p1', { indicators: [indicator('undesired', 'm')] })
    const day = aggregateHouseholdDay(DAY, [scorePersonDay(p, DAY)])
    expect(day.score).toBeNull()
    expect(day.contributingPeople).toBe(0)
  })
})
