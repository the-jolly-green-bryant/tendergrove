import { IonButton, IonIcon, IonSegment, IonSegmentButton } from '@ionic/react'
import {
  chevronForwardOutline,
  homeOutline,
  settingsOutline,
} from 'ionicons/icons'
import React, { useRef, useState } from 'react'
import { useHistory } from 'react-router-dom'

import { PersonAvatar } from '../../components/PersonAvatar'
import { LoadingState } from '../../components/LoadingState'
import { toLocalDateKey } from '../../lib/dateKeys'
import { PatternsEmptyState } from './components/PatternsEmptyState'
import { PeriodSelector } from './components/PeriodSelector'
import { TrendChartPanel } from './components/TrendChartPanel'
import { comparisonColor, TrendComparisonMenu } from './components/TrendComparisonMenu'
import { usePatternsAnalytics } from './usePatternsAnalytics'
import { usePatternsFilterStore } from './patternsFilterStore'

import './patterns.scss'
import { AnomalyPatternsSection } from './components/AnomalyPatternsSection'
import { PatternStrainSummaryCard } from './components/PatternStrainSummaryCard'

import {
  buildPersonView,
  type AnomalyPatterns,
  type CorrelationInsight,
  type TrendResult,
  type AnalyticsPersonRef,
  type PatternDynamics,
  type PatternDynamicsDay,
} from './analytics'

type Scope = 'person' | 'household'

interface ScopedData {
  trend: TrendResult
  correlations: CorrelationInsight[]
  scoredDays: number
  anomalyPatterns: AnomalyPatterns | null
  subjectName: string | null
}

const PatternsBody = ({
  data,
  rangeDays,
  onRangeChange,
  onScopeChange,
  onViewAll,
  personAvatarUrl,
  personName,
  scope,
  showDelta,
  onToggleDelta,
  viewDate,
  comparisonPeople,
  personTrends,
  onExplore,
  patternDynamics,
  patternStrainDays,
}: {
  readonly data: ScopedData
  readonly rangeDays: number
  readonly onRangeChange: (days: number) => void
  readonly onScopeChange: (scope: Scope) => void
  readonly onViewAll: () => void
  readonly personAvatarUrl?: string | null
  readonly personName: string
  readonly scope: Scope
  readonly showDelta: boolean
  readonly onToggleDelta: () => void
  readonly viewDate: Date
  readonly comparisonPeople: AnalyticsPersonRef[]
  readonly personTrends: Record<string, TrendResult>
  readonly onExplore: (tab: 'trend' | 'calendar' | 'household') => void
  readonly patternDynamics: PatternDynamics
  readonly patternStrainDays: PatternDynamicsDay[]
}): React.JSX.Element => {
  const [comparisonIds, setComparisonIds] = useState<string[]>([])
  const [showStrain, setShowStrain] = useState(false)
  const comparisonMenuRef = useRef<HTMLIonMenuElement>(null)
  const comparisons = comparisonIds.flatMap((personId) => {
    const person = comparisonPeople.find((item) => item.id === personId)
    const trend = personTrends[personId]
    return person && trend
      ? [
          {
            id: person.id,
            label: person.displayName,
            color: comparisonColor(person.id),
            points: trend.points,
          },
        ]
      : []
  })
  const toggleComparison = (personId: string) =>
    setComparisonIds((current) =>
      current.includes(personId)
        ? current.filter((id) => id !== personId)
        : [...current, personId],
    )

  if (data.scoredDays === 0) {
    return (
      <PatternsEmptyState
        title="Patterns are still taking shape"
        message="Keep logging daily check-ins and a trend and any connections will appear here."
      />
    )
  }

  // Rolling averages and summary stats are computed over the full analytics
  // lookback. Only trim the points handed to the chart.
  // A historical person page should show the period ending on that historical
  // date, rather than silently jumping the chart back to today. This also makes
  // imported older check-ins visible when their date card is being reviewed.
  const chartEndDate = toLocalDateKey(viewDate)
  const eligiblePoints = data.trend.points.filter((point) => point.date <= chartEndDate)

  return (
    <>
      <TrendChartPanel
        points={eligiblePoints}
        rangeDays={rangeDays}
        showDelta={showDelta}
        showStrain={showStrain}
        patternStrainDays={patternStrainDays}
        patternStrainEndDate={chartEndDate}
        comparisons={comparisons}
        action={
          <div className="pattern-chart__actions">
            <button
              type="button"
              className={`pattern-chart__settings${comparisonIds.length > 0 || showDelta || showStrain ? ' pattern-chart__settings--active' : ''}`}
              aria-label="Trend settings"
              onClick={() => void comparisonMenuRef.current?.open()}
            >
              <IonIcon
                icon={settingsOutline}
                aria-hidden="true"
              />
            </button>
          </div>
        }
        controls={
          <div className="person-patterns__chart-controls">
            <div className="person-patterns__period">
              <PeriodSelector
                value={rangeDays}
                onChange={onRangeChange}
              />
            </div>
            <IonSegment
              className="person-patterns__scope-toggle"
              value={scope}
              aria-label="Chart scope"
              onIonChange={(event) =>
                onScopeChange((event.detail.value as Scope) ?? 'person')
              }
            >
              <IonSegmentButton
                value="person"
                aria-label={`${personName} scope`}
              >
                <span
                  className={`person-patterns__scope-avatar-wrap person-patterns__scope-avatar-wrap--${patternDynamics.band}`}
                >
                  <PersonAvatar
                    className="person-patterns__scope-avatar"
                    name={personName}
                    src={personAvatarUrl}
                  />
                </span>
              </IonSegmentButton>
              <IonSegmentButton
                value="household"
                aria-label="Household scope"
              >
                <IonIcon icon={homeOutline} />
              </IonSegmentButton>
            </IonSegment>
          </div>
        }
      />
      <TrendComparisonMenu
        menuRef={comparisonMenuRef}
        people={comparisonPeople}
        selectedIds={comparisonIds}
        onToggle={toggleComparison}
        showDelta={showDelta}
        onToggleDelta={onToggleDelta}
        showStrain={showStrain}
        onToggleStrain={() => setShowStrain((current) => !current)}
      />

      {data.subjectName && data.anomalyPatterns && (
        <AnomalyPatternsSection
          personName={data.subjectName}
          patterns={data.anomalyPatterns}
          onExplore={onExplore}
        />
      )}

      <PatternStrainSummaryCard dynamics={patternDynamics} />

      <IonButton
        className="person-patterns__view-all"
        expand="block"
        fill="clear"
        onClick={onViewAll}
      >
        View all patterns
        <IonIcon
          slot="end"
          icon={chevronForwardOutline}
        />
      </IonButton>
    </>
  )
}

