import { IonCard, IonCardContent } from '@ionic/react'
import React from 'react'

import { LoadingState } from '../../components/LoadingState'
import { Page } from '../../components/Page'
import type { AnalyticsResult, RelationshipInsight } from './analytics'
import { ConfidenceBadge } from './components/ConfidenceBadge'
import { PatternsEmptyState } from './components/PatternsEmptyState'
import { TrendChart, type ChartSeries } from './components/TrendChart'
import { usePatternsAnalytics } from './usePatternsAnalytics'

import './patterns.css'

/** How many recent days to show per relationship chart (kept readable). */
const RELATIONSHIP_CHART_DAYS = 14

function relationshipSeries(rel: RelationshipInsight): {
  dates: string[]
  series: ChartSeries[]
} {
  const points = rel.chartData.slice(-RELATIONSHIP_CHART_DAYS)
  return {
    dates: points.map((p) => p.date),
    series: [
      {
        label: rel.personAName,
        color: 'var(--ion-color-primary)',
        values: points.map((p) => p.aScore),
      },
      { label: rel.personBName, color: '#7B5EBF', values: points.map((p) => p.bScore) },
    ],
  }
}

function RelationshipCard({
  relationship,
}: {
  readonly relationship: RelationshipInsight
}): React.JSX.Element {
  const { dates, series } = relationshipSeries(relationship)
  return (
    <section className="patterns-section">
      <IonCard>
        <IonCardContent>
          <TrendChart
            dates={dates}
            series={series}
          />
        </IonCardContent>
      </IonCard>
      <IonCard className="pattern-insight pattern-insight--neutral">
        <IonCardContent>
          <p className="pattern-insight__detail">{relationship.summary}</p>
          <ConfidenceBadge confidence={relationship.confidence} />
        </IonCardContent>
      </IonCard>
    </section>
  )
}

function RelationshipsContent({
  result,
}: {
  readonly result: AnalyticsResult
}): React.JSX.Element {
  if (result.relationships.length === 0) {
    return (
      <PatternsEmptyState
        title="No shared patterns yet"
        message={
          result.dataQuality.hasEnoughData
            ? 'We didn’t find people whose distress clearly moves together yet. With more daily check-ins across the household, any real connections will surface here.'
            : result.dataQuality.message
        }
      />
    )
  }

  return (
    <>
      <p className="patterns-lede">
        How people’s distress trends move relative to one another. Comparing side by
        side can reveal gentle connections — never blame, just patterns.
      </p>
      {result.relationships.map((relationship) => (
        <RelationshipCard
          key={`${relationship.personAId}-${relationship.personBId}-${relationship.lagDays}`}
          relationship={relationship}
        />
      ))}
    </>
  )
}

/**
 * Relationships page. Consumes: relationship insights.
 */
export default function RelationshipsPage(): React.JSX.Element {
  const { result, isLoading, hasError } = usePatternsAnalytics()

  return (
    <Page
      title="Relationships"
      className="patterns-page"
      backHref="/patterns"
    >
      {isLoading && <LoadingState />}
      {hasError && <p>We couldn’t load your patterns just now. Please try again.</p>}
      {!isLoading && !hasError && result && <RelationshipsContent result={result} />}
    </Page>
  )
}
