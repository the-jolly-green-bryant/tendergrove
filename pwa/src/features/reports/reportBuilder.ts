import { parseAnswers } from '../people/checkin/checkInUtils'
import type { RawPerson } from '../patterns/analytics'
import { computeScore } from '../../lib/status'

export interface ProviderReportInput {
  person: RawPerson
  reason: string
  questions: string
  days?: number
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

export const buildProviderReport = ({ person, reason, questions, days = 30 }: ProviderReportInput) => {
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
  const lines = [
    `GROVE CARE APPOINTMENT-PREP SUMMARY — ${person.displayName}`,
    'Personal observations only — not a diagnosis, risk assessment, or recommendation for treatment or hospitalization.',
    '',
    'REASON FOR TRACKING', reason.trim() || 'Not entered.',
    '',
    'DATE RANGE AND COMPLETENESS', `${firstDate} to ${lastDate} · ${checkIns.length} check-ins · ${completeness}% of the selected ${days}-day window had data. Missing days were not treated as good or bad days.`,
    '',
    'BASELINE AND RECENT CHANGE', delta === null ? 'Not enough check-ins to compare an earlier baseline with recent observations.' : `Earlier average ${baseline}/100; recent average ${recent}/100; change ${delta > 0 ? '+' : ''}${delta} points. Scores summarize only the selected signals and their recorded presence.`,
    '',
    'OBSERVATION SUMMARY', checkIns.length === 0
      ? 'No observations were recorded in this range.'
      : careDiscussion
        ? `Difficult observations appeared in ${difficultCheckIns} of ${checkIns.length} check-ins. This record supports discussing continued clinical care and current supports with the treating professional; it does not determine a diagnosis or treatment plan.`
        : `Difficult observations appeared in ${difficultCheckIns} of ${checkIns.length} check-ins. Continue recording meaningful changes and discuss concerns with the treating professional.`,
    '',
    'MOST FREQUENT DIFFICULT SIGNALS', ...(difficult.length ? difficult.map((item) => `• ${item.name}: ${item.count} check-ins`) : ['None recorded in this range.']),
    '',
    'MOST FREQUENT POSITIVE SIGNALS', ...(positive.length ? positive.map((item) => `• ${item.name}: ${item.count} check-ins`) : ['None recorded in this range.']),
    '',
    'NOTABLE EVENTS, MEDICATION, OR INTERVENTION NOTES', ...(medicationNotes.length ? medicationNotes.slice(0, 8).map((note) => `• ${note}`) : ['None specifically identified. Review the full notes for context.']),
    '',
    'QUESTIONS FOR THE PROFESSIONAL', questions.trim() || 'What changes should we watch? What would indicate that urgent evaluation is needed? What information would be most useful to keep recording?',
    '',
    'LIMITATIONS', 'Associations in this report may have other explanations. Entries reflect one caregiver’s observations and may be incomplete. Grove does not determine diagnosis, immediate safety, or the appropriate level of care.',
  ]
  return { text: lines.join('\n'), checkIns, difficult, positive, completeness, baseline, recent }
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
