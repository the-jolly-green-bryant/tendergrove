import { parseAnswers } from '../people/checkin/checkInUtils'
import type { RawLifeEvent, RawPerson } from '../patterns/analytics'
import { computeScore, STATUS_THRESHOLDS } from '../../lib/status'
import { buildDailyScores, computeTrend, normalizeHousehold } from '../patterns/analytics'

export interface ProviderReportInput {
  person: RawPerson
  reason: string
  questions: string
  days?: number
  pinnedObservations?: string[]
  lifeEvents?: RawLifeEvent[]
}

const frequencyLines = (person: RawPerson, polarity: 'desired' | 'undesired') => {
  const checkIns = person.checkIns ?? []
  return (person.indicators ?? [])
    .filter((indicator) => indicator.active !== false && indicator.polarity === polarity)
    .map((indicator) => ({
      name: indicator.name,
      count: checkIns.filter((checkIn) => new Set(parseAnswers(checkIn.answersJson).checked).has(indicator.id)).length,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}

const compareFrequencies = (
  recentItems: ReturnType<typeof frequencyLines>,
  baselineItems: ReturnType<typeof frequencyLines>,
  recentTotal: number,
  baselineTotal: number,
) => recentItems.map((item) => {
  const recentRate = percentage(item.count, recentTotal)
  const baselineCount = baselineItems.find((baseline) => baseline.name === item.name)?.count ?? 0
  const baselineRate = percentage(baselineCount, baselineTotal)
  return { ...item, recentRate, baselineRate, delta: recentRate - baselineRate }
})

export interface ReportDay {
  date: string
  score: number
  level: 'steady' | 'watch' | 'concern'
  concernSignals: number
  positiveSignals: number
}

export interface ReportCalendarDay {
  date: string
  score: number | null
  weightedScore: number | null
  level: ReportDay['level'] | 'missing'
  concernSignals: number
  positiveSignals: number
}

export interface EventComparison {
  label: string
  eventDays: number
  eventAverage: number
  otherAverage: number
  concernDays: number
  difference: number
}

export interface ReportPeriod {
  kind: 'difficult' | 'positive'
  start: string
  end: string
  days: number
}

const dateKey = (value: string) => {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const nextDateKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(year, month - 1, day + 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const formatDay = (key: string) => {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const percentage = (count: number, total: number) => total ? Math.round((count / total) * 100) : 0
const baselineDelta = (delta: number) => delta === 0
  ? 'unchanged from baseline'
  : `${Math.abs(delta)} points ${delta > 0 ? 'up' : 'down'} from baseline`

const dateKeysBetween = (start: Date, end: Date) => {
  const keys: string[] = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12)
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 12)
  while (cursor <= last) { keys.push(dateKey(cursor.toISOString())); cursor.setDate(cursor.getDate() + 1) }
  return keys
}

const dailyScores = (person: RawPerson, checkIns: NonNullable<RawPerson['checkIns']>): ReportDay[] => {
  const indicators = (person.indicators ?? []).filter((indicator) => indicator.active !== false)
  const grouped = new Map<string, { scores: number[]; concernSignals: number; positiveSignals: number }>()
  const difficultIds = new Set(indicators.filter((indicator) => indicator.polarity === 'undesired').map((indicator) => indicator.id))
  const positiveIds = new Set(indicators.filter((indicator) => indicator.polarity === 'desired').map((indicator) => indicator.id))
  checkIns.forEach((checkIn) => {
    const score = computeScore(indicators, checkIn)
    if (score === null) return
    const key = dateKey(checkIn.occurredAt)
    const checked = parseAnswers(checkIn.answersJson).checked
    const current = grouped.get(key) ?? { scores: [], concernSignals: 0, positiveSignals: 0 }
    current.scores.push(score)
    current.concernSignals += checked.filter((id) => difficultIds.has(id)).length
    current.positiveSignals += checked.filter((id) => positiveIds.has(id)).length
    grouped.set(key, current)
  })
  return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, values]) => {
    const { scores, concernSignals, positiveSignals } = values
    const score = Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
    return { date, score, concernSignals, positiveSignals, level: score >= STATUS_THRESHOLDS.good ? 'steady' : score >= STATUS_THRESHOLDS.trouble ? 'watch' : 'concern' }
  })
}

const findPeriods = (days: ReportDay[], kind: ReportPeriod['kind']): ReportPeriod[] => {
  const matches = (day: ReportDay) => kind === 'difficult' ? day.level === 'concern' : day.level === 'steady'
  const periods: ReportPeriod[] = []
  let start = ''
  let previous = ''
  for (const day of [...days, { date: '', score: 0, concernSignals: 0, positiveSignals: 0, level: 'watch' as const }]) {
    if (matches(day) && (!previous || day.date === nextDateKey(previous))) {
      start ||= day.date
      previous = day.date
      continue
    }
    if (start) periods.push({ kind, start, end: previous, days: Math.round((new Date(`${previous}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime()) / 86_400_000) + 1 })
    start = matches(day) ? day.date : ''
    previous = matches(day) ? day.date : ''
  }
  return periods.sort((a, b) => b.days - a.days || a.start.localeCompare(b.start))
}

export const buildProviderReport = ({ person, days = 90, pinnedObservations = [], lifeEvents = [] }: ProviderReportInput) => {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days + 1)
  cutoff.setHours(0, 0, 0, 0)
  const checkIns = [...(person.checkIns ?? [])].filter((item) => new Date(item.occurredAt) >= cutoff).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
  const difficult = frequencyLines({ ...person, checkIns }, 'undesired')
  const positive = frequencyLines({ ...person, checkIns }, 'desired')
  const recentCutoff = new Date(); recentCutoff.setDate(recentCutoff.getDate() - 29); recentCutoff.setHours(0, 0, 0, 0)
  const recentCheckIns = checkIns.filter((item) => new Date(item.occurredAt) >= recentCutoff)
  const recentDifficult = compareFrequencies(
    frequencyLines({ ...person, checkIns: recentCheckIns }, 'undesired'),
    difficult,
    recentCheckIns.length,
    checkIns.length,
  )
  const recentPositive = compareFrequencies(
    frequencyLines({ ...person, checkIns: recentCheckIns }, 'desired'),
    positive,
    recentCheckIns.length,
    checkIns.length,
  )
  const notes = checkIns.flatMap((item) => item.note?.trim() ? [{ date: dateKey(item.occurredAt), text: item.note.trim() }] : [])
  const medicationNotes = notes.filter((item) => /medicat|dose|therapy|hospital|doctor|intervention|appointment/i.test(item.text))
  const difficultIds = new Set((person.indicators ?? []).filter((indicator) => indicator.active !== false && indicator.polarity === 'undesired').map((indicator) => indicator.id))
  const difficultCheckIns = checkIns.filter((checkIn) => parseAnswers(checkIn.answersJson).checked.some((id) => difficultIds.has(id))).length
  const careDiscussion = difficultCheckIns >= 2 || medicationNotes.length > 0
  const firstDate = checkIns[0] ? new Date(checkIns[0].occurredAt).toLocaleDateString() : 'No check-ins yet'
  const lastDate = checkIns.at(-1) ? new Date(checkIns.at(-1)!.occurredAt).toLocaleDateString() : 'No check-ins yet'
  const completeness = Math.round((new Set(checkIns.map((item) => new Date(item.occurredAt).toDateString())).size / days) * 100)
  const recentCompleteness = Math.round((new Set(checkIns.filter((item) => new Date(item.occurredAt) >= recentCutoff).map((item) => new Date(item.occurredAt).toDateString())).size / 30) * 100)
  const calendarKeys = dateKeysBetween(cutoff, new Date())
  const signalObservations = dailyScores(person, checkIns)
  const signalsByDate = new Map(signalObservations.map((day) => [day.date, day]))
  const normalized = normalizeHousehold([person], { now: new Date(), windowDays: days, lifeEvents })
  const analyticsDays = buildDailyScores(normalized.people, calendarKeys).personDailyScores[person.id] ?? []
  const observations: ReportDay[] = analyticsDays.filter((day): day is typeof day & { score: number } => day.score !== null).map((day) => {
    const signals = signalsByDate.get(day.date)
    return { date: day.date, score: day.score, level: day.score >= STATUS_THRESHOLDS.good ? 'steady' : day.score >= STATUS_THRESHOLDS.trouble ? 'watch' : 'concern', concernSignals: signals?.concernSignals ?? 0, positiveSignals: signals?.positiveSignals ?? 0 }
  })
  const mean = (values: ReportDay[]) => values.length ? Math.round(values.reduce((sum, day) => sum + day.score, 0) / values.length) : null
  const recentKey = dateKey(recentCutoff.toISOString())
  const baseline = mean(observations)
  const recent = mean(observations.filter((day) => day.date >= recentKey))
  const delta = baseline !== null && recent !== null ? recent - baseline : null
  const observationByDate = new Map(observations.map((day) => [day.date, day]))
  const analyticsByDate = new Map(analyticsDays.map((day) => [day.date, day]))
  const weightedTrend = computeTrend(analyticsDays.map((day) => ({ date: day.date, score: day.score, eventCount: day.incidentCount })))
  const calendarDays: ReportCalendarDay[] = calendarKeys.map((date, index) => {
    const day = observationByDate.get(date)
    const hasCheckIn = (analyticsByDate.get(date)?.checkInCount ?? 0) > 0
    return day && hasCheckIn ? { ...day, weightedScore: weightedTrend.points[index].rollingAverage } : { date, score: null, weightedScore: weightedTrend.points[index].rollingAverage, level: 'missing', concernSignals: 0, positiveSignals: 0 }
  })
  const difficultPeriods = findPeriods(observations, 'difficult')
  const positivePeriods = findPeriods(observations, 'positive')
  const concernDays = observations.filter((day) => day.level === 'concern').length
  const steadyDays = observations.filter((day) => day.level === 'steady').length
  const recentObservations = observations.filter((day) => day.date >= recentKey)
  const recentConcernDays = recentObservations.filter((day) => day.level === 'concern').length
  const fullConcernRate = percentage(concernDays, observations.length)
  const recentConcernRate = percentage(recentConcernDays, recentObservations.length)
  const concernRateDelta = recentConcernRate - fullConcernRate
  const significantPeriods = [
    ...difficultPeriods.filter((period) => period.days >= 2).map((period) => `• Concern-range stretch: ${period.days} consecutive scored days, from ${formatDay(period.start)} through ${formatDay(period.end)}. This sustained period remains significant even when behavioral improvements were recorded in the days before or after it.`),
    ...positivePeriods.filter((period) => period.days >= 2).map((period) => `• Steady-range stretch: ${period.days} consecutive scored days, from ${formatDay(period.start)} through ${formatDay(period.end)}.`),
    `• Baseline: ${concernDays} of ${observations.length} scored days were in the concern range (${fullConcernRate}%); ${observations.length - concernDays - steadyDays} of ${observations.length} were in the watch range (${percentage(observations.length - concernDays - steadyDays, observations.length)}%); and ${steadyDays} of ${observations.length} were steady (${percentage(steadyDays, observations.length)}%).`,
    ...(recentObservations.length ? [`• Recent: ${recentConcernDays} of ${recentObservations.length} recorded observations were in the concern range (${recentConcernRate}%, ${baselineDelta(concernRateDelta)}).`] : []),
  ]
  const eventComparisons: EventComparison[] = lifeEvents.flatMap((event) => {
    const eventDates = new Set(checkIns.filter((checkIn) => parseAnswers(checkIn.answersJson).events.includes(event.id)).map((checkIn) => dateKey(checkIn.occurredAt)))
    const onEvent = observations.filter((day) => eventDates.has(day.date)); const offEvent = observations.filter((day) => !eventDates.has(day.date))
    const eventAverage = mean(onEvent); const otherAverage = mean(offEvent)
    if (onEvent.length < 2 || offEvent.length < 2 || eventAverage === null || otherAverage === null) return []
    return [{ label: event.label?.trim() || 'Event', eventDays: onEvent.length, eventAverage, otherAverage, concernDays: onEvent.filter((day) => day.level === 'concern').length, difference: eventAverage - otherAverage }]
  }).sort((a, b) => a.difference - b.difference || b.eventDays - a.eventDays)
  const eventNarrative = eventComparisons.length
    ? eventComparisons.slice(0, 3).map((event) => `• “${event.label}” was recorded on ${event.eventDays} scored days. Those days averaged ${event.eventAverage} wellness points, compared with ${event.otherAverage} points on other scored days and a baseline of ${baseline ?? 'unavailable'} points. The event-day average was ${baseline === null ? 'not comparable with baseline' : event.eventAverage === baseline ? 'unchanged from baseline' : `${Math.abs(event.eventAverage - baseline)} points ${event.eventAverage > baseline ? 'higher than' : 'lower than'} baseline`}. ${event.concernDays} of ${event.eventDays} event days were in the concern range (${percentage(event.concernDays, event.eventDays)}%). ${event.difference < 0 ? `In this sample, the event coincided with a wellness score ${Math.abs(event.difference)} points lower than other scored days.` : `In this sample, the event did not coincide with a lower average wellness score.`}`)
    : 'No event has enough recorded days yet for a meaningful comparison with other observations.'
  const lines = [
    `GROVE CARE APPOINTMENT-PREP SUMMARY: ${person.displayName}`,
    'Personal observations only: not a diagnosis, risk assessment, or recommendation for treatment or hospitalization.',
    '',
    'COMPARISON TERMS', 'Recent means the rolling 30-day period. Baseline means the rolling 90-day period. Wellness points are assigned on Grove’s 0–100 scale; they are scores, not population percentiles.',
    'DATE RANGE AND COMPLETENESS', `${firstDate} to ${lastDate} · ${checkIns.length} check-ins · ${completeness}% of the baseline window has recorded data · ${recentCompleteness}% of the recent window has recorded data. Missing or incomplete data is excluded from wellness scoring and trend comparisons rather than interpreted as an observation.`,
    '',
    'RECENT COMPARED WITH BASELINE', delta === null ? 'There are not enough scored observations to compare recent data with baseline.' : `Recent wellness averaged ${recent} points (compared with the ${baseline}-point baseline; ${delta === 0 ? 'no change' : `${Math.abs(delta)} points ${delta > 0 ? 'higher' : 'lower'}`}). Grove Care calculates wellness scores using its proprietary weighted scoring algorithm and only the signals recorded for this person.`,
    '',
    'IMPORTANT STRETCHES OF TIME', ...(observations.length ? significantPeriods : ['There are not enough scored observations yet to identify a sustained stretch.']),
    '',
    'EVENTS AND OBSERVED ASSOCIATIONS', ...(Array.isArray(eventNarrative) ? eventNarrative : [eventNarrative]),
    '',
    'OBSERVATION SUMMARY', checkIns.length === 0
      ? 'No observations were recorded in this range.'
      : careDiscussion
        ? `Difficult observations were noted in ${difficultCheckIns} of ${checkIns.length} check-ins (${percentage(difficultCheckIns, checkIns.length)}%).\n\nReview the sustained periods, event associations, and individual observations with the intended professional or support person.`
        : `Difficult observations were noted in ${difficultCheckIns} of ${checkIns.length} check-ins (${percentage(difficultCheckIns, checkIns.length)}%).\n\nContinue recording meaningful changes and bring new concerns to the intended professional or support person.`,
    '',
    'RECENT CONCERNS NOTICED MOST OFTEN', ...(recentDifficult.length ? recentDifficult.map((item) => `• “${item.name}” was noted in ${item.count} of ${recentCheckIns.length} recent observations (${item.recentRate}%, ${baselineDelta(item.delta)}).`) : ['No difficult signals were recorded recently.']),
    '',
    'RECENT POSITIVE SIGNS NOTICED MOST OFTEN', ...(recentPositive.length ? recentPositive.map((item) => `• “${item.name}” was noted in ${item.count} of ${recentCheckIns.length} recent observations (${item.recentRate}%, ${baselineDelta(item.delta)}).`) : ['No positive signals were recorded recently.']),
    '',
    'DATED NOTES ABOUT EVENTS, MEDICATION, OR INTERVENTIONS', ...(medicationNotes.length ? medicationNotes.slice(0, 8).map((note) => `• ${formatDay(note.date)}: ${note.text}`) : ['None specifically identified. Review the full notes for context.']),
    '',
    'ITEMS ADDED FOR THIS APPOINTMENT', ...(pinnedObservations.length ? pinnedObservations.map((item) => `• ${item.replaceAll('\n', ': ')}`) : ['None added.']),
    'RECENT RAW SCORED OBSERVATIONS', ...(recentObservations.length
      ? recentObservations.map((day) => `• ${formatDay(day.date)}: ${day.score} wellness points · ${day.concernSignals} concern signals · ${day.positiveSignals} positive signals`)
      : ['No scored observations were recorded recently.']),
    '',
    'LIMITATIONS', 'Associations in this report may have other explanations. Entries reflect one caregiver’s observations and may be incomplete. Grove does not determine diagnosis, immediate safety, or the appropriate level of care.',
    '',
    'AI DISCLOSURE', 'This report includes AI-generated language. Grove verifies the displayed values; the language does not diagnose or determine care.',
  ]
  return { text: lines.join('\n'), checkIns, recentCheckIns, difficult, positive, recentDifficult, recentPositive, completeness, baseline, recent, observations, calendarDays, difficultPeriods, positivePeriods, eventNarrative, eventComparisons }
}

export const reportCsv = (person: RawPerson) => {
  const indicators = person.indicators ?? []
  const header = ['date', 'note', ...indicators.map((indicator) => indicator.name)]
  const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const rows = (person.checkIns ?? []).map((checkIn) => {
    const checked = new Set(parseAnswers(checkIn.answersJson).checked)
    return [checkIn.occurredAt, checkIn.note ?? '', ...indicators.map((indicator) => checked.has(indicator.id) ? 'yes' : 'no')]
  })
  return [header, ...rows].map((row) => row.map(quote).join(',')).join('\n')
}
