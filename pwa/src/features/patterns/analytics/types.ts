/**
 * Type definitions for the TenderGrove Patterns analytics layer.
 *
 * Everything here is framed around *well-being* (0–100, where **higher = doing
 * better**), matching the app's existing wellness score in `lib/status.ts`. A
 * higher number always means a better day; a lower number means a harder one.
 *
 * IMPORTANT LANGUAGE RULES (this feature is for overwhelmed caregivers):
 *  - Insights must be human-readable, non-blaming, and non-medical.
 *  - Never imply causation. Prefer: "appears related", "often occurs near",
 *    "may indicate", "seems to coincide", "worth watching".
 *  - Never say: "caused by", "diagnosis", "treatment", or medical conclusions.
 *
 * These types are deliberately plain data (no classes, no framework types) so
 * the analytics functions stay pure and the whole module could later move
 * behind a backend endpoint that returns exactly these shapes. See the notes in
 * `index.ts` for how that migration would look.
 */

/* ------------------------------------------------------------------ */
/*  Shared primitives                                                  */
/* ------------------------------------------------------------------ */

/**
 * A local calendar day key in `YYYY-MM-DD` form. A named alias (rather than
 * bare `string`) so signatures document intent — these are day keys, not
 * arbitrary strings.
 */
// eslint-disable-next-line sonarjs/redundant-type-aliases
export type DateKey = string

/** Indicator sentiment as stored on the `Indicator` model. */
export type Polarity = 'desired' | 'undesired'

/** Person role as stored on the `Person` model. */
export type PersonRole = 'child' | 'parent' | 'spouse' | 'self' | 'caregiver' | 'other'

/**
 * Confidence label attached to every surfaced insight. We only ever show three
 * levels to caregivers so the copy stays reassuring and non-technical. `low`
 * doubles as the "not enough data yet" state — such insights are generally
 * filtered out before display.
 */
export type Confidence = 'low' | 'moderate' | 'high'

/**
 * Well-being bands used by the calendar heatmap, from hardest to best:
 * struggling → mixed → good → thriving.
 */
export type WellbeingLevel = 'struggling' | 'mixed' | 'good' | 'thriving'

/** Direction of a trend over time (well-being rising = improving). */
export type TrendDirection = 'improving' | 'worsening' | 'stable' | 'insufficient'

/* ------------------------------------------------------------------ */
/*  Normalized analytics input                                         */
/* ------------------------------------------------------------------ */
/*
 * The analytics functions never touch the Amplify client or `answersJson`
 * directly. Callers normalize the fetched household data into these shapes
 * first (see `normalizePeople` in `index.ts`). This keeps every function pure,
 * trivially testable, and portable to a backend.
 */

/** An indicator a caregiver tracks for a person. */
export interface AnalyticsIndicator {
  id: string
  name: string
  /** `null` when a caregiver never picked a polarity; such indicators are ignored by scoring. */
  polarity: Polarity | null
  active: boolean
  /** First day this indicator belonged to the checklist, when known. */
  activeFrom?: DateKey
  /** Last day it belonged to the checklist after being archived, when known. */
  activeUntil?: DateKey
}

/** A single check-in with its checked-indicator and event ids already parsed out. */
export interface AnalyticsCheckIn {
  occurredAt: string
  /** Ids of indicators marked as having occurred (from `CheckIn.answersJson.checked`). */
  checkedIndicatorIds: string[]
  /** Ids of life events that occurred (from `CheckIn.answersJson.events`). Context only. */
  eventIds: string[]
}

/** An incident (an `Event` of type `incident`). */
export interface AnalyticsIncident {
  occurredAt: string
  title: string
}

/** All data needed to analyze one person. */
export interface AnalyticsPerson {
  id: string
  displayName: string
  role: PersonRole | null
  avatarUrl?: string | null
  indicators: AnalyticsIndicator[]
  checkIns: AnalyticsCheckIn[]
  incidents: AnalyticsIncident[]
}

/** The full, normalized input to the analytics engine. */
export interface AnalyticsInput {
  people: AnalyticsPerson[]
  lifeEvents: AnalyticsLifeEvent[]
  /** "Now" is injected so every calculation is deterministic and testable. */
  now: Date
  /** How many days back to build the daily score window. */
  windowDays: number
}

/* ------------------------------------------------------------------ */
/*  Daily scores                                                       */
/* ------------------------------------------------------------------ */

/**
 * One person's well-being for one calendar day.
 *
 * `score` is `null` when there is no data for the day (no check-in and no
 * incident). Missing data is never treated as good or bad — it is simply
 * absent, which matters for honest trends and averages.
 */
