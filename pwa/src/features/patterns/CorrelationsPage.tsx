import {
  IonCard,
  IonCardContent,
  IonLabel,
  IonSegment,
  IonSegmentButton,
} from '@ionic/react'
import React, { useState } from 'react'

import { Page } from '../../components/Page'
import type { IndicatorOutcomeCorrelation, ScopedPatternsView } from './analytics'
import { AnalyticsLoadingSkeleton } from './components/AnalyticsLoadingSkeleton'
import { AnalyticsRefresher } from './components/AnalyticsRefresher'
import { ConfidenceBadge } from './components/ConfidenceBadge'
import { CorrelationCard } from './components/CorrelationCard'
import { PatternsEmptyState } from './components/PatternsEmptyState'
import { PatternsFilterBar } from './components/PatternsFilterBar'
import { useScopedPatterns } from './useScopedPatterns'

import './patterns.scss'

type View = 'strength' | 'sequence'

const StrengthRow = ({
  correlation,
}: {
  readonly correlation: IndicatorOutcomeCorrelation
}): React.JSX.Element => {
  const positive = correlation.correlation > 0
  const sign = positive ? '+' : '−'
  return (
    <IonCard>
      <IonCardContent>
        <div className="pattern-turning-card__head">
          <h3 className="pattern-row__title">{correlation.label}</h3>
          <span
            className={`pattern-corr-value pattern-corr-value--${positive ? 'pos' : 'neg'}`}
          >
            {sign}
            {Math.abs(correlation.correlation).toFixed(2)}
          </span>
        </div>
        <p className="pattern-insight__detail">{correlation.summary}</p>
        <ConfidenceBadge confidence={correlation.confidence} />
      </IonCardContent>
    </IonCard>
  )
}

const StrengthList = ({
  view,
}: {
  readonly view: ScopedPatternsView
}): React.JSX.Element => {
  const rows = view.timing.indicatorCorrelations
  if (rows.length === 0) {
    return (
      <PatternsEmptyState
        title="No strong links yet"
        message="We only surface relationships we’re reasonably confident about. A bit more check-in history will reveal them."
      />
    )
  }
  return (
    <>
      <p className="patterns-lede">
        How strongly each signal lines up with better or harder days. Positive links are
        worth encouraging; these are relationships, not causes.
      </p>
      {rows.map((row) => (
        <StrengthRow
          key={row.indicatorId}
          correlation={row}
        />
      ))}
    </>
  )
}

const SequenceList = ({
  view,
}: {
  readonly view: ScopedPatternsView
}): React.JSX.Element => {
  if (view.correlations.length === 0) {
    return (
      <PatternsEmptyState
        title="No sequences yet"
        message="We didn’t find things that reliably follow one another yet. That’s completely normal."
      />
    )
  }
  return (
    <>
      <p className="patterns-lede">
        Things that tend to happen near each other — same day or the next day. Gentle
        observations, never causes.
      </p>
      {view.correlations.map((correlation) => (
        <CorrelationCard
          key={`${correlation.sourceLabel}-${correlation.targetLabel}-${correlation.lagDays}`}
          correlation={correlation}
        />
      ))}
    </>
  )
}

const CorrelationsPage = (): React.JSX.Element => {
  const { view, isLoading, hasError } = useScopedPatterns()
  const [tab, setTab] = useState<View>('strength')

  return (
    <Page
      title="Correlations"
      className="patterns-page"
      backHref="/patterns"
    >
      <AnalyticsRefresher />
      {isLoading && <AnalyticsLoadingSkeleton />}
      {hasError && <p>We couldn’t load your patterns just now. Please try again.</p>}
      {!isLoading && !hasError && view && (
        <>
          <PatternsFilterBar />
          <IonSegment
            className="pattern-segment"
            value={tab}
            onIonChange={(e) => setTab((e.detail.value as View) ?? 'strength')}
          >
            <IonSegmentButton value="strength">
              <IonLabel>Strength</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="sequence">
              <IonLabel>Sequence</IonLabel>
            </IonSegmentButton>
          </IonSegment>
          {tab === 'strength' ? (
            <StrengthList view={view} />
          ) : (
            <SequenceList view={view} />
          )}
        </>
      )}
    </Page>
  )
}

export default CorrelationsPage