export const PersonPatternsSection = ({
  personId,
  personName,
  personAvatarUrl,
  viewDate,
  patternDynamics,
}: {
  readonly personId: string
  readonly personName: string
  readonly personAvatarUrl?: string | null
  readonly viewDate: Date
  readonly patternDynamics: PatternDynamics
}): React.JSX.Element | null => {
  const [scope, setScope] = useState<Scope>('person')
  const [rangeDays, setRangeDays] = useState(90)
  const [showDelta, setShowDelta] = useState(false)
  const { result, isLoading, hasError } = usePatternsAnalytics(viewDate)
  const history = useHistory()

  const setPerson = usePatternsFilterStore((s) => s.setPerson)

  if (isLoading) {
    return (
      <section className="patterns-section person-patterns">
        <LoadingState
          variant="chart"
          label="Loading person patterns"
        />
      </section>
    )
  }
  if (hasError || !result) return null

  const personView = buildPersonView(result, personId)
  const scoped = scope === 'person'
  const data: ScopedData = {
    trend: scoped ? personView.trend : result.householdTrend,
    correlations: (scoped ? personView : result).correlations,
    scoredDays: (scoped ? personView : result.dataQuality).scoredDays,
    // Scope changes the graph only. Pattern cards stay anchored to the person
    // whose page is being viewed.
    anomalyPatterns: personView.anomalyPatterns,
    subjectName: personName,
  }
  const strainSource = scoped
    ? (result.personDailyScores[personId] ?? [])
    : result.householdDailyScores
  const patternStrainDays: PatternDynamicsDay[] = strainSource.map((day) => ({
    date: day.date,
    score: day.score,
    challengeCount: day.negativeCount,
    positiveCount: day.positiveCount,
    hasChallenges: day.negativeCount > 0,
    hasPositiveSigns: day.positiveCount > 0,
  }))

  return (
    <section className="patterns-section person-patterns">
      <PatternsBody
        data={data}
        rangeDays={rangeDays}
        onRangeChange={setRangeDays}
        onScopeChange={setScope}
        personAvatarUrl={personAvatarUrl}
        personName={personName}
        scope={scope}
        showDelta={showDelta}
        onToggleDelta={() => setShowDelta((current) => !current)}
        viewDate={viewDate}
        comparisonPeople={result.people.filter((person) => person.id !== personId)}
        personTrends={result.personTrends}
        patternDynamics={patternDynamics}
        patternStrainDays={patternStrainDays}
        onExplore={(tab) => {
          setPerson(personId)
          history.push(`/patterns?tab=${tab}`)
        }}
        onViewAll={() => {
          // Carry the current scope into the Patterns section so it opens
          // pre-filtered to this person (or the whole household).
          setPerson(scoped ? personId : null)
          history.push('/patterns')
        }}
      />
    </section>
  )
}
