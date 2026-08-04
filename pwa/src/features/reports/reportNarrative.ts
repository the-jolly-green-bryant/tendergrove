import {
  preferredComparisonFromReferences,
  type buildProviderReport,
} from './reportBuilder'
import {
  PATTERN_STRAIN_LABELS,
  patternDimensionLevel,
  type PatternStrainBand,
} from '../patterns/analytics/patternDynamics'

export const REPORT_NARRATIVE_SCHEMA_VERSION = 21

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

const percentage = (count: number, total: number) =>
  total ? Math.round((count / total) * 100) : 0
const formatPoints = (value: number) =>
  `${value} ${value === 1 ? 'point' : 'points'}`
const formatDistributionScore = (value: number) =>
  String(Math.round(value * 10) / 10)
const relativeRateToBaseline = (value: number, baseline: number) => {
  if (value === baseline) return 'unchanged from baseline'
  if (baseline === 0) return value > 0 ? 'above baseline' : 'below baseline'
  const percent = Math.max(
    1,
    Math.round((Math.abs(value - baseline) / Math.abs(baseline)) * 100),
  )
  return `${percent}% ${value > baseline ? 'above' : 'below'} baseline`
}
const relativeToBaseline = (value: number, baseline: number) => {
  const delta = value - baseline
  if (delta === 0) return { phrase: 'unchanged from baseline', percent: 0 }
  if (baseline === 0)
    return {
      phrase: `${formatPoints(Math.abs(delta))} ${delta > 0 ? 'above' : 'below'} baseline`,
      percent: null,
    }
  const percent = Math.max(
    1,
    Math.round((Math.abs(delta) / Math.abs(baseline)) * 100),
  )
  return {
    phrase: `${percent}% ${delta > 0 ? 'above' : 'below'} baseline`,
    percent,
  }
}
const formatDay = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
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

export type RegressionIntensity = 'mild' | 'moderate' | 'pronounced'

