import {
  IonAvatar,
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
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
  onViewAll,
}: {
  readonly data: ScopedData
  readonly rangeDays: number
  readonly onRangeChange: (days: number) => void
  readonly onViewAll: () => void
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

        <PeriodSelector
          value={rangeDays}
          onChange={onRangeChange}
        />
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
        onViewAll={() => {
          // Carry the current scope into the Patterns section so it opens
          // pre-filtered to this person (or the whole household).
          setPerson(scoped ? personId : null)
          history.push('/patterns')
        }}
      />

      <IonSegment
        value={scope}
        onIonChange={(e) => setScope((e.detail.value as Scope) ?? 'person')}
      >
        <IonSegmentButton value="person">
          <IonItem
            color={'transparent'}
            lines={'none'}
          >
            <PersonAvatar
              name={personName}
              src={personAvatarUrl}
              slot={'start'}
            />
            <IonLabel>{personName}</IonLabel>
          </IonItem>
        </IonSegmentButton>

        <IonSegmentButton value="household">
          <IonItem
            color={'transparent'}
            lines={'none'}
          >
            <IonAvatar slot={'start'}>
              <IonIcon icon={homeOutline} />
            </IonAvatar>

            <IonLabel>Household</IonLabel>
          </IonItem>
        </IonSegmentButton>
      </IonSegment>
    </section>
  )
}
