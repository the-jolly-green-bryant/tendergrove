import { parseAnswers } from '../features/people/checkin/checkInUtils'

/* ------------------------------------------------------------------ */
/*  Thresholds — single place to tune; nothing is hard-coded elsewhere */
/* ------------------------------------------------------------------ */

export const STATUS_THRESHOLDS = {
    good: 80,
    trouble: 60,
} as const

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type StatusLevel = 'good' | 'trouble' | 'at-risk' | 'unknown'

export interface Status {
    /** 0 – 100 score (100 = perfect day). `null` when we can't compute. */
    score: number | null
    level: StatusLevel
    label: string
    color: 'success' | 'warning' | 'danger' | 'medium'
}

interface IndicatorLike {
    id: string
    polarity: string
    active?: boolean | null
}

interface CheckInLike {
    answersJson?: unknown
}

/* ------------------------------------------------------------------ */
/*  Core scoring                                                       */
/* ------------------------------------------------------------------ */

/**
 * Compute a 0–100 day-quality score from a single check-in.
 *
 * For every active indicator we ask: "Did something *good* happen?"
 *   • desired   + checked   → positive  (good)
 *   • desired   + unchecked → negative  (bad — we wanted it but didn't see it)
 *   • undesired + checked   → negative  (bad — we saw something we didn't want)
 *   • undesired + unchecked → positive  (good — the bad thing didn't happen)
 *
 * score = positives / total × 100
 */
export function computeScore(
    indicators: IndicatorLike[],
    checkIn: CheckInLike,
): number | null {
    const active = indicators.filter((i) => i.active !== false)
    if (active.length === 0) return null

    const checked = new Set(parseAnswers(checkIn.answersJson).checked)

    let positives = 0
    for (const ind of active) {
        const wasChecked = checked.has(ind.id)
        const isDesired = ind.polarity === 'desired'

        if ((isDesired && wasChecked) || (!isDesired && !wasChecked)) {
            positives++
        }
    }

    return Math.round((positives / active.length) * 100)
}

/* ------------------------------------------------------------------ */
/*  Level / label derivation                                           */
/* ------------------------------------------------------------------ */

export function levelFromScore(score: number): StatusLevel {
    if (score >= STATUS_THRESHOLDS.good) return 'good'
    if (score >= STATUS_THRESHOLDS.trouble) return 'trouble'
    return 'at-risk'
}

const levelMeta: Record<StatusLevel, { label: string; color: Status['color'] }> = {
    good: { label: 'Good Day', color: 'success' },
    trouble: { label: 'Trouble', color: 'warning' },
    'at-risk': { label: 'At Risk', color: 'danger' },
    unknown: { label: 'No data', color: 'medium' },
}

export function statusFromScore(score: number | null): Status {
    if (score === null) {
        return { score: null, level: 'unknown', ...levelMeta.unknown }
    }
    const level = levelFromScore(score)
    return { score, level, ...levelMeta[level] }
}

/* ------------------------------------------------------------------ */
/*  Convenience: derive status for a person given their data           */
/* ------------------------------------------------------------------ */

export function derivePersonStatus(
    indicators: IndicatorLike[],
    checkIn: CheckInLike | undefined,
): Status {
    if (!checkIn) {
        return { score: null, level: 'unknown', ...levelMeta.unknown }
    }
    return statusFromScore(computeScore(indicators, checkIn))
}
