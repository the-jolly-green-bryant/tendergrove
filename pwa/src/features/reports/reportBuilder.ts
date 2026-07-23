import { parseAnswers } from '../people/checkin/checkInUtils'
import type { RawLifeEvent, RawPerson } from '../patterns/analytics'
import { computeScore, STATUS_THRESHOLDS } from '../../lib/status'

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

const averageScore = (person: RawPerson, checkIns: NonNullable<RawPerson['checkIns']>) => {
  const indicators = (person.indicators ?? []).filter((indicator) => indicator.active !== false)
  if (!indicators.length || !checkIns.length) return null
  const scores = checkIns
    .map((checkIn) => computeScore(indicators, checkIn))
    .filter((score): score is number => score !== null)
  if (!scores.length) return null
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
}

export interface ReportDay {
  date: string
  score: number
  level: 'steady' | 'watch' | 'concern'
  concernSignals: number
  positiveSignals: number
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

export const buildProviderReport = ({ person, reason, questions, days = 30, pinnedObservations = [], lifeEvents = [] }: ProviderReportInput) => {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days + 1)
  cutoff.setHours(0, 0, 0, 0)
  const checkIns = [...(person.checkIns ?? [])].filter((item) => new Date(item.occurredAt) >= cutoff).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
  const difficult = frequencyLines({ ...person, checkIns }, 'undesired')
  const positive = frequencyLines({ ...person, checkIns }, 'desired')
  const midpoint = Math.ceil(checkIns.length / 2)
  const baseline = averageScore(person, checkIns.slice(0, midpoint))
  const recent = averageScore(person, checkIns.slice(midpoint))
  const delta = baseline !== null && recent !== null ? recent - baseline : null
  const notes = checkIns.map((item) => item.note?.trim()).filter((note): note is string => Boolean(note))
  const medicationNotes = notes.filter((note) => /medicat|dose|therapy|hospital|doctor|intervention|appointment/i.test(note))
  const difficultIds = new Set((person.indicators ?? []).filter((indicator) => indicator.active !== false && indicator.polarity === 'undesired').map((indicator) => indicator.id))
  const difficultCheckIns = checkIns.filter((checkIn) => parseAnswers(checkIn.answersJson).checked.some((id) => difficultIds.has(id))).length
  const careDiscussion = difficultCheckIns >= 2 || medicationNotes.length > 0
  const firstDate = checkIns[0] ? new Date(checkIns[0].occurredAt).toLocaleDateString() : 'No check-ins yet'
  const lastDate = checkIns.at(-1) ? new Date(checkIns.at(-1)!.occurredAt).toLocaleDateString() : 'No check-ins yet'
  const completeness = Math.round((new Set(checkIns.map((item) => new Date(item.occurredAt).toDateString())).size / days) * 100)
  const observations = dailyScores(person, checkIns)
  const difficultPeriods = findPeriods(observations, 'difficult')
  const positivePeriods = findPeriods(observations, 'positive')
  const concernDays = observations.filter((day) => day.level === 'concern').length
  const steadyDays = observations.filter((day) => day.level === 'steady').length
  const significantPeriods = [
    ...(difficultPeriods[0]?.days >= 2 ? [`For ${difficultPeriods[0].days} days in a row—from ${formatDay(difficultPeriods[0].start)} through ${formatDay(difficultPeriods[0].end)}—the recorded observations remained in the concern range. A stretch this long can be difficult to sustain and should not be obscured by better days before or after it.`] : []),
    ...(positivePeriods[0]?.days >= 2 ? [`The clearest positive stretch lasted ${positivePeriods[0].days} days, from ${formatDay(positivePeriods[0].start)} through ${formatDay(positivePeriods[0].end)}.`] : []),
    `Across the ${observations.length} scored days, ${concernDays} were in the concern range, ${observations.length - concernDays - steadyDays} were in the watch range, and ${steadyDays} were steady.`,
  ]
  const eventLabels = new Map(lifeEvents.map((event) => [event.id, event.label?.trim() || 'Event']))
  const passOrVisitIds = new Set(lifeEvents.filter((event) => /pass|visit/i.test(event.label ?? '')).map((event) => event.id))
  const eventDays = new Set(checkIns.filter((checkIn) => parseAnswers(checkIn.answersJson).events.some((id) => passOrVisitIds.has(id))).map((checkIn) => dateKey(checkIn.occurredAt)))
  const onEvent = observations.filter((day) => eventDays.has(day.date))
  const offEvent = observations.filter((day) => !eventDays.has(day.date))
  const mean = (values: ReportDay[]) => values.length ? Math.round(values.reduce((sum, day) => sum + day.score, 0) / values.length) : null
  const eventAverage = mean(onEvent)
  const usualAverage = mean(offEvent)
  const eventConcern = onEvent.filter((day) => day.level === 'concern').length
  const eventNames = [...new Set(checkIns.flatMap((checkIn) => parseAnswers(checkIn.answersJson).events).filter((id) => passOrVisitIds.has(id)).map((id) => eventLabels.get(id) ?? 'Pass or visit'))]
  const eventPhrase = eventNames.map((name) => {
    if (/pass.*overnight|overnight.*pass/i.test(name)) return 'an overnight pass'
    if (/pass.*day|day.*pass/i.test(name)) return 'a day pass'
    return name.toLowerCase()
  }).join(' or ')
  const eventNarrative = onEvent.length >= 2 && offEvent.length >= 2 && eventAverage !== null && usualAverage !== null
    ? eventAverage < usualAverage
      ? `On ${onEvent.length} recorded days with ${eventPhrase}, the average score was ${eventAverage}/100, compared with ${usualAverage}/100 on other recorded days. ${eventConcern} of those ${onEvent.length} days were in the concern range. In this record, passes or visits line up with days that were harder than usual; the pattern appears difficult to sustain without continued clinical care and practical support.`
      : `There were ${onEvent.length} recorded pass or visit days. Their average score was ${eventAverage}/100, compared with ${usualAverage}/100 on other recorded days. This set does not yet show pass or visit days as consistently harder, so the context should continue to be recorded and reviewed.`
    : 'There are not yet enough scored pass or visit days to compare them reliably with other recorded days.'
  const lines = [
    `GROVE CARE APPOINTMENT-PREP SUMMARY — ${person.displayName}`,
    'Personal observations only — not a diagnosis, risk assessment, or recommendation for treatment or hospitalization.',
    '',
    'REASON FOR TRACKING', reason.trim() || 'Not entered.',
    '',
    'DATE RANGE AND COMPLETENESS', `${firstDate} to ${lastDate} · ${checkIns.length} check-ins · ${completeness}% of the selected ${days}-day window had data. Missing days were not treated as good or bad days.`,
    '',
    'WHAT CHANGED OVER TIME', delta === null ? 'There are not enough check-ins yet to compare the earlier and more recent parts of this period.' : `The earlier part of this period averaged ${baseline}/100. The more recent part averaged ${recent}/100, a ${Math.abs(delta)}-point ${delta >= 0 ? 'increase' : 'decrease'}. These scores summarize only the signals that were selected in Grove.`,
    '',
    'IMPORTANT STRETCHES OF TIME', ...(observations.length ? significantPeriods : ['There are not enough scored days yet to identify a sustained stretch.']),
    '',
    'PASSES, VISITS, AND OTHER CONTEXT', eventNarrative,
    '',
    'OBSERVATION SUMMARY', checkIns.length === 0
      ? 'No observations were recorded in this range.'
      : careDiscussion
        ? `Difficult observations were noted in ${difficultCheckIns} of ${checkIns.length} check-ins. Taken together with the sustained difficult periods above, this record supports continued clinical care and a discussion of whether current supports are sufficient.`
        : `Difficult observations were noted in ${difficultCheckIns} of ${checkIns.length} check-ins. Continue recording meaningful changes and bring new concerns to the treating professional.`,
    '',
    'CONCERNS NOTICED MOST OFTEN', ...(difficult.length ? difficult.map((item) => `${item.name} was noted in ${item.count} of ${checkIns.length} check-ins.`) : ['No difficult signals were recorded in this period.']),
    '',
    'POSITIVE SIGNS NOTICED MOST OFTEN', ...(positive.length ? positive.map((item) => `${item.name} was noted in ${item.count} of ${checkIns.length} check-ins.`) : ['No positive signals were recorded in this period.']),
    '',
    'NOTABLE EVENTS, MEDICATION, OR INTERVENTION NOTES', ...(medicationNotes.length ? medicationNotes.slice(0, 8).map((note) => `• ${note}`) : ['None specifically identified. Review the full notes for context.']),
    '',
    'ITEMS ADDED FOR THIS APPOINTMENT', ...(pinnedObservations.length ? pinnedObservations.map((item) => `• ${item.replaceAll('\n', ' — ')}`) : ['None added.']),
    '',
    'QUESTIONS FOR THE PROFESSIONAL', questions.trim() || 'What changes should we watch? What would indicate that urgent evaluation is needed? What information would be most useful to keep recording?',
    '',
    'LIMITATIONS', 'Associations in this report may have other explanations. Entries reflect one caregiver’s observations and may be incomplete. Grove does not determine diagnosis, immediate safety, or the appropriate level of care.',
  ]
  return { text: lines.join('\n'), checkIns, difficult, positive, completeness, baseline, recent, observations, difficultPeriods, positivePeriods, eventNarrative }
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
