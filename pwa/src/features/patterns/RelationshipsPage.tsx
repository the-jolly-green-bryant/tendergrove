import { IonCard, IonCardContent } from '@ionic/react'
import React from 'react'

import { LoadingState } from '../../components/LoadingState'
import { Page } from '../../components/Page'
import type { RelationshipInsight, ScopedPatternsView } from './analytics'
import { ConfidenceBadge } from './components/ConfidenceBadge'
import { PatternsEmptyState } from './components/PatternsEmptyState'
import { PatternsFilterBar } from './components/PatternsFilterBar'
import { TrendChart, type ChartSeries } from './components/TrendChart'
import { toDelta } from './components/trendSeries'
import { useScopedPatterns } from './useScopedPatterns'

import './patterns.scss'

/** How many recent days to show per relationship chart (kept readable). */
const RELATIONSHIP_CHART_DAYS = 14

const PERSON_A_COLOR = 'var(--ion-color-primary)'
const PERSON_B_COLOR = '#7B5EBF'

const relationshipSeries = (rel: RelationshipInsight, showDelta: boolean): { dates: string[]; series: ChartSeries[] } => {
  const points = rel.chartData.slice(-RELATIONSHIP_CHART_DAYS)
  const aRaw = points.map((p) => p.aScore)
  const bRaw = points.map((p) => p.bScore)
  return {
    dates: points.map((p) => p.date),
    series: [
      {
        label: rel.personAName,
        color: PERSON_A_COLOR,
        values: showDelta ? toDelta(aRaw) : aRaw,
      },
      {
        label: rel.personBName,
        color: PERSON_B_COLOR,
        values: showDelta ? toDelta(bRaw) : bRaw,
      },
    ],
  }
}

const RelationshipCard = ({
  relationship,
  showDelta,
}: {
  readonly relationship: RelationshipInsight
  readonly showDelta: boolean
}): React.JSX.Element => {
  const { dates, series } = relationshipSeries(relationship, showDelta)
  return (
    <section className="patterns-section">
      <IonCard>
        <IonCardContent>
          <TrendChart
            dates={dates}
            series={series}
            clampTo={showDelta ? null : [0, 100]}
            baseline={showDelta ? 0 : undefined}
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

const RelationshipsContent = ({
  view,
  showDelta,
}: {
  readonly view: ScopedPatternsView
  readonly showDelta: boolean
}): React.JSX.Element => {
  if (view.relationships.length === 0) {
    const who = view.personName
      ? `involving ${view.personName}`
      : 'across the household'
    return (
      <PatternsEmptyState
        title="No shared patterns yet"
        message={`We didn’t find well-being that clearly moves together ${who} yet. With more daily check-ins, any real connections will surface here.`}
      />
    )
  }

  return (
    <>
      <p className="patterns-lede">
        How people’s well-being trends move relative to one another. Comparing side by
        side can reveal gentle connections — never blame, just patterns.
      </p>
      {view.relationships.map((relationship) => (
        <RelationshipCard
          key={`${relationship.personAId}-${relationship.personBId}-${relationship.lagDays}`}
          relationship={relationship}
          showDelta={showDelta}
        />
      ))}
    </>
  )
}

const RelationshipsPage = (): React.JSX.Element => {
  const { view, isLoading, hasError, showDelta } = useScopedPatterns()

  return (
    <Page
      title="Relationships"
      className="patterns-page"
      backHref="/patterns"
    >
      {isLoading && <LoadingState />}
      {hasError && <p>We couldn’t load your patterns just now. Please try again.</p>}
      {!isLoading && !hasError && view && (
        <>
          <PatternsFilterBar showDeltaToggle />
          <RelationshipsContent
            view={view}
            showDelta={showDelta}
          />
        </>
      )}
    </Page>
  )
}

export default RelationshipsPage
