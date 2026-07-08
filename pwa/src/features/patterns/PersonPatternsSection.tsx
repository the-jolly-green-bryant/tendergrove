import {
  IonButton,
  IonCard,
  IonCardContent,
  IonIcon,
  IonLabel,
  IonSegment,
  IonSegmentButton,
} from '@ionic/react'
import { homeOutline } from 'ionicons/icons'
import React, { useState } from 'react'
import { useHistory } from 'react-router-dom'

import { PersonAvatar } from '../../components/PersonAvatar'
import { buildPersonView, type CorrelationInsight, type TrendResult } from './analytics'
import { CorrelationCard } from './components/CorrelationCard'
import { PatternsEmptyState } from './components/PatternsEmptyState'
import { TrendChart, type ChartSeries } from './components/TrendChart'
import { usePatternsAnalytics } from './usePatternsAnalytics'

import './patterns.css'

/** Recent days to show on the compact trend chart. */
const TREND_DAYS = 14

/** Most correlations to surface inline before linking to the full page. */
const MAX_INLINE_CORRELATIONS = 3

type Scope = 'person' | 'household'

interface ScopedData {
  trend: TrendResult
  correlations: CorrelationInsight[]
  scoredDays: number
}

/** Build the chart series (daily line + rolling average) from a trend. */
function trendSeries(trend: TrendResult): { dates: string[]; series: ChartSeries[] } {
  const points = trend.points.slice(-TREND_DAYS)
  return {
    dates: points.map((p) => p.date),
    series: [
      {
        label: 'Daily well-being',
        color: 'var(--ion-color-primary)',
        values: points.map((p) => p.score),
      },
      {
        label: '7-day average',
        color: 'var(--ion-color-secondary-shade)',
        values: points.map((p) => p.rollingAverage),
        dashed: true,
      },
    ],
  }
}

/** A short, gentle sentence describing the trend direction. */
function trendText(trend: TrendResult): string {
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

function PatternsBody({
  data,
  chartTitle,
}: {
  readonly data: ScopedData
  readonly chartTitle: string
}): React.JSX.Element {
  const history = useHistory()

  if (data.scoredDays === 0) {
    return (
      <PatternsEmptyState
        title="Patterns are still taking shape"
        message="Keep logging daily check-ins and a trend and any connections will appear here."
      />
    )
  }

  const { dates, series } = trendSeries(data.trend)
  const correlations = data.correlations.slice(0, MAX_INLINE_CORRELATIONS)

  return (
    <>
      <h3 className="pattern-calendar-heading">{chartTitle}</h3>
      <IonCard>
        <IonCardContent>
          <TrendChart
            dates={dates}
            series={series}
          />
        </IonCardContent>
      </IonCard>
      <p className="pattern-row__meta">{trendText(data.trend)}</p>

      {correlations.length > 0 && (
        <>
          <h3 className="pattern-calendar-heading">Connections worth noticing</h3>
          {correlations.map((c) => (
            <CorrelationCard
              key={`${c.sourceLabel}-${c.targetLabel}-${c.lagDays}`}
              correlation={c}
            />
          ))}
        </>
      )}

      <IonButton
        expand="block"
        fill="clear"
        onClick={() => history.push('/patterns')}
      >
        View all patterns
      </IonButton>
    </>
  )
}

/**
 * A per-person patterns section for the Person page: well-being trend and
 * connections for this person, with a filter to view the whole household
 * instead. Reuses the shared household analytics pass.
 */
export function PersonPatternsSection({
  personId,
  personName,
  personAvatarUrl,
}: {
  readonly personId: string
  readonly personName: string
  readonly personAvatarUrl?: string | null
}): React.JSX.Element | null {
  const { result, isLoading, hasError } = usePatternsAnalytics()
  const [scope, setScope] = useState<Scope>('person')

  // The main Person page already surfaces loading/errors; stay quiet here.
  if (isLoading || hasError || !result) return null

  const personView = buildPersonView(result, personId)
  const scopedToPerson = scope === 'person'
  const data: ScopedData = scopedToPerson
    ? {
        trend: personView.trend,
        correlations: personView.correlations,
        scoredDays: personView.scoredDays,
      }
    : {
        trend: result.householdTrend,
        correlations: result.correlations,
        scoredDays: result.dataQuality.scoredDays,
      }

  const chartTitle = scopedToPerson
    ? `${personName}'s well-being trend`
    : 'Household well-being trend'

  return (
    <section className="patterns-section person-patterns">
      <div className="person-patterns__header">
        {scopedToPerson ? (
          <PersonAvatar
            name={personName}
            src={personAvatarUrl}
            className="person-patterns__avatar"
          />
        ) : (
          <span
            className="person-patterns__household-icon"
            aria-hidden="true"
          >
            <IonIcon icon={homeOutline} />
          </span>
        )}
        <h2 className="pattern-calendar-heading person-patterns__title">
          {scopedToPerson ? `${personName}’s patterns` : 'Household patterns'}
        </h2>
      </div>
      <IonSegment
        value={scope}
        onIonChange={(e) => setScope((e.detail.value as Scope) ?? 'person')}
        className="person-patterns__scope"
      >
        <IonSegmentButton value="person">
          <IonLabel>Just {personName}</IonLabel>
        </IonSegmentButton>
        <IonSegmentButton value="household">
          <IonLabel>Whole household</IonLabel>
        </IonSegmentButton>
      </IonSegment>

      <PatternsBody
        data={data}
        chartTitle={chartTitle}
      />
    </section>
  )
}