export interface DailyPersonScore {
  personId: string
  date: DateKey
  /** 0–100 well-being (higher = better), or `null` when the day has no data. */
  score: number | null
  checkInCount: number
  incidentCount: number
  /** Distinct checked indicators with `desired` polarity that day. */
  positiveCount: number
  /** Distinct checked indicators with `undesired` polarity that day. */
  negativeCount: number
  /** True when the day had at least one check-in or incident. */
  hasData: boolean
  eventCount: number
}

/**
 * The household's well-being for one calendar day, aggregated across people.
 *
 * The household score is the *average of each contributing person's daily
 * score* — not a sum of raw check-ins. Collapsing every person to a single
 * daily number first means someone who checks in ten times does not drown out
 * someone who checked in once.
 */
export interface DailyHouseholdScore {
  date: DateKey
  /** Average of contributing person scores, or `null` when nobody had data. */
  score: number | null
  /** How many people contributed a (non-null) score this day. */
  contributingPeople: number
  checkInCount: number
  incidentCount: number
  positiveCount: number
  negativeCount: number
  eventCount: number
}

/* ------------------------------------------------------------------ */
/*  Trends                                                             */
/* ------------------------------------------------------------------ */

/** One point on a trend line, with a trailing rolling average for smoothing. */
export interface TrendPoint {
  date: DateKey
  score: number | null
  /** Trailing rolling average of available scores (null until enough data). */
  rollingAverage: number | null
  eventCount: number
}

/** Result of comparing the most recent 7 days to the previous 7 days. */
export interface TrendResult {
  current7DayAverage: number | null
  previous7DayAverage: number | null
  /** `current - previous`; positive means well-being rose (improving). */
  delta: number | null
  direction: TrendDirection
  /** Full windowed series for charting. */
  points: TrendPoint[]
  confidence: Confidence
}

/* ------------------------------------------------------------------ */
/*  Calendar heatmap                                                   */
/* ------------------------------------------------------------------ */

/** One day cell for the calendar heatmap. */
export interface CalendarDayPattern {
  date: DateKey
  score: number | null
  level: WellbeingLevel | null
  checkInCount: number
  incidentCount: number
  positiveCount: number
  negativeCount: number
  /** Short, non-clinical one-liner for the day (e.g. "A harder day · 2 incidents"). */
  shortSummary: string
}

/* ------------------------------------------------------------------ */
/*  Correlations                                                       */
/* ------------------------------------------------------------------ */

/**
 * A tendency for one tracked signal to appear near another. We compute a
 * simple conditional frequency ("when A happened, how often did B happen
 * within the lag window?") — never a causal claim.
 */
export interface CorrelationInsight {
  /** Human label for the source signal, e.g. "Poor sleep". */
  sourceLabel: string
  sourcePersonId: string
  sourcePersonName: string
  /** Human label for the target signal, e.g. "dysregulation". */
  targetLabel: string
  targetPersonId: string
  targetPersonName: string
  /** How many days after the source the target tends to appear: 0 = same day, 1 = next day. */
  lagDays: 0 | 1
  /** Days where the target appeared within the lag window of the source. */
  occurrences: number
  /** Days where the source appeared (the chances for the target to follow). */
  opportunities: number
  /** occurrences / opportunities, 0–1. */
  ratio: number
  confidence: Confidence
  summary: string
}

/* ------------------------------------------------------------------ */
/*  Relationships                                                      */
/* ------------------------------------------------------------------ */

/** Two aligned well-being series for side-by-side charting. */
export interface RelationshipChartPoint {
  date: DateKey
  aScore: number | null
  bScore: number | null
}

/**
 * How two people's well-being trends move relative to each other. Framed
 * carefully so it never reads as one person being "the cause" of another's
 * hard day.
 */
export interface RelationshipInsight {
  personAId: string
  personAName: string
  personBId: string
  personBName: string
  metric: 'wellbeing'
  /** B compared to A shifted by this many days (0 = same day, 1 = next day). */
  lagDays: 0 | 1
  /** Pearson correlation of the two aligned series, -1..1. */
  correlation: number
  confidence: Confidence
  summary: string
  chartData: RelationshipChartPoint[]
}

/* ------------------------------------------------------------------ */
/*  Turning points                                                     */
/* ------------------------------------------------------------------ */

/** The kind of shift a turning point represents. */
export type TurningPointType =
  | 'sustainedIncrease'
  | 'sustainedDecrease'
  | 'spike'
  | 'recovery'

/** A meaningful, sustained shift in household well-being. */
export interface TurningPointInsight {
  date: DateKey
  type: TurningPointType
  beforeAverage: number
  afterAverage: number
  /** How many days the new level persisted. */
  durationDays: number
  severity: Confidence
  summary: string
}

/* ------------------------------------------------------------------ */
/*  Overview / summaries                                               */
/* ------------------------------------------------------------------ */

/** Emotional tone of an insight, driving its colour/icon. */
export type InsightTone = 'positive' | 'watch' | 'neutral'

