import type { buildProviderReport } from './reportBuilder'

export const REPORT_NARRATIVE_SCHEMA_VERSION = 8

export interface NarrativeFact {
  id: string
  meaning: string
  replacement: string
}

export interface NarrativeEnvelope {
  schemaVersion: typeof REPORT_NARRATIVE_SCHEMA_VERSION
  facts: NarrativeFact[]
}

type ProviderReport = ReturnType<typeof buildProviderReport>

const percentage = (count: number, total: number) => total ? Math.round((count / total) * 100) : 0
const baselineDelta = (delta: number) => delta === 0
  ? '0 points unchanged from baseline'
  : `${Math.abs(delta)} points ${delta > 0 ? 'up' : 'down'} from baseline`
const formatDay = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
const nextDay = (key: string) => {
  const date = new Date(`${key}T12:00:00`)
  date.setDate(date.getDate() + 1)
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

const longestConsecutiveStretch = (dates: string[]) => {
  const sorted = [...new Set(dates)].sort()
  let longest = 0
  let current = 0
  let previous = ''
  sorted.forEach((date) => {
    current = previous && date === nextDay(previous) ? current + 1 : 1
    longest = Math.max(longest, current)
    previous = date
  })
  return longest
}

export const buildNarrativeEnvelope = (report: ProviderReport): NarrativeEnvelope => {
  const observations = report.observations
  const recentCutoff = new Date()
  recentCutoff.setDate(recentCutoff.getDate() - 29)
  recentCutoff.setHours(0, 0, 0, 0)
  const recentKey = [
    recentCutoff.getFullYear(),
    String(recentCutoff.getMonth() + 1).padStart(2, '0'),
    String(recentCutoff.getDate()).padStart(2, '0'),
  ].join('-')
  const recent = observations.filter((day) => day.date >= recentKey)
  const recentConcernDays = recent.filter((day) => day.level === 'concern').length
  const recentConcernRate = percentage(recentConcernDays, recent.length)
  const baseline = report.baseline
  const recentRegressiveDays = baseline === null ? [] : recent.filter((day) => day.score < baseline)
  const recentRegressiveRate = percentage(recentRegressiveDays.length, recent.length)
  const baselineRegressiveRate = baseline === null ? 0 : percentage(observations.filter((day) => day.score < baseline).length, observations.length)
  const regressiveRateDelta = recentRegressiveRate - baselineRegressiveRate
  const baselineConcernRate = percentage(observations.filter((day) => day.level === 'concern').length, observations.length)
  const concernRateDelta = recentConcernRate - baselineConcernRate
  const recentRegressiveStretch = longestConsecutiveStretch(recentRegressiveDays.map((day) => day.date))
  const recentConcernStretch = longestConsecutiveStretch(recent.filter((day) => day.level === 'concern').map((day) => day.date))
  const recentTrendImproved = report.baseline !== null && report.recent !== null && report.recent > report.baseline
  const primaryRate = recentTrendImproved ? recentConcernRate : recentRegressiveRate
  const primaryStretch = recentTrendImproved ? recentConcernStretch : recentRegressiveStretch
  const difficultToSustain = primaryRate >= 50 || primaryStretch >= 3
  const facts: NarrativeFact[] = recent.length ? [
    {
      id: 'sustainability',
      meaning: difficultToSustain
        ? 'HIGHEST PRIORITY: the recent recorded pattern does not look sustainable.'
        : recentTrendImproved
          ? 'HIGHEST PRIORITY: the recent average improved, while raw recent concern days still deserve attention.'
          : 'HIGHEST PRIORITY: the recent recorded pattern looks more sustainable.',
      replacement: difficultToSustain
        ? 'The recent pattern does not look sustainable based on repeated decreases and sustained concern observations.'
        : recentTrendImproved
          ? 'The recent average improved, but the remaining concern observations still matter.'
          : 'The recent pattern looks more sustainable, though individual concern observations still warrant review.',
    },
  ] : []

  facts.push(
    {
      id: 'coverage',
      meaning: 'How much recorded evidence is available in the longer comparison window.',
      replacement: `${observations.length} scored days were available across the selected window, representing ${report.completeness}% recorded-data coverage.`,
    },
  )

  if (report.baseline !== null && recentRegressiveDays.length) {
    facts.push({
      id: 'recent_regressive_days',
      meaning: 'HIGH PRIORITY: explain what the recent regressive-day concentration suggests.',
      replacement: `${recentRegressiveDays.length} of ${recent.length} recent recorded observations fell below the ${report.baseline}% baseline (${recentRegressiveRate}%, ${baselineDelta(regressiveRateDelta)})${recentRegressiveStretch >= 2 ? `; longest stretch: ${recentRegressiveStretch} days` : ''}. This suggests the decrease was repeated, not isolated.`,
    })
  }

  if (report.baseline !== null && report.recent !== null) {
    const delta = report.recent - report.baseline
    facts.push({
      id: 'wellness_comparison',
      meaning: delta === 0
        ? 'Recent weighted wellness is unchanged from the longer-window average.'
        : `Recent weighted wellness is ${delta > 0 ? 'higher' : 'lower'} than the longer-window average.`,
      replacement: `Recent wellness averaged ${report.recent}%: ${delta === 0 ? 'matching' : `${Math.abs(delta)} points ${delta > 0 ? 'above' : 'below'}`} the ${report.baseline}% baseline. This suggests recorded well-being was ${delta === 0 ? 'stable' : delta > 0 ? 'improving' : 'declining'} overall.`,
    })
  }

  if (recent.length) {
    const ordered = [...recent].sort((a, b) => a.date.localeCompare(b.date))
    const changes = ordered.slice(1).map((day, index) => Math.abs(day.score - ordered[index].score))
    const largestChange = changes.length ? Math.max(...changes) : 0
    const steepChanges = changes.filter((change) => change >= 15).length
    const minimum = Math.min(...ordered.map((day) => day.score))
    const maximum = Math.max(...ordered.map((day) => day.score))
    facts.push({
      id: 'trend_description',
      meaning: 'Provider-facing description of the recent 30-day direction and volatility.',
      replacement: report.baseline === null || report.recent === null
        ? `${recent.length} recent recorded observations ranged from ${minimum}% to ${maximum}%.`
        : `Recent wellness averaged ${report.recent}% versus the ${report.baseline}% baseline. Scores ranged from ${minimum}% to ${maximum}%${largestChange ? `; the largest day-to-day change was ${largestChange} points${steepChanges ? `, with ${steepChanges} changes of 15 points or more` : ''}` : ''}. This suggests ${steepChanges ? 'meaningful volatility rather than a smooth trend' : 'a comparatively steady pattern'}.`,
    })
    const recentDifficult = report.difficultPeriods.filter((period) => period.start >= recentKey && period.days >= 2)
    const recentPositive = report.positivePeriods.filter((period) => period.start >= recentKey && period.days >= 2)
    facts.push({
      id: 'calendar_context',
      meaning: 'Brief context immediately above the recent observation calendar.',
      replacement: `${recent.length} recent recorded observations were available. ${report.recent === null || report.baseline === null ? 'A baseline comparison is not yet available.' : `Recent wellness was ${report.recent}% versus the ${report.baseline}% baseline.`}${recentDifficult[0] ? ` Longest recent concern-range stretch: ${recentDifficult[0].days} days.` : ''}${recentPositive[0] ? ` Longest recent steady-range stretch: ${recentPositive[0].days} days.` : ''}`,
    })
    if (recentDifficult.length || recentPositive.length) {
      facts.push({
        id: 'important_stretches',
        meaning: 'Important recent stretches for a provider to notice.',
        replacement: [
          ...recentDifficult.slice(0, 2).map((period) => `Concern range: ${period.days} days, ${formatDay(period.start)}–${formatDay(period.end)}.`),
          ...recentPositive.slice(0, 1).map((period) => `Steady range: ${period.days} days, ${formatDay(period.start)}–${formatDay(period.end)}.`),
        ].join(' '),
      })
    }
  }

  if (recent.length) {
    facts.push({
      id: 'recent_concern_days',
      meaning: recentTrendImproved
        ? 'HIGH PRIORITY: raw recent concern days remain noteworthy even though the recent average improved.'
        : 'Raw concern-range days in the recent window.',
      replacement: `${recentConcernDays} of ${recent.length} recent recorded observations were in the concern range (${recentConcernRate}%, ${baselineDelta(concernRateDelta)}).`,
    })
  }

  report.difficultPeriods.filter((period) => period.days >= 2 && period.start >= recentKey).slice(0, 2).forEach((period, index) => {
    facts.push({
      id: `concern_stretch_${index + 1}`,
      meaning: 'A sustained consecutive stretch of concern-range observations that should not be obscured by averages.',
      replacement: `A recent concern-range stretch lasted ${period.days} consecutive scored days, from ${formatDay(period.start)} through ${formatDay(period.end)}.`,
    })
  })
  report.positivePeriods.filter((period) => period.days >= 2).slice(0, 1).forEach((period) => {
    facts.push({
      id: 'steady_stretch',
      meaning: 'A sustained consecutive stretch of steady-range observations.',
      replacement: `A steady-range stretch lasted ${period.days} consecutive scored days, from ${formatDay(period.start)} through ${formatDay(period.end)}.`,
    })
  })
  report.eventComparisons.slice(0, 2).forEach((event, index) => {
    facts.push({
      id: `event_association_${index + 1}`,
      meaning: `An observed event association whose event-day wellness was ${event.difference < 0 ? 'lower' : 'not lower'} than other scored days; it is not proof of causation.`,
      replacement: `“${event.label}” was recorded on ${event.eventDays} scored days. Those days averaged ${event.eventAverage}% wellness, compared with ${event.otherAverage}% on other scored days. This is an observed association and may have other explanations.`,
    })
  })
  if (report.eventComparisons.length) {
    const event = report.eventComparisons[0]
    facts.push({
      id: 'event_summary',
      meaning: 'Concise provider-facing summary of the strongest recorded event association without implying causation.',
      replacement: `“${event.label}” appeared on ${event.eventDays} scored days averaging ${event.eventAverage}% wellness versus ${event.otherAverage}% on other scored days, a ${Math.abs(event.difference)}-point ${event.difference < 0 ? 'decrease' : 'increase'}. This suggests an association worth discussing, not a known cause.`,
    })
  }
  report.recentDifficult.slice(0, 2).forEach((signal, index) => {
    facts.push({
      id: `frequent_concern_${index + 1}`,
      meaning: 'A difficult signal recorded frequently enough to provide useful discussion context.',
      replacement: `“${signal.name}” was noted in ${signal.count} of ${report.recentCheckIns.length} recent observations (${signal.recentRate}%, ${baselineDelta(signal.delta)}). This suggests the signal was ${signal.delta === 0 ? 'occurring at a similar rate' : signal.delta > 0 ? 'more common recently' : 'less common recently'}.`,
    })
  })
  report.recentPositive.slice(0, 1).forEach((signal) => {
    facts.push({
      id: 'frequent_positive',
      meaning: 'A frequently recorded positive signal that provides balance and context.',
      replacement: `“${signal.name}” was noted in ${signal.count} of ${report.recentCheckIns.length} recent observations (${signal.recentRate}%, ${baselineDelta(signal.delta)}). This suggests the positive signal was ${signal.delta === 0 ? 'occurring at a similar rate' : signal.delta > 0 ? 'more common recently' : 'less common recently'}.`,
    })
  })
  const preferred = [
    'sustainability',
    recentTrendImproved ? 'recent_concern_days' : 'recent_regressive_days',
    'wellness_comparison',
    'trend_description',
    'calendar_context',
    'important_stretches',
    'event_summary',
    'frequent_concern_1',
    'frequent_positive',
    'coverage',
  ]
  return {
    schemaVersion: REPORT_NARRATIVE_SCHEMA_VERSION,
    facts: preferred.flatMap((id) => facts.find((fact) => fact.id === id) ?? []),
  }
}

export const canonicalNarrativeFacts = (envelope: NarrativeEnvelope) => JSON.stringify(envelope)

export const hashNarrativeFacts = async (factsJson: string) => {
  const bytes = new TextEncoder().encode(factsJson)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('')
}

export const validateNarrativeTemplate = (template: string, envelope: NarrativeEnvelope) => {
  const trimmed = template.trim()
  const placeholders: string[] = trimmed.match(/\{\{[a-z][a-z0-9_]*\}\}/g) ?? []
  const allowed = new Set(envelope.facts.map((fact) => `{{${fact.id}}}`))
  if (
    trimmed.length < 40
    || trimmed.length > 1_800
    || new Set(placeholders).size < 2
    || placeholders.some((placeholder) => !allowed.has(placeholder))
    || trimmed.replace(/\{\{[a-z][a-z0-9_]*\}\}/g, '').includes('{{')
    || trimmed.replace(/\{\{[a-z][a-z0-9_]*\}\}/g, '').includes('}}')
  ) throw new Error('Invalid narrative template')
  const takeaways = trimmed.split('\n').map((line) => line.trim()).filter(Boolean)
  if (takeaways.length !== envelope.facts.length || takeaways.some((line) => !/^- \{\{[a-z][a-z0-9_]*\}\} .+/.test(line))) {
    throw new Error('Narrative must paraphrase every evidence section')
  }
  const lockedValues = (text: string) => (text.match(/\d+(?:\.\d+)?%?/g) ?? []).sort()
  const recentRatePattern = /\(\d+%, (?:0 points unchanged from baseline|\d+ points (?:up|down) from baseline)\)/
  takeaways.forEach((line) => {
    const marker = line.match(/\{\{[a-z][a-z0-9_]*\}\}/)?.[0]
    const fact = envelope.facts.find(({ id }) => `{{${id}}}` === marker)
    const paraphrase = line.replace(/^- \{\{[a-z][a-z0-9_]*\}\}\s*/, '')
    if (!fact || JSON.stringify(lockedValues(paraphrase)) !== JSON.stringify(lockedValues(fact.replacement))) {
      throw new Error('Narrative changed or omitted a locked value')
    }
    if (recentRatePattern.test(fact.replacement) && !recentRatePattern.test(paraphrase)) {
      throw new Error('Narrative changed the recent-versus-baseline rate format')
    }
  })
  if (new Set(placeholders).size !== envelope.facts.length) throw new Error('Narrative omitted an evidence section')
  if (envelope.facts.some((fact) => fact.id === 'sustainability') && !placeholders.includes('{{sustainability}}')) {
    throw new Error('Narrative must address day-to-day sustainability')
  }
  const noteworthyIds = new Set(['recent_regressive_days', 'recent_concern_days', 'concern_stretch_1'])
  if (
    envelope.facts.some((fact) => noteworthyIds.has(fact.id))
    && !placeholders.some((placeholder) => noteworthyIds.has(placeholder.slice(2, -2)))
  ) throw new Error('Narrative must include noteworthy concern evidence')
  return trimmed
}

export const renderNarrative = (template: string, envelope: NarrativeEnvelope) => {
  const validated = validateNarrativeTemplate(template, envelope)
  return validated
    .replace(/^- \{\{[a-z][a-z0-9_]*\}\}\s*/gm, '• ')
    .replace(/^- /gm, '• ')
    .replaceAll('—', ':')
}

export const renderNarrativeSections = (template: string, envelope: NarrativeEnvelope) => {
  const validated = validateNarrativeTemplate(template, envelope)
  return Object.fromEntries(validated.split('\n').map((line) => {
    const marker = line.match(/\{\{([a-z][a-z0-9_]*)\}\}/)
    return [marker?.[1] ?? '', line.replace(/^- \{\{[a-z][a-z0-9_]*\}\}\s*/, '').replaceAll('—', ':')]
  }))
}

export const fallbackNarrative = (envelope: NarrativeEnvelope) => {
  const prioritized = ['sustainability', 'recent_regressive_days', 'recent_concern_days', 'concern_stretch_1', 'wellness_comparison', 'event_association_1', 'frequent_concern_1', 'frequent_positive', 'coverage']
  const facts = prioritized.flatMap((id) => envelope.facts.find((fact) => fact.id === id) ?? []).slice(0, 3)
  const takeaways = facts.map((fact) => fact.replacement)
  if (takeaways.length < 3) takeaways.push('The detailed report shows the observations currently available without treating missing days as wellness information.')
  if (takeaways.length < 3) takeaways.push('Continue recording meaningful changes so future comparisons have more context.')
  return takeaways.slice(0, 3).map((takeaway) => `• ${takeaway}`).join('\n')
}

export const narrativeTakeaways = (text: string) => text
  .split('\n')
  .map((line) => line.trim().replace(/^[•-]\s+/, ''))
  .filter(Boolean)
  .slice(0, 3)
