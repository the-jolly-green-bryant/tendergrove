import {
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
} from '@ionic/react'
import { chevronForwardOutline, homeOutline } from 'ionicons/icons'
import React, { useState } from 'react'
import { useHistory } from 'react-router-dom'

import { PersonAvatar } from '../../components/PersonAvatar'
import { toLocalDateKey } from '../../lib/dateKeys'
import { PatternsEmptyState } from './components/PatternsEmptyState'
import { PeriodSelector } from './components/PeriodSelector'
import { TrendChart } from './components/TrendChart'
import { buildTrendChart } from './components/trendSeries'
import { usePatternsAnalytics } from './usePatternsAnalytics'
import { usePatternsFilterStore } from './patternsFilterStore'

import './patterns.scss'
import { AnomalyPatternsSection } from './components/AnomalyPatternsSection'

import {
  buildPersonView,
  type AnomalyPatterns,
  type CorrelationInsight,
  type TrendResult,
} from './analytics'

type Scope = 'person' | 'household'

interface ScopedData {
  trend: TrendResult
  correlations: CorrelationInsight[]
  scoredDays: number
  anomalyPatterns: AnomalyPatterns | null
  subjectName: string | null
}

const currentTrendColor = (trend: TrendResult): string => {
  const rollingScores = trend.points
    .map((point) => point.rollingAverage)
    .filter((score): score is number => score !== null)

  if (rollingScores.length < 2) return 'var(--ion-color-danger)'

  const currentScore = rollingScores.at(-1)!
  const historicalScores = rollingScores.slice(0, -1)
  const historicalMean =
    historicalScores.reduce((sum, score) => sum + score, 0) /
    historicalScores.length

  return currentScore >= historicalMean
    ? 'var(--ion-color-success-shade)'
    : 'var(--ion-color-danger)'
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
  viewDate,
}: {
  readonly data: ScopedData
  readonly rangeDays: number
  readonly onRangeChange: (days: number) => void
  readonly onScopeChange: (scope: Scope) => void
  readonly onViewAll: () => void
  readonly personAvatarUrl?: string | null
  readonly personName: string
  readonly scope: Scope
  readonly viewDate: Date
}): React.JSX.Element => {
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
  const eligiblePoints = data.trend.points.filter(
    (point) => point.date <= chartEndDate,
  )
  const visiblePoints = eligiblePoints.slice(-rangeDays)
  const chart = buildTrendChart(
    visiblePoints,
    false,
    currentTrendColor({ ...data.trend, points: eligiblePoints }),
  )

  return (
    <>
      <div className={'pattern-chart__container'}>
        <TrendChart
          dates={chart.dates}
          series={chart.series}
          clampTo={chart.clampTo}
          eventCounts={visiblePoints.map((point) => point.eventCount)}
        />

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
              <span className="person-patterns__scope-avatar-wrap">
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
      </div>

      {data.subjectName && data.anomalyPatterns && (
        <AnomalyPatternsSection
          personName={data.subjectName}
          patterns={data.anomalyPatterns}
        />
      )}

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
}: {
  readonly personId: string
  readonly personName: string
  readonly personAvatarUrl?: string | null
  readonly viewDate: Date
}): React.JSX.Element | null => {
  const [scope, setScope] = useState<Scope>('person')
  const [rangeDays, setRangeDays] = useState(30)
  const { result, isLoading, hasError } = usePatternsAnalytics(viewDate)
  const history = useHistory()

  const setPerson = usePatternsFilterStore((s) => s.setPerson)

  // The main Person page already surfaces loading/errors; stay quiet here.
  if (isLoading || hasError || !result) return null

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
        viewDate={viewDate}
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
