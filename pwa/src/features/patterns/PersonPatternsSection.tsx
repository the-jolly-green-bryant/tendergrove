import {
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
} from '@ionic/react'
import { homeOutline } from 'ionicons/icons'
import React, { useState } from 'react'
import { useHistory } from 'react-router-dom'

import { PersonAvatar } from '../../components/PersonAvatar'
import { PatternsEmptyState } from './components/PatternsEmptyState'
import { PeriodSelector } from './components/PeriodSelector'
import { TrendChart } from './components/TrendChart'
import { buildTrendChart, trendLineColor } from './components/trendSeries'
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

const PatternsBody = ({
  data,
  rangeDays,
  onRangeChange,
  onScopeChange,
  onViewAll,
  personAvatarUrl,
  personName,
  scope,
}: {
  readonly data: ScopedData
  readonly rangeDays: number
  readonly onRangeChange: (days: number) => void
  readonly onScopeChange: (scope: Scope) => void
  readonly onViewAll: () => void
  readonly personAvatarUrl?: string | null
  readonly personName: string
  readonly scope: Scope
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
  const visiblePoints = data.trend.points.slice(-rangeDays)
  const chart = buildTrendChart(
    visiblePoints,
    false,
    trendLineColor(data.trend.direction),
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
        expand="block"
        fill="clear"
        onClick={onViewAll}
      >
        View all patterns
      </IonButton>
    </>
  )
}

export const PersonPatternsSection = ({
  personId,
  personName,
  personAvatarUrl,
}: {
  readonly personId: string
  readonly personName: string
  readonly personAvatarUrl?: string | null
}): React.JSX.Element | null => {
  const [scope, setScope] = useState<Scope>('person')
  const [rangeDays, setRangeDays] = useState(30)
  const { result, isLoading, hasError } = usePatternsAnalytics()
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
    anomalyPatterns: scoped ? personView.anomalyPatterns : null,
    subjectName: scoped ? personName : null,
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
