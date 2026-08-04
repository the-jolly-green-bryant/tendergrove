import { describe, expect, it } from 'vitest'

import {
  buildNarrativeEnvelope,
  fallbackNarrative,
  humanReadableTakeaways,
  narrativeTakeaways,
  qualifyRegressionIntensity,
  renderNarrative,
  validateNarrativeTemplate,
} from './reportNarrative'

describe('report narrative facts', () => {
  const report = {
    observations: [
      {
        date: '2026-07-20',
        score: 35,
        level: 'concern' as const,
        concernSignals: 2,
        positiveSignals: 0,
      },
      {
        date: '2026-07-21',
        score: 45,
        level: 'concern' as const,
        concernSignals: 1,
        positiveSignals: 1,
      },
    ],
    completeness: 2,
    baseline: 40,
    recent: 35,
    difficultPeriods: [
      { kind: 'difficult' as const, start: '2026-07-20', end: '2026-07-21', days: 2 },
    ],
    positivePeriods: [],
    eventComparisons: [],
    difficult: [{ name: 'Sleep disruption', count: 2 }],
    positive: [],
    checkIns: [{}, {}],
    recentCheckIns: [{}, {}],
    recentDifficult: [
      {
        name: 'Sleep disruption',
        count: 2,
        recentRate: 100,
        baselineRate: 100,
        delta: 0,
      },
    ],
    recentPositive: [],
    patternDynamics: {
      burden: 80,
      instability: 65,
      persistence: 75,
      recoveryDifficulty: 70,
      largestDecline: 30,
      band: 'sustained',
    },
  } as never

  it('keeps every calculated value in deterministic replacements', () => {
    const envelope = buildNarrativeEnvelope(report)
    expect(
      envelope.facts.find((fact) => fact.id === 'sustainability')?.replacement,
    ).toContain('does not look sustainable')
    expect(
      envelope.facts.find((fact) => fact.id === 'sustainability')?.replacement,
    ).not.toContain('%')
    expect(
      envelope.facts.find((fact) => fact.id === 'recent_regressive_days')?.replacement,
    ).toContain(
      '50% of recent observations fell below the 40-point baseline (unchanged from baseline)',
    )
    expect(
      envelope.facts.find((fact) => fact.id === 'recent_regressive_days')?.replacement,
    ).toContain(
      'recorded regression was moderate: affected observations averaged 35 points, 5 points below baseline',
    )
    expect(
      envelope.facts.find((fact) => fact.id === 'wellness_comparison')?.replacement,
    ).toContain(
      'Recent wellness averaged 35 points, 13% below baseline',
    )
    expect(
      envelope.facts.find((fact) => fact.id === 'important_stretches')?.replacement,
    ).toContain('Concern range: 2 days')
    expect(
      envelope.facts.find((fact) => fact.id === 'pattern_strain_takeaway')?.replacement,
    ).toContain('largest recent decline was 30 points')
  })

  it('distinguishes mild regression from pronounced lower-score regression', () => {
    expect(
      qualifyRegressionIntensity({
        baseline: 65,
        scores: [62, 60, 64, 68],
        largestAdjacentDecline: 8,
        recentAverage: 64,
        strainBand: 'low',
      })?.level,
    ).toBe('mild')
    expect(
      qualifyRegressionIntensity({
        baseline: 40,
        scores: [8, 12, 5, 35],
        largestAdjacentDecline: 30,
        recentAverage: 15,
        strainBand: 'sustained',
      }),
    ).toMatchObject({
      level: 'pronounced',
      averageScore: 15,
      averageDepth: 25,
      deepestDepth: 35,
    })
  })

  it('does not let one large drop overstate an improving emerging pattern', () => {
    expect(
      qualifyRegressionIntensity({
        baseline: 32,
        scores: [0, 28, 30, 55, 62],
        largestAdjacentDecline: 42,
        recentAverage: 40,
        strainBand: 'emerging',
      })?.level,
    ).toBe('mild')
  })

  it('uses relative baseline percentages and treats tiny changes as unchanged', () => {
    const base = report as unknown as Record<string, unknown>
    const envelope = buildNarrativeEnvelope({
      ...base,
      baseline: 47,
      recent: 48,
    } as never)
    expect(
      envelope.facts.find((fact) => fact.id === 'wellness_comparison')?.replacement,
    ).toBe(
      'Recent wellness averaged 48 points, 2% above baseline. This suggests recorded well-being was essentially unchanged overall.',
    )
  })

  it('frames below-baseline days as ordinary variation when strain is low', () => {
    const base = report as unknown as Record<string, unknown> & {
      patternDynamics: Record<string, unknown>
    }
    const envelope = buildNarrativeEnvelope({
      ...base,
      recent: 40,
      patternDynamics: {
        ...base.patternDynamics,
        burden: 20,
        instability: 25,
        persistence: 15,
        recoveryDifficulty: 20,
        largestDecline: 10,
        band: 'low',
      },
    } as never)
    expect(envelope.facts.some((fact) => fact.id === 'recent_regressive_days')).toBe(
      false,
    )
    expect(
      envelope.facts.find((fact) => fact.id === 'normal_variation')?.replacement,
    ).toContain('ordinary variation rather than a sustained regression')
    expect(
      envelope.facts.find((fact) => fact.id === 'sustainability')?.replacement,
    ).toContain('consistent with ordinary ups and downs')
  })

  it('prefers an adverse difficult-signal change over a favorable positive change', () => {
    const base = report as unknown as Record<string, unknown>
    const envelope = buildNarrativeEnvelope({
      ...base,
      recentDifficult: [
        { name: 'Difficult A', count: 8, recentRate: 80, baselineRate: 60, delta: 20 },
        { name: 'Difficult B', count: 7, recentRate: 70, baselineRate: 50, delta: 20 },
        { name: 'Difficult C', count: 3, recentRate: 30, baselineRate: 20, delta: 10 },
      ],
      recentPositive: [
        { name: 'Positive A', count: 5, recentRate: 50, baselineRate: 40, delta: 10 },
      ],
    } as never)
    expect(envelope.facts.some((fact) => fact.id === 'frequent_concern_1')).toBe(true)
    expect(envelope.facts.some((fact) => fact.id === 'frequent_concern_2')).toBe(true)
    expect(envelope.facts.some((fact) => fact.id === 'frequent_concern_3')).toBe(true)
    expect(envelope.facts.some((fact) => fact.id === 'frequent_positive')).toBe(false)
  })

  it('substitutes approved placeholders without changing their values', () => {
    const envelope = buildNarrativeEnvelope(report)
    const rendered = renderNarrative(
      envelope.facts
        .map((fact) => `- {{${fact.id}}} In summary: ${fact.replacement}`)
        .join('\n'),
      envelope,
    )
    expect(rendered).toContain('50%')
    expect(rendered).toContain('40-point baseline')
    expect(rendered).not.toContain('{{')
  })

  it('provides a deterministic explanation when the model is unavailable', () => {
    const fallback = fallbackNarrative(buildNarrativeEnvelope(report))
    expect(fallback).toContain('50%')
    expect(narrativeTakeaways(fallback)).toHaveLength(4)
  })

  it('turns mixed strain evidence into concise, human-readable takeaways', () => {
    const takeaways = humanReadableTakeaways({
      ...(report as unknown as Record<string, unknown>),
      personName: 'Beth',
      recent: 50,
      baseline: 38,
      eventComparisons: [
        {
          label: 'Therapy day',
          dates: ['2026-07-20'],
          eventDays: 5,
          eventAverage: 27,
          otherAverage: 48,
          concernDays: 4,
          difference: -21,
        },
      ],
    } as never)

    expect(takeaways).toHaveLength(4)
    expect(takeaways[0]).toContain('recent month is mixed')
    expect(takeaways.join(' ')).toContain('Sleep disruption')
    expect(takeaways.join(' ')).toContain('100% of recent check-ins')
    expect(takeaways.join(' ')).toContain('Therapy day')
    expect(takeaways.join(' ')).toContain('29% below baseline')
    expect(takeaways.join(' ')).toContain('Difficult periods tended to continue')
    expect(takeaways.join(' ')).not.toMatch(/regression|driven most|sustainable/)
  })

  it('rejects model-authored numbers and unknown placeholders', () => {
    const envelope = buildNarrativeEnvelope(report)
    expect(() =>
      validateNarrativeTemplate(
        '- The score was 35 percent. {{sustainability}}\n- Context: {{recent_regressive_days}}\n- Sustained period: {{concern_stretch_1}}',
        envelope,
      ),
    ).toThrow()
    expect(() =>
      validateNarrativeTemplate(
        '- The recent comparison deserves attention. {{sustainability}}\n- The broader context may help: {{invented_fact}}\n- The sustained period matters: {{concern_stretch_1}}',
        envelope,
      ),
    ).toThrow()
  })
})