export const qualifyRegressionIntensity = ({
  baseline,
  scores,
  largestAdjacentDecline,
  recentAverage,
  strainBand,
}: {
  baseline: number
  scores: number[]
  largestAdjacentDecline: number
  recentAverage: number | null
  strainBand: PatternStrainBand
}): {
  level: RegressionIntensity
  averageScore: number
  averageDepth: number
  deepestDepth: number
} | null => {
  const regressiveScores = scores.filter((score) => score < baseline)
  if (!regressiveScores.length) return null
  const averageScore = Math.round(
    regressiveScores.reduce((sum, score) => sum + score, 0) /
      regressiveScores.length,
  )
  const depths = regressiveScores.map((score) => baseline - score)
  const averageDepth = Math.round(
    depths.reduce((sum, depth) => sum + depth, 0) / depths.length,
  )
  const deepestDepth = Math.max(...depths)
  const strainIsSustained = strainBand === 'sustained' || strainBand === 'intensive'
  const broaderPatternImproved =
    recentAverage !== null && recentAverage > baseline && !strainIsSustained
  const level: RegressionIntensity = broaderPatternImproved
    ? 'mild'
    : strainIsSustained && (averageScore < 25 || averageDepth >= 15)
      ? 'pronounced'
      : averageScore < 45 ||
          averageDepth >= 10 ||
          deepestDepth >= 15 ||
          largestAdjacentDecline >= 15 ||
          strainBand === 'elevated'
        ? 'moderate'
        : 'mild'
  return { level, averageScore, averageDepth, deepestDepth }
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
  const baseline =
    report.wellnessComparison?.reference ?? report.baseline
  const baselineLabel = 'baseline'
  const recentRegressiveDays =
    baseline === null ? [] : recent.filter((day) => day.score < baseline)
  const recentRegressiveRate = percentage(recentRegressiveDays.length, recent.length)
  const regressiveRateReferences = baseline === null
    ? []
    : [
        {
          label: 'historical baseline',
          days: report.allTimeObservations ?? observations,
        },
        { label: 'baseline', days: observations },
        {
          label: 'relevant baseline',
          days: observations.filter(
            (day) =>
              day.date >=
              new Date(Date.now() - 59 * 86_400_000)
                .toISOString()
                .slice(0, 10),
          ),
        },
        { label: 'recent baseline', days: recent },
      ].map(({ label, days }) => ({
        label,
        value: days.length
          ? percentage(
              days.filter((day) => day.score < baseline).length,
              days.length,
            )
          : null,
      }))
  const regressiveRateComparison = preferredComparisonFromReferences(
    recentRegressiveRate,
    regressiveRateReferences,
    'higher',
  )
  const recentRegressiveStretch = longestConsecutiveStretch(
    recentRegressiveDays.map((day) => day.date),
  )
  const orderedRecent = [...recent].sort((a, b) => a.date.localeCompare(b.date))
  const downwardChanges = orderedRecent
    .slice(1)
    .map((day, index) => Math.max(0, orderedRecent[index].score - day.score))
  const largestAdjacentDecline = downwardChanges.length
    ? Math.max(...downwardChanges)
    : 0
  const regressionIntensity =
    baseline === null
      ? null
      : qualifyRegressionIntensity({
          baseline,
          scores: recent.map((day) => day.score),
          largestAdjacentDecline,
          recentAverage: report.recent,
          strainBand: report.patternDynamics.band,
        })
  const recentConcernStretch = longestConsecutiveStretch(
    recent.filter((day) => day.level === 'concern').map((day) => day.date),
  )
  const recentTrendImproved =
    baseline !== null &&
    report.recent !== null &&
    report.recent > baseline
  const primaryRate = recentTrendImproved ? recentConcernRate : recentRegressiveRate
  const primaryStretch = recentTrendImproved
    ? recentConcernStretch
    : recentRegressiveStretch
  const lowStrain = report.patternDynamics.band === 'low'
  const difficultToSustain =
    !lowStrain && (primaryRate >= 50 || primaryStretch >= 3)
  const facts: NarrativeFact[] = recent.length
    ? [
        {
          id: 'sustainability',
          meaning: difficultToSustain
            ? 'HIGHEST PRIORITY: the recent recorded pattern does not look sustainable.'
            : lowStrain
              ? 'HIGHEST PRIORITY: the recent recorded pattern remains low strain and consistent with ordinary variation.'
            : recentTrendImproved
              ? 'HIGHEST PRIORITY: the recent average improved, while raw recent concern days still deserve attention.'
              : 'HIGHEST PRIORITY: the recent recorded pattern looks more sustainable.',
          replacement: difficultToSustain
            ? `The recent pattern shows repeated${regressionIntensity ? `, ${regressionIntensity.level}` : ''} regression and sustained concerning observations, which does not look sustainable.`
            : lowStrain
              ? 'The recent pattern remains low strain and looks consistent with ordinary ups and downs.'
            : recentTrendImproved
              ? 'The recent average improved, but the remaining concern observations still matter.'
              : 'The recent pattern looks more sustainable, though individual concern observations still warrant review.',
        },
      ]
    : []

  facts.push({
    id: 'coverage',
    meaning: 'How much recorded evidence is available in the longer comparison window.',
    replacement: `${observations.length} scored days were available across the selected window, representing ${report.completeness}% recorded-data coverage.`,
  })

  if (baseline !== null && recentRegressiveDays.length && !lowStrain) {
    facts.push({
      id: 'recent_regressive_days',
      meaning:
        'HIGH PRIORITY: explain both the frequency and measured intensity of recent regression.',
      replacement: `${recentRegressiveRate}% of recent observations fell below the ${baseline}-point ${baselineLabel} (${regressiveRateComparison?.phrase ?? 'unchanged from baseline'})${recentRegressiveStretch >= 2 ? `; longest stretch: ${recentRegressiveStretch} days` : ''}. The recorded regression was ${regressionIntensity!.level}: affected observations averaged ${formatPoints(regressionIntensity!.averageScore)}, ${formatPoints(regressionIntensity!.averageDepth)} below ${baselineLabel}, with a deepest shortfall of ${formatPoints(regressionIntensity!.deepestDepth)}${largestAdjacentDecline ? ` and a largest adjacent decline of ${formatPoints(largestAdjacentDecline)}` : ''}.`,
    })
  }

  if (baseline !== null && recentRegressiveDays.length && lowStrain) {
    facts.push({
      id: 'normal_variation',
      meaning:
        'LOW STRAIN CONTEXT: explain below-baseline observations without presenting ordinary variation as sustained regression.',
      replacement: `${recentRegressiveRate}% of recent observations fell below the ${baseline}-point ${baselineLabel} (${regressiveRateComparison?.phrase ?? 'unchanged from baseline'}). Within the broader low-strain pattern, these observations suggest ordinary variation rather than a sustained regression.`,
    })
  }

  if (baseline !== null && report.recent !== null) {
    const delta = report.recent - baseline
    const relative =
      report.wellnessComparison ??
      relativeToBaseline(report.recent, baseline)
    const essentiallyUnchanged =
      delta === 0 || (relative.percent !== null && relative.percent <= 3)
    facts.push({
      id: 'wellness_comparison',
      meaning:
        essentiallyUnchanged
          ? 'Recent observed wellness is unchanged from the longer-window average.'
          : `Recent observed wellness is ${delta > 0 ? 'higher' : 'lower'} than the longer-window average.`,
      replacement: `Recent wellness averaged ${formatPoints(report.recent)}, ${relative.phrase}. This suggests recorded well-being was ${essentiallyUnchanged ? 'essentially unchanged' : delta > 0 ? 'improving' : 'declining'} overall.`,
    })
  }

  if (recent.length) {
    const distribution = report.groveScoreDistribution
    facts.push({
      id: 'trend_description',
      meaning:
        'Provider-facing description of the recent 30-day Grove Score distribution, labeled as wellness for readability.',
      replacement:
        !distribution
          ? 'There is not enough Grove Score history yet to describe the recent wellness trend.'
          : `Over the past ${distribution.days} days, the middle half of the wellness trend ranged from ${formatDistributionScore(distribution.typicalLow)} to ${formatDistributionScore(distribution.typicalHigh)} Grove Score points.${distribution.baseline === null ? '' : ` The higher applicable baseline was ${formatDistributionScore(distribution.baseline)}.`} The full range, including unusual highs and lows, was ${formatDistributionScore(distribution.minimum)} to ${formatDistributionScore(distribution.maximum)}.`,
    })
    const recentDifficult = report.difficultPeriods.filter(
      (period) => period.start >= recentKey && period.days >= 2,
    )
    const recentPositive = report.positivePeriods.filter(
      (period) => period.start >= recentKey && period.days >= 2,
    )
    facts.push({
      id: 'calendar_context',
      meaning: 'Brief context immediately above the recent observation calendar.',
      replacement: `${recent.length} recent recorded observations were available.${recentDifficult[0] ? ` Longest stretch of concerning observations: ${recentDifficult[0].days} days.` : ''}${recentPositive[0] ? ` Longest stretch of steady observations: ${recentPositive[0].days} days.` : ''}`,
    })
    if (recentDifficult.length || recentPositive.length) {
      facts.push({
        id: 'important_stretches',
        meaning: 'Important recent stretches for a provider to notice.',
        replacement: [
          ...recentDifficult
            .slice(0, 2)
            .map(
              (period) =>
                `Concern range: ${period.days} days, ${formatDay(period.start)}–${formatDay(period.end)}.`,
            ),
          ...recentPositive
            .slice(0, 1)
            .map(
              (period) =>
                `Steady range: ${period.days} days, ${formatDay(period.start)}–${formatDay(period.end)}.`,
            ),
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
      replacement: `${recentConcernRate}% of recent observations were in the concern range${report.concernRateComparison ? ` (${report.concernRateComparison.phrase})` : ''}.`,
    })
  }

  report.difficultPeriods
    .filter((period) => period.days >= 2 && period.start >= recentKey)
    .slice(0, 2)
    .forEach((period, index) => {
      facts.push({
        id: `concern_stretch_${index + 1}`,
        meaning:
          'A sustained consecutive stretch of concern-range observations that should not be obscured by averages.',
        replacement: `A recent concern-range stretch lasted ${period.days} consecutive scored days, from ${formatDay(period.start)} through ${formatDay(period.end)}.`,
      })
    })
  report.positivePeriods
    .filter((period) => period.days >= 2)
    .slice(0, 1)
    .forEach((period) => {
      facts.push({
        id: 'steady_stretch',
        meaning: 'A sustained consecutive stretch of steady-range observations.',
        replacement: `A steady-range stretch lasted ${period.days} consecutive scored days, from ${formatDay(period.start)} through ${formatDay(period.end)}.`,
      })
    })
  report.eventComparisons
    .map((event) => ({
      event,
      comparison: preferredComparisonFromReferences(
        event.eventAverage,
        report.comparisonReferences,
        'lower',
      ),
    }))
    .filter(
      (
        item,
      ): item is {
        event: ProviderReport['eventComparisons'][number]
        comparison: NonNullable<
          ReturnType<typeof preferredComparisonFromReferences>
        >
      } => item.comparison !== null,
    )
    .sort(
      (a, b) =>
        Number(!a.comparison.adverse) - Number(!b.comparison.adverse) ||
        b.comparison.magnitude - a.comparison.magnitude ||
        b.event.eventDays - a.event.eventDays,
    )
    .slice(0, 3)
    .forEach(({ event, comparison }, index) => {
    facts.push({
      id: `event_association_${index + 1}`,
      meaning:
        'An observed event association using the most adverse available comparison with baseline or the recent average; it is not proof of causation.',
      replacement: `“${event.label}” was recorded on ${event.eventDays} scored days. Wellness averaged ${formatPoints(event.eventAverage)} on those days, ${comparison.phrase}.`,
    })
  })
  if (report.householdCorrelation) {
    if (report.householdCorrelation.noteworthy) {
      const correlation = report.householdCorrelation
      facts.push({
        id: 'household_takeaway',
        meaning:
          'HIGH PRIORITY: briefly explain that the data suggests a noteworthy two-way relationship with household wellbeing, without claiming which side caused the other.',
        replacement: `Across ${correlation.pairedDays} shared days, the data suggests ${report.personName}’s recorded behavior may affect, or be affected by, household wellbeing.${correlation.concurrentConcernDays ? ` Both were in the concern range on ${correlation.concurrentConcernDays} days.` : ''}`,
      })
    }
    facts.push({
      id: 'household_correlation',
      meaning: report.householdCorrelation.noteworthy
        ? 'HIGH PRIORITY: a household wellness relationship that is noteworthy for a care discussion.'
        : 'How this person’s wellness scores moved alongside the average score of other household members on the same recorded days.',
      replacement: report.householdCorrelationNarrative,
    })
  }
  const strain = report.patternDynamics
  const strainIsNoteworthy =
    strain.band === 'sustained' ||
    strain.band === 'intensive' ||
    Math.max(
      strain.burden,
      strain.instability,
      strain.persistence,
      strain.recoveryDifficulty,
    ) >= 70 ||
    strain.largestDecline >= 25
  if (strainIsNoteworthy) {
    const dimensions = [
      ['burden', strain.burden],
      ['instability', strain.instability],
      ['persistence', strain.persistence],
      ['recovery difficulty', strain.recoveryDifficulty],
    ] as const
    const strongest = [...dimensions]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 2)
    facts.push({
      id: 'pattern_strain_takeaway',
      meaning:
        'HIGH PRIORITY: concise Pattern Strain evidence that is noteworthy for a professional discussion.',
      replacement: `${PATTERN_STRAIN_LABELS[strain.band]} is driven most by ${strongest.map(([label, value]) => `${patternDimensionLevel(value).toLowerCase()} ${label}`).join(' and ')}.${strain.largestDecline >= 15 ? ` The largest recent decline was ${formatPoints(strain.largestDecline)}.` : ''}`,
    })
  }
  const relativeSignalChange = (recentRate: number, baselineRate: number) =>
    baselineRate === 0
      ? recentRate
      : Math.abs((recentRate - baselineRate) / baselineRate)
  const signalComparisonPhrase = (
    signal: ProviderReport['recentDifficult'][number],
  ) =>
    signal.comparison?.phrase ??
    relativeRateToBaseline(signal.recentRate, signal.baselineRate)
  const changedDifficult = report.recentDifficult
    .filter((signal) => signal.delta !== 0)
    .sort(
      (a, b) =>
        Number(a.delta < 0) - Number(b.delta < 0) ||
        relativeSignalChange(b.recentRate, b.baselineRate) -
          relativeSignalChange(a.recentRate, a.baselineRate),
    )
  const changedPositive = report.recentPositive
    .filter((signal) => signal.delta !== 0)
    .sort(
      (a, b) =>
        Number(a.delta > 0) - Number(b.delta > 0) ||
        relativeSignalChange(b.recentRate, b.baselineRate) -
          relativeSignalChange(a.recentRate, a.baselineRate),
    )
  const primaryDifficultSignals = changedDifficult.slice(0, 2)
  const remainingDifficult = changedDifficult[2]
  const leadingPositive = changedPositive[0]
  const remainingDifficultIsAdverse = (remainingDifficult?.delta ?? 0) > 0
  const leadingPositiveIsAdverse = (leadingPositive?.delta ?? 0) < 0
  const thirdSignal =
    remainingDifficult &&
    (!leadingPositive ||
      (remainingDifficultIsAdverse !== leadingPositiveIsAdverse
        ? remainingDifficultIsAdverse
        : remainingDifficult.delta > 0
        ? relativeSignalChange(
            remainingDifficult.recentRate,
            remainingDifficult.baselineRate,
          ) >=
          relativeSignalChange(
            leadingPositive.recentRate,
            leadingPositive.baselineRate,
          )
        : remainingDifficult.count >= leadingPositive.count))
      ? { ...remainingDifficult, kind: 'concern' as const }
      : leadingPositive
        ? { ...leadingPositive, kind: 'positive' as const }
        : null
  primaryDifficultSignals.forEach((signal, index) => {
    facts.push({
      id: `frequent_concern_${index + 1}`,
      meaning:
        'A difficult signal recorded frequently enough to provide useful discussion context.',
      replacement: `“${signal.name}” was noted in ${signal.recentRate}% of recent observations (${signalComparisonPhrase(signal)}). This suggests the signal was ${signal.delta > 0 ? 'more common recently' : 'less common recently'}.`,
    })
  })
  if (thirdSignal?.kind === 'concern') {
    facts.push({
      id: 'frequent_concern_3',
      meaning:
        'The most frequent remaining signal after the two leading difficult signals.',
      replacement: `“${thirdSignal.name}” was noted in ${thirdSignal.recentRate}% of recent observations (${signalComparisonPhrase(thirdSignal)}). This suggests the signal was ${thirdSignal.delta > 0 ? 'more common recently' : 'less common recently'}.`,
    })
  }
  if (thirdSignal?.kind === 'positive') {
    facts.push({
      id: 'frequent_positive',
      meaning:
        'A frequently recorded positive signal that provides balance and context.',
      replacement: `“${thirdSignal.name}” was noted in ${thirdSignal.recentRate}% of recent observations (${signalComparisonPhrase(thirdSignal)}). This suggests the positive signal was ${thirdSignal.delta > 0 ? 'more common recently' : 'less common recently'}.`,
    })
  }
  const preferred = [
    'sustainability',
    ...(lowStrain
      ? ['normal_variation']
      : [recentTrendImproved ? 'recent_concern_days' : 'recent_regressive_days']),
    ...(strainIsNoteworthy ? ['pattern_strain_takeaway'] : []),
    ...(report.householdCorrelation?.noteworthy ? ['household_takeaway'] : []),
    'wellness_comparison',
    'trend_description',
    'calendar_context',
    'important_stretches',
    'event_association_1',
    'event_association_2',
    'event_association_3',
    ...(!report.householdCorrelation?.noteworthy ? ['household_correlation'] : []),
    'frequent_concern_1',
    'frequent_concern_2',
    'frequent_concern_3',
    'frequent_positive',
    'coverage',
  ]
  return {
    schemaVersion: REPORT_NARRATIVE_SCHEMA_VERSION,
    facts: preferred.flatMap((id) => facts.find((fact) => fact.id === id) ?? []),
  }
}

export const canonicalNarrativeFacts = (envelope: NarrativeEnvelope) =>
  JSON.stringify(envelope)

export const hashNarrativeFacts = async (factsJson: string) => {
  const bytes = new TextEncoder().encode(factsJson)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}

export const validateNarrativeTemplate = (
  template: string,
  envelope: NarrativeEnvelope,
) => {
  const trimmed = template.trim()
  const placeholders: string[] = trimmed.match(/\{\{[a-z][a-z0-9_]*\}\}/g) ?? []
  const allowed = new Set(envelope.facts.map((fact) => `{{${fact.id}}}`))
  if (
    trimmed.length < 40 ||
    trimmed.length > 4_000 ||
    new Set(placeholders).size < 2 ||
    placeholders.some((placeholder) => !allowed.has(placeholder)) ||
    trimmed.replace(/\{\{[a-z][a-z0-9_]*\}\}/g, '').includes('{{') ||
    trimmed.replace(/\{\{[a-z][a-z0-9_]*\}\}/g, '').includes('}}')
  )
    throw new Error('Invalid narrative template')
  const takeaways = trimmed
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  if (
    takeaways.length !== envelope.facts.length ||
    takeaways.some((line) => !/^- \{\{[a-z][a-z0-9_]*\}\} .+/.test(line))
  ) {
    throw new Error('Narrative must paraphrase every evidence section')
  }
  const lockedValues = (text: string) => (text.match(/\d+(?:\.\d+)?%?/g) ?? []).sort()
  const recentRatePattern =
    /\d+% of recent observations \((?:unchanged from baseline|\d+% (?:above|below) (?:(?:historical|recent|relevant) baseline|baseline))\)/
  takeaways.forEach((line) => {
    const marker = line.match(/\{\{[a-z][a-z0-9_]*\}\}/)?.[0]
    const fact = envelope.facts.find(({ id }) => `{{${id}}}` === marker)
    const paraphrase = line.replace(/^- \{\{[a-z][a-z0-9_]*\}\}\s*/, '')
    if (
      !fact ||
      JSON.stringify(lockedValues(paraphrase)) !==
        JSON.stringify(lockedValues(fact.replacement))
    ) {
      throw new Error('Narrative changed or omitted a locked value')
    }
    if (
      recentRatePattern.test(fact.replacement) &&
      !recentRatePattern.test(paraphrase)
    ) {
      throw new Error('Narrative changed the recent-versus-baseline rate format')
    }
  })
  if (new Set(placeholders).size !== envelope.facts.length)
    throw new Error('Narrative omitted an evidence section')
  if (
    envelope.facts.some((fact) => fact.id === 'sustainability') &&
    !placeholders.includes('{{sustainability}}')
  ) {
    throw new Error('Narrative must address day-to-day sustainability')
  }
  const noteworthyIds = new Set([
    'recent_regressive_days',
    'recent_concern_days',
    'concern_stretch_1',
  ])
  if (
    envelope.facts.some((fact) => noteworthyIds.has(fact.id)) &&
    !placeholders.some((placeholder) => noteworthyIds.has(placeholder.slice(2, -2)))
  )
    throw new Error('Narrative must include noteworthy concern evidence')
  return trimmed
}

export const renderNarrative = (template: string, envelope: NarrativeEnvelope) => {
  const validated = validateNarrativeTemplate(template, envelope)
  return validated
    .replace(/^- \{\{[a-z][a-z0-9_]*\}\}\s*/gm, '• ')
    .replace(/^- /gm, '• ')
    .replaceAll('—', ':')
}

export const renderNarrativeSections = (
  template: string,
  envelope: NarrativeEnvelope,
) => {
  const validated = validateNarrativeTemplate(template, envelope)
  return Object.fromEntries(
    validated.split('\n').map((line) => {
      const marker = line.match(/\{\{([a-z][a-z0-9_]*)\}\}/)
      return [
        marker?.[1] ?? '',
        line.replace(/^- \{\{[a-z][a-z0-9_]*\}\}\s*/, '').replaceAll('—', ':'),
      ]
    }),
  )
}

export const fallbackNarrative = (envelope: NarrativeEnvelope) => {
  const householdIsNoteworthy = envelope.facts.some(
    (fact) => fact.id === 'household_takeaway',
  )
  const strainIsNoteworthy = envelope.facts.some(
    (fact) => fact.id === 'pattern_strain_takeaway',
  )
  const prioritized = [
    'sustainability',
    ...(envelope.facts.some((fact) => fact.id === 'normal_variation')
      ? ['normal_variation']
      : ['recent_regressive_days']),
    ...(strainIsNoteworthy ? ['pattern_strain_takeaway'] : []),
    'recent_concern_days',
    'concern_stretch_1',
    ...(householdIsNoteworthy ? ['household_takeaway'] : []),
    'wellness_comparison',
    'event_association_1',
    'frequent_concern_1',
    'frequent_positive',
    ...(!householdIsNoteworthy ? ['household_correlation'] : []),
    'coverage',
  ]
  const facts = prioritized
    .flatMap((id) => envelope.facts.find((fact) => fact.id === id) ?? [])
    .slice(0, 4)
  const takeaways = facts.map((fact) => fact.replacement)
  if (takeaways.length < 4)
    takeaways.push(
      'The detailed report shows the observations currently available without treating missing days as wellness information.',
    )
  if (takeaways.length < 4)
    takeaways.push(
      'Continue recording meaningful changes so future comparisons have more context.',
    )
  return takeaways
    .slice(0, 4)
    .map((takeaway) => `• ${takeaway}`)
    .join('\n')
}

export const narrativeTakeaways = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim().replace(/^[•-]\s+/, ''))
    .filter(Boolean)
    .slice(0, 4)

