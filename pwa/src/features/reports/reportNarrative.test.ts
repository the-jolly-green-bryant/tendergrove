import { describe, expect, it } from 'vitest'

import {
  buildNarrativeEnvelope,
  fallbackNarrative,
  narrativeTakeaways,
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
      '1 of 2 recent recorded observations fell below the 40-point baseline (50%, unchanged from baseline)',
    )
    expect(
      envelope.facts.find((fact) => fact.id === 'wellness_comparison')?.replacement,
    ).toContain(
      'Recent wellness averaged 35 points: 5 points below the 40-point baseline',
    )
    expect(
      envelope.facts.find((fact) => fact.id === 'important_stretches')?.replacement,
    ).toContain('Concern range: 2 days')
    expect(
      envelope.facts.find((fact) => fact.id === 'pattern_strain_takeaway')?.replacement,
    ).toContain('largest recent decline was 30 points')
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
