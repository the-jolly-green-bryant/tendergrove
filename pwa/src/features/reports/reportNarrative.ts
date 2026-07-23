import type { buildProviderReport } from './reportBuilder'

export const REPORT_NARRATIVE_SCHEMA_VERSION = 3

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
  const concernDays = observations.filter((day) => day.level === 'concern').length
  const recentConcernDays = recent.filter((day) => day.level === 'concern').length
  const concernRate = percentage(concernDays, observations.length)
  const recentConcernRate = percentage(recentConcernDays, recent.length)
  const availableAverages = [report.baseline, report.recent].filter((value): value is number => value !== null)
  const comparisonBenchmark = availableAverages.length ? Math.max(...availableAverages) : null
  const belowBenchmark = comparisonBenchmark === null ? [] : observations.filter((day) => day.score < comparisonBenchmark)
  const belowBenchmarkRate = percentage(belowBenchmark.length, observations.length)
  const belowBenchmarkStretch = longestConsecutiveStretch(belowBenchmark.map((day) => day.date))
  const longestConcernStretch = report.difficultPeriods[0]?.days ?? 0
  const difficultToSustain = concernRate >= 50
    || longestConcernStretch >= 3
    || belowBenchmarkRate >= 60
    || belowBenchmarkStretch >= 4
  const sustainabilityEvidence = [
    `${concernDays} of ${observations.length} scored days were in the concern range (${concernRate}%)`,
    comparisonBenchmark === null ? null : `${belowBenchmark.length} scored days fell below the stricter ${comparisonBenchmark}% comparison benchmark (${belowBenchmarkRate}%)`,
    longestConcernStretch >= 2 ? `the longest concern-range stretch lasted ${longestConcernStretch} consecutive scored days` : null,
    belowBenchmarkStretch >= 2 ? `the longest below-benchmark stretch lasted ${belowBenchmarkStretch} consecutive days` : null,
  ].filter(Boolean).join('; ')
  const facts: NarrativeFact[] = observations.length ? [
    {
      id: 'sustainability',
      meaning: difficultToSustain
        ? 'HIGHEST PRIORITY: the recorded pattern does not look sustainable day to day based only on the supplied observation evidence.'
        : 'HIGHEST PRIORITY: the recorded pattern looks more sustainable in this window, while still acknowledging recorded concerns.',
      replacement: difficultToSustain
        ? `The recorded pattern does not look sustainable day to day: ${sustainabilityEvidence}.`
        : `The recorded pattern looks more sustainable in this window: ${sustainabilityEvidence}. Continue reviewing meaningful changes rather than relying on the average alone.`,
    },
  ] : []

  facts.push(
    {
      id: 'coverage',
      meaning: 'How much recorded evidence is available in the longer comparison window.',
      replacement: `${observations.length} scored days were available across the selected window, representing ${report.completeness}% recorded-data coverage.`,
    },
  )

  if (comparisonBenchmark !== null && belowBenchmark.length) {
    const lowest = [...belowBenchmark].sort((a, b) => a.score - b.score || a.date.localeCompare(b.date)).slice(0, 3)
    facts.push({
      id: 'noteworthy_low_days',
      meaning: `HIGH PRIORITY: days below the stricter of the recent and longer-window averages. The lowest recorded days are especially noteworthy. The longest below-benchmark stretch was ${belowBenchmarkStretch >= 3 ? 'sustained' : 'brief'}.`,
      replacement: `${belowBenchmark.length} of ${observations.length} scored days were below the stricter ${comparisonBenchmark}% benchmark (${belowBenchmarkRate}%). The lowest were ${lowest.map((day) => `${formatDay(day.date)} at ${day.score}%`).join(', ')}${belowBenchmarkStretch >= 2 ? `; the longest consecutive stretch below that benchmark lasted ${belowBenchmarkStretch} days` : ''}.`,
    })
  }

  if (report.baseline !== null && report.recent !== null) {
    const delta = report.recent - report.baseline
    facts.push({
      id: 'wellness_comparison',
      meaning: delta === 0
        ? 'Recent weighted wellness is unchanged from the longer-window average.'
        : `Recent weighted wellness is ${delta > 0 ? 'higher' : 'lower'} than the longer-window average.`,
      replacement: `The most recent 30 days averaged ${report.recent}% wellness, compared with the 90-day average of ${report.baseline}% (${delta === 0 ? 'no change' : `${Math.abs(delta)} percentage points ${delta > 0 ? 'higher' : 'lower'}`}).`,
    })
  }

  if (observations.length) {
    const delta = recentConcernRate - concernRate
    facts.push({
      id: 'concern_comparison',
      meaning: delta === 0
        ? 'The share of recent concern-range days matches the longer-window share.'
        : `The share of recent concern-range days is ${delta > 0 ? 'higher' : 'lower'} than the longer-window share.`,
      replacement: `${concernDays} of ${observations.length} scored days were in the concern range (${concernRate}%). In the most recent 30 days, ${recentConcernDays} of ${recent.length} scored days were in that range (${recentConcernRate}%; ${delta === 0 ? 'no change' : `${Math.abs(delta)} percentage points ${delta > 0 ? 'higher' : 'lower'}`}).`,
    })
  }

  report.difficultPeriods.filter((period) => period.days >= 2).slice(0, 2).forEach((period, index) => {
    facts.push({
      id: `concern_stretch_${index + 1}`,
      meaning: 'A sustained consecutive stretch of concern-range observations that should not be obscured by averages.',
      replacement: `A concern-range stretch lasted ${period.days} consecutive scored days, from ${formatDay(period.start)} through ${formatDay(period.end)}.`,
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
  report.difficult.slice(0, 2).forEach((signal, index) => {
    facts.push({
      id: `frequent_concern_${index + 1}`,
      meaning: 'A difficult signal recorded frequently enough to provide useful discussion context.',
      replacement: `“${signal.name}” was noted in ${signal.count} of ${report.checkIns.length} check-ins (${percentage(signal.count, report.checkIns.length)}%).`,
    })
  })
  report.positive.slice(0, 1).forEach((signal) => {
    facts.push({
      id: 'frequent_positive',
      meaning: 'A frequently recorded positive signal that provides balance and context.',
      replacement: `“${signal.name}” was noted in ${signal.count} of ${report.checkIns.length} check-ins (${percentage(signal.count, report.checkIns.length)}%).`,
    })
  })
  return { schemaVersion: REPORT_NARRATIVE_SCHEMA_VERSION, facts: facts.slice(0, 12) }
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
    || /[0-9%]/.test(trimmed.replace(/\{\{[a-z][a-z0-9_]*\}\}/g, ''))
    || new Set(placeholders).size < 2
    || placeholders.some((placeholder) => !allowed.has(placeholder))
    || trimmed.replace(/\{\{[a-z][a-z0-9_]*\}\}/g, '').includes('{{')
    || trimmed.replace(/\{\{[a-z][a-z0-9_]*\}\}/g, '').includes('}}')
  ) throw new Error('Invalid narrative template')
  const takeaways = trimmed.split('\n').map((line) => line.trim()).filter(Boolean)
  if (takeaways.length !== 3 || takeaways.some((line) => !/^- \{\{[a-z][a-z0-9_]*\}\}$/.test(line))) {
    throw new Error('Narrative must contain exactly three evidence-backed takeaways')
  }
  if (envelope.facts.some((fact) => fact.id === 'sustainability') && !placeholders.includes('{{sustainability}}')) {
    throw new Error('Narrative must address day-to-day sustainability')
  }
  const noteworthyIds = new Set(['noteworthy_low_days', 'concern_stretch_1', 'concern_comparison'])
  if (
    envelope.facts.some((fact) => noteworthyIds.has(fact.id))
    && !placeholders.some((placeholder) => noteworthyIds.has(placeholder.slice(2, -2)))
  ) throw new Error('Narrative must include noteworthy concern evidence')
  return trimmed
}

export const renderNarrative = (template: string, envelope: NarrativeEnvelope) => {
  const validated = validateNarrativeTemplate(template, envelope)
  const facts = new Map(envelope.facts.map((fact) => [`{{${fact.id}}}`, fact.replacement]))
  return validated
    .replace(/\{\{[a-z][a-z0-9_]*\}\}/g, (placeholder) => facts.get(placeholder) ?? '')
    .replace(/^- /gm, '• ')
}

export const fallbackNarrative = (envelope: NarrativeEnvelope) => {
  const prioritized = ['sustainability', 'noteworthy_low_days', 'concern_stretch_1', 'concern_comparison', 'event_association_1', 'frequent_concern_1', 'frequent_positive', 'coverage']
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
