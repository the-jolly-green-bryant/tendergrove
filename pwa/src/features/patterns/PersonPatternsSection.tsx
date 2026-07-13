import {
  IonAvatar,
  IonButton,
  IonCard,
  IonCardContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSegment,
  IonSegmentButton,
} from '@ionic/react'
import { homeOutline } from 'ionicons/icons'
import React, { useState } from 'react'
import { useHistory } from 'react-router-dom'

import { PersonAvatar } from '../../components/PersonAvatar'
import { CorrelationCard } from './components/CorrelationCard'
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

/** Most correlations to surface inline before linking to the full page. */
const MAX_INLINE_CORRELATIONS = 3

type Scope = 'person' | 'household'

interface ScopedData {
  trend: TrendResult
  correlations: CorrelationInsight[]
  scoredDays: number
  anomalyPatterns: AnomalyPatterns | null
  subjectName: string | null
}

const trendText = (trend: TrendResult): string => {
  const {
    direction,
    current7DayAverage: current,
    previous7DayAverage: previous,
  } = trend
  if (direction === 'insufficient') {
    return 'Not enough recent check-ins to show a trend yet.'
  }
  const cmp = current !== null && previous !== null ? ` (${previous} → ${current})` : ''
  if (direction === 'stable') return `About the same as last week${cmp}.`
  return direction === 'improving'
    ? `Trending higher than last week${cmp} — a good sign.`
    : `Trending lower than last week${cmp} — worth watching.`
}

const PatternsBody = ({
  data,
  chartTitle,
  rangeDays,
  onRangeChange,
  onViewAll,
}: {
  readonly data: ScopedData
  readonly chartTitle: string
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

  const chart = buildTrendChart(
    data.trend.points,
    false,
    trendLineColor(data.trend.direction),
  )
  const correlations = data.correlations.slice(0, MAX_INLINE_CORRELATIONS)

  return (
    <>
      <div className={'pattern-chart__container'}>
        <TrendChart
          dates={chart.dates}
          series={chart.series}
          clampTo={chart.clampTo}
          eventCounts={data.trend.points.map((point) => point.eventCount)}
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
  const { result, isLoading, hasError } = usePatternsAnalytics(rangeDays)
  const history = useHistory()
  const setPerson = usePatternsFilterStore((s) => s.setPerson)

  // The main Person page already surfaces loading/errors; stay quiet here.
  if (isLoading || hasError || !result) return null

  const personView = buildPersonView(result, personId)
  const scopedToPerson = scope === 'person'
  const data: ScopedData = scopedToPerson
    ? {
      trend: personView.trend,
      correlations: personView.correlations,
      scoredDays: personView.scoredDays,
      anomalyPatterns: personView.anomalyPatterns,
      subjectName: personName,
    }
    : {
      trend: result.householdTrend,
      correlations: result.correlations,
      scoredDays: result.dataQuality.scoredDays,
      anomalyPatterns: null,
      subjectName: null,
    }

  const chartTitle = scopedToPerson
    ? `${personName}'s well-being trend`
    : 'Household well-being trend'

  return (
    <section className="patterns-section person-patterns">
      <PatternsBody
        data={data}
        chartTitle={chartTitle}
        rangeDays={rangeDays}
        onRangeChange={setRangeDays}
        onViewAll={() => {
          // Carry the current scope into the Patterns section so it opens
          // pre-filtered to this person (or the whole household).
          setPerson(scopedToPerson ? personId : null)
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