/** A single human-readable insight card. */
export interface PatternInsight {
  id: string
  kind: 'weekly' | 'change' | 'trend'
  title: string
  detail: string
  tone: InsightTone
  confidence: Confidence
}

/** A notable recent movement worth mentioning in the weekly observation. */
export interface MovementFact {
  kind: 'incidents-up' | 'harder-since' | 'looking-up'
  /** Friendly date the movement is anchored to (e.g. "Wed, May 7"). */
  dateLabel?: string
}

/** The structured facts a weekly observation sentence is composed from. */
export interface WeeklyFacts {
  direction: TrendDirection
  delta: number | null
  currentAverage: number | null
  /** null = household; otherwise the person the observation is about. */
  subjectName: string | null
  movement: MovementFact | null
}

/** The compact overview shown at the top of the Patterns section. */
export interface OverviewSummary {
  /** The single headline insight for the week. */
  weeklyInsight: PatternInsight
  /** 2–4 noteworthy changes worth a caregiver's attention. */
  noteworthy: PatternInsight[]
  overallTrend: {
    direction: TrendDirection
    current: number | null
    previous: number | null
    summary: string
  }
  confidence: Confidence
}

/* ------------------------------------------------------------------ */
/*  Timing: day-of-week, time-of-day, heatmap, indicator↔outcome       */
/* ------------------------------------------------------------------ */

/** Likelihood of a challenging / positive day for one weekday. */
export interface DayOfWeekBucket {
  /** 0 = Sunday … 6 = Saturday. */
  weekday: number
  label: string
  /** % of scored days of this weekday that were challenging, or null (no data). */
  challengingRate: number | null
  /** % of scored days of this weekday that were positive, or null (no data). */
  positiveRate: number | null
  /** Scored days of this weekday in the window. */
  sampleSize: number
}

/** How incidents distribute across the hours of the day. */
export interface TimeOfDayBucket {
  /** 0–23. */
  hour: number
  count: number
  /** Share of all incidents that fell in this hour (0–100). */
  percentage: number
}

/** One indicator × weekday cell in the heatmap. */
export interface HeatmapCell {
  indicatorId: string
  label: string
  personName: string
  polarity: Polarity
  weekday: number
  /** % of that weekday's check-ins where the indicator occurred, or null. */
  probability: number | null
  sampleSize: number
}

/**
 * A signed relationship between one tracked indicator and overall well-being.
 * Positive means the indicator tends to show up on better days; negative, on
 * harder ones. This is correlation, never causation.
 */
export interface IndicatorOutcomeCorrelation {
  indicatorId: string
  label: string
  personName: string
  polarity: Polarity
  /** Pearson correlation with the daily well-being score, -1..1. */
  correlation: number
  confidence: Confidence
  sampleSize: number
  /** Non-causal, human-readable summary. */
  summary: string
}

/** Timing analytics for a scope (household or one person). */
export interface TimingAnalysis {
  dayOfWeek: DayOfWeekBucket[]
  timeOfDay: TimeOfDayBucket[]
  totalIncidents: number
  heatmap: HeatmapCell[]
  indicatorCorrelations: IndicatorOutcomeCorrelation[]
}

/**
 * How a life event (School, Therapy, …) lines up with well-being. Negative
 * correlation = the event tends to fall on harder days. Correlation, never
 * causation. The event's label lives in the LifeEvent pool, so the UI maps
 * `eventId` → label for display.
 */
export interface EventImpact {
  eventId: string
  /** Pearson correlation of the event's daily presence with well-being, -1..1. */
  correlation: number
  confidence: Confidence
  /** Days that had a check-in and so could be measured. */
  sampleSize: number
}

/**
 *
 */
export interface AnomalyBaseline {
  medianScore: number
  thresholdScore: number
  anomalousDays: number
  scoredDays: number
}

/**
 *
 */
export interface AnomalyRateItem {
  id: string
  label: string
  /** Whether the association clears the repeated-pattern threshold or is early. */
  evidence?: 'repeated' | 'early'

  /** Percentage of signal-present days that were harder than usual. */
  anomalyRate: number

  /** Percentage of signal-absent days that were harder than usual. */
  typicalRate: number

  /** Number of harder-than-usual days when the signal was present. */
  anomalyOccurrences: number

  /** Number of measurable days when the signal was present. */
  anomalyOpportunities: number

  /** Number of harder-than-usual days when the signal was absent. */
  typicalOccurrences: number

  /** Number of measurable days when the signal was absent. */
  typicalOpportunities: number
}

/**
 *
 */
export interface AnomalyWeekdayBucket {
  weekday: number
  label: string
  anomalyRate: number | null
  anomalousDays: number
  scoredDays: number
}

/**
 *
 */
