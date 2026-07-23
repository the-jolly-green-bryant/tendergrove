import { describe, expect, it } from 'vitest'

import {
  buildNarrativeEnvelope,
  fallbackNarrative,
  renderNarrative,
  validateNarrativeTemplate,
} from './reportNarrative'

describe('report narrative facts', () => {
  const report = {
    observations: [
      { date: '2026-07-20', score: 35, level: 'concern' as const, concernSignals: 2, positiveSignals: 0 },
      { date: '2026-07-21', score: 45, level: 'concern' as const, concernSignals: 1, positiveSignals: 1 },
    ],
    completeness: 2,
    baseline: 40,
    recent: 35,
    difficultPeriods: [{ kind: 'difficult' as const, start: '2026-07-20', end: '2026-07-21', days: 2 }],
    positivePeriods: [],
    eventComparisons: [],
    difficult: [{ name: 'Sleep disruption', count: 2 }],
    positive: [],
    checkIns: [{}, {}],
  } as never

  it('keeps every calculated value in deterministic replacements', () => {
    const envelope = buildNarrativeEnvelope(report)
    expect(envelope.facts.find((fact) => fact.id === 'wellness_comparison')?.replacement)
      .toContain('35% wellness, compared with the 90-day average of 40% (5 percentage points lower)')
    expect(envelope.facts.find((fact) => fact.id === 'concern_stretch_1')?.replacement)
      .toContain('2 consecutive scored days')
  })

  it('substitutes approved placeholders without changing their values', () => {
    const envelope = buildNarrativeEnvelope(report)
    const rendered = renderNarrative('The recent comparison matters: {{wellness_comparison}} Taken with the recorded distribution, {{concern_comparison}} This context may be useful when discussing what changed.', envelope)
    expect(rendered).toContain('35%')
    expect(rendered).toContain('40%')
    expect(rendered).not.toContain('{{')
  })

  it('provides a deterministic explanation when the model is unavailable', () => {
    const fallback = fallbackNarrative(buildNarrativeEnvelope(report))
    expect(fallback).toContain('35%')
    expect(fallback).toContain('Associations may have other explanations')
  })

  it('rejects model-authored numbers and unknown placeholders', () => {
    const envelope = buildNarrativeEnvelope(report)
    expect(() => validateNarrativeTemplate(
      'The score was 35 percent. {{wellness_comparison}} This context may be useful alongside {{concern_comparison}} when discussing the recorded changes.',
      envelope,
    )).toThrow()
    expect(() => validateNarrativeTemplate(
      'The recent comparison deserves attention. {{wellness_comparison}} The broader context can help frame a discussion, but {{invented_fact}} may have other explanations.',
      envelope,
    )).toThrow()
  })
})