export const humanReadableTakeaways = (report: ProviderReport) => {
  if (!report.observations.length)
    return ['There are not enough recorded observations yet to describe a recent pattern.']

  const latestDate = report.observations.at(-1)!.date
  const recentStart = new Date(`${latestDate}T12:00:00`)
  recentStart.setDate(recentStart.getDate() - 29)
  const recentStartKey = [
    recentStart.getFullYear(),
    String(recentStart.getMonth() + 1).padStart(2, '0'),
    String(recentStart.getDate()).padStart(2, '0'),
  ].join('-')
  const recent = report.observations.filter((day) => day.date >= recentStartKey)
  const concernDays = recent.filter((day) => day.level === 'concern').length
  const recentAverage =
    report.recent ??
    recent.reduce((total, day) => total + day.score, 0) / Math.max(1, recent.length)
  const baseline = report.baseline ?? recentAverage
  const comparison = recentAverage - baseline
  const strain = report.patternDynamics
  const takeaways: string[] = []

  if (concernDays && comparison > 2)
    takeaways.push(
      `${report.personName}’s recent month is mixed: the overall average improved, but ${concernDays} of ${recent.length} recorded days were still difficult.`,
    )
  else if (concernDays)
    takeaways.push(
      `${concernDays} of ${recent.length} recorded days were difficult${comparison < -2 ? ', and the overall average was below the usual range' : ''}.`,
    )
  else
    takeaways.push(
      `${report.personName} had no recorded days in the concern range during the recent month.`,
    )

  const troublesomeEvent = [...report.eventComparisons]
    .filter((event) => event.difference <= -5)
    .sort((left, right) => left.difference - right.difference)[0]
  if (troublesomeEvent)
    takeaways.push(
      `The clearest event association was “${troublesomeEvent.label}”: wellness averaged ${troublesomeEvent.eventAverage} points on those ${troublesomeEvent.eventDays} recorded days, ${relativeToBaseline(troublesomeEvent.eventAverage, baseline).phrase}.`,
    )

  const mostCommonDifficult = [...report.recentDifficult].sort(
    (left, right) => right.recentRate - left.recentRate,
  )[0]
  const mostCommonPositive = [...report.recentPositive].sort(
    (left, right) => right.recentRate - left.recentRate,
  )[0]
  if (mostCommonDifficult || mostCommonPositive) {
    const difficultText = mostCommonDifficult
      ? `“${mostCommonDifficult.name}” was the most common difficult signal, appearing in ${mostCommonDifficult.recentRate}% of recent check-ins (${mostCommonDifficult.comparison?.phrase ?? relativeRateToBaseline(mostCommonDifficult.recentRate, mostCommonDifficult.baselineRate)})`
      : ''
    const positiveText = mostCommonPositive
      ? `“${mostCommonPositive.name}” was the most common positive signal, appearing in ${mostCommonPositive.recentRate}% (${mostCommonPositive.comparison?.phrase ?? relativeRateToBaseline(mostCommonPositive.recentRate, mostCommonPositive.baselineRate)})`
      : ''
    takeaways.push(
      `${difficultText}${difficultText && positiveText ? '; meanwhile, ' : ''}${positiveText}${positiveText ? ' of recent check-ins' : ''}.`,
    )
  }

  if (strain.band === 'sustained' || strain.band === 'intensive') {
    const reasons: string[] = []
    if (strain.persistence >= 55)
      reasons.push('difficult periods tended to continue across check-ins')
    if (strain.recoveryDifficulty >= 55)
      reasons.push('returns toward the usual range were limited')
    if (strain.burden >= 70)
      reasons.push('challenges appeared on many recorded days')
    const patternExplanation =
      reasons.slice(0, 2).join(', and ') ||
      'The difficult pattern repeated across recent check-ins'
    takeaways.push(
      `${patternExplanation.charAt(0).toUpperCase()}${patternExplanation.slice(1)}.${strain.largestDecline >= 15 ? ` The largest one-day drop was ${formatPoints(strain.largestDecline)}.` : ''}`,
    )
  } else {
    takeaways.push(strain.summary.replace(/^The recorded pattern /, 'The recent pattern '))
  }

  if (Math.abs(comparison) <= 2)
    takeaways.push(
      `Recent wellness averaged ${Math.round(recentAverage)} points, close to the longer-term baseline.`,
    )
  else if (comparison > 0)
    takeaways.push(
      `Recent wellness averaged ${Math.round(recentAverage)} points, above the ${Math.round(baseline)}-point baseline. That improvement matters, but it has not yet become a consistently easier pattern.`,
    )
  else
    takeaways.push(
      `Recent wellness averaged ${Math.round(recentAverage)} points, below the ${Math.round(baseline)}-point baseline.`,
    )

  return takeaways.slice(0, 4)
}