export interface AnomalyWeekdayPattern {
  weekday: number
  label: string
  anomalyRate: number
  otherDaysRate: number
  sampleSize: number
  buckets: AnomalyWeekdayBucket[]
}

/**
 *
 */
export interface AnomalyEventPattern {
  top: AnomalyRateItem
  items: AnomalyRateItem[]
}

/**
 *
 */
export interface AnomalyOtherPersonItem extends AnomalyRateItem {
  personId: string
  personName: string
  kind: 'behavior' | 'incident' | 'severity'
}

/**
 *
 */
export interface AnomalyOtherPeoplePattern {
  top: AnomalyOtherPersonItem
  items: AnomalyOtherPersonItem[]
}

/**
 *
 */
export interface AnomalyPatterns {
  baseline: AnomalyBaseline | null
  weekday: AnomalyWeekdayPattern | null
  events: AnomalyEventPattern | null
  otherPeople: AnomalyOtherPeoplePattern | null
}

/**
 *
 */
export interface AnalyticsLifeEvent {
  id: string
  label: string
}

/** Direction + how long the current well-being trend has held. */
export type TrendStatusState =
  | 'improving'
  | 'worsening'
  | 'steady-good'
  | 'steady-hard'
  | 'steady-mixed'
  | 'insufficient'

/** A plain-language read on which way things are going, and for how long. */
export interface TrendStatus {
  state: TrendStatusState
  /** How many days the current state has held. */
  days: number
  currentAverage: number | null
  summary: string
}

/* ------------------------------------------------------------------ */
/*  Generated insights                                                 */
/* ------------------------------------------------------------------ */

/** Icon hint for a generated insight card. */
export type InsightIcon = 'moon' | 'calendar' | 'leaf' | 'heart' | 'sparkle' | 'alert'

/** A plain-language, generated conclusion for the Insights page. */
export interface GeneratedInsight {
  id: string
  title: string
  description: string
  /** Lower sorts first (most actionable first). */
  priority: number
  icon: InsightIcon
  tone: InsightTone
  confidence: Confidence
}

/* ------------------------------------------------------------------ */
/*  Data quality                                                       */
/* ------------------------------------------------------------------ */

/**
 * Honest reporting of how much data backs the analytics. Small datasets get a
 * low-confidence, gently worded result rather than confident nonsense.
 */
export interface DataQuality {
  hasEnoughData: boolean
  /** Days in the window that had at least one scoreable person. */
  scoredDays: number
  totalPeople: number
  peopleWithData: number
  /** Friendly copy explaining the current data state. */
  message: string
}

/* ------------------------------------------------------------------ */
/*  Top-level result                                                   */
/* ------------------------------------------------------------------ */

/** A lightweight person descriptor used by UI filters. */
export interface AnalyticsPersonRef {
  id: string
  displayName: string
  role: PersonRole | null
  avatarUrl?: string | null
}

export interface IndicatorOverlap {
  sourcePersonId: string
  sourcePersonName: string
  sourceIndicatorId: string
  sourceIndicatorName: string
  polarity: Polarity
  sourceAvatarUrl?: string | null
  targetPersonId: string
  targetPersonName: string
  targetIndicatorId: string
  targetIndicatorName: string
  targetAvatarUrl?: string | null
  overlapDays: number
}

export interface IndicatorSignal {
  personId: string
  personName: string
  avatarUrl?: string | null
  indicatorId: string
  indicatorName: string
  polarity: Polarity
}

/** Everything the Patterns pages need, computed in one deterministic pass. */
export interface AnalyticsResult {
  window: { startDate: DateKey; endDate: DateKey; days: number }
  dataQuality: DataQuality
  people: AnalyticsPersonRef[]
  householdDailyScores: DailyHouseholdScore[]
  personDailyScores: Record<string, DailyPersonScore[]>
  householdTrend: TrendResult
  personTrends: Record<string, TrendResult>
  calendar: CalendarDayPattern[]
  correlations: CorrelationInsight[]
  relationships: RelationshipInsight[]
  turningPoints: TurningPointInsight[]
  overview: OverviewSummary
  personAnomalyPatterns: Record<string, AnomalyPatterns>
  indicatorOverlaps: IndicatorOverlap[]
  indicatorSignals: IndicatorSignal[]
  /** Household timing (day-of-week, time-of-day, heatmap, indicator↔outcome). */
  timing: TimingAnalysis
  /** Timing per person, keyed by person id. */
  personTiming: Record<string, TimingAnalysis>
  /** Event↔well-being correlations across the household. */
  eventImpacts: EventImpact[]
  /** Event↔well-being correlations per person, keyed by person id. */
  personEventImpacts: Record<string, EventImpact[]>
  /** Generated, plain-language insights for the household. */
  generatedInsights: GeneratedInsight[]
  /** Generated insights per person, keyed by person id. */
  personGeneratedInsights: Record<string, GeneratedInsight[]>
}
