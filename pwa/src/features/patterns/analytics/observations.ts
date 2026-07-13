/**
 * The "voice" of the analytics — the plain-language observations a caregiver
 * reads (the weekly headline and the trend summary line). Kept separate from
 * the number-crunching so the phrasing can evolve independently, and so it's a
 * single clean seam if we ever want a language model to speak these instead.
 *
 * ── Swapping in a language model ─────────────────────────────────────────────
 * These functions take plain FACTS and return prose, deterministically. To have
 * an LLM narrate them (so they sound even more like a person wrote them),
 * replace `composeWeeklyObservation` with an async call that sends the same
 * `WeeklyFacts` to the model with a caregiver-tone system prompt, and thread the
 * awaited string through `buildOverview`. Everything upstream already produces
 * the structured facts an LLM would need — no other change required. We keep a
 * deterministic version here as the always-available fallback (and so nothing
 * needs a network call or API key to work).
 *
 * Wording rules hold: warm, non-blaming, non-medical, never causal.
 */

import type { MovementFact, TrendDirection, WeeklyFacts } from './types'

const pick = (variants: string[], seed: number): string => {
  const index = Math.abs(Math.round(seed)) % variants.length
  return variants[index]
}

const magnitudeWord = (delta: number | null): string => {
  if (delta === null) return ''
  return Math.abs(delta) < 10 ? 'a little ' : ''
}

const forWhom = (subjectName: string | null): string => {
  return subjectName ? ` for ${subjectName}` : ''
}

const openingLine = (facts: WeeklyFacts): string => {
  const who = forWhom(facts.subjectName)
  const seed = facts.delta ?? facts.currentAverage ?? 0
  const soft = magnitudeWord(facts.delta)

  if (facts.direction === 'insufficient') {
    return pick(
      [
        `There isn’t quite enough logged yet to tell which way things are heading${who}`,
        `It’s still early — a bit more check-in history will show the trend${who}`,
      ],
      seed,
    )
  }
  if (facts.direction === 'stable') {
    return pick(
      [
        `This week has felt about the same as last${who}`,
        `Things have held fairly steady this week${who}`,
      ],
      seed,
    )
  }
  if (facts.direction === 'improving') {
    return pick(
      [
        `Things are looking ${soft}brighter than last week${who}`,
        `This week has felt ${soft}easier than last${who}`,
      ],
      seed,
    )
  }
  return pick(
    [
      `This week has been ${soft}harder than last${who}`,
      `Things have felt ${soft}heavier than last week${who}`,
    ],
    seed,
  )
}

const movementLine = (movement: MovementFact, seed: number): string => {
  const when = movement.dateLabel ? ` since ${movement.dateLabel}` : ''
  const after = movement.dateLabel ? ` after ${movement.dateLabel}` : ''
  if (movement.kind === 'incidents-up') {
    return pick(
      [`incidents crept up${after}`, `there were a few more incidents${after}`],
      seed,
    )
  }
  if (movement.kind === 'harder-since') {
    return pick(
      [`things have felt heavier${when}`, `the days have been harder${when}`],
      seed,
    )
  }
  return pick(
    [`things have been looking up${when}`, `the days have felt lighter${when}`],
    seed,
  )
}

export const composeWeeklyObservation = (facts: WeeklyFacts): string => {
  const seed = facts.delta ?? facts.currentAverage ?? 0
  const opening = openingLine(facts)
  if (!facts.movement) return `${opening}.`

  const movement = movementLine(facts.movement, seed)
  // Contrast ("but") when the movement pulls against a positive/steady week;
  // otherwise flow with "and".
  const positiveWeek = facts.direction === 'improving' || facts.direction === 'stable'
  const movementIsNegative =
    facts.movement.kind === 'incidents-up' || facts.movement.kind === 'harder-since'
  const joiner = positiveWeek && movementIsNegative ? ', though ' : ', and '
  return `${opening}${joiner}${movement}.`
}

export const composeTrendSummary = (
  direction: TrendDirection,
  subjectName: string | null,
): string => {
  const subject = subjectName ? `${subjectName}'s` : 'Household'
  if (direction === 'improving') return `${subject} well-being is trending up`
  if (direction === 'worsening') return `${subject} well-being is trending down`
  if (direction === 'stable') return `${subject} well-being is holding steady`
  return 'Still gathering enough to call a direction'
}
