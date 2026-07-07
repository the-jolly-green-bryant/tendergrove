import { IonCard, IonCardContent } from '@ionic/react'
import React from 'react'

import { LoadingState } from '../../components/LoadingState'
import { Page } from '../../components/Page'
import type {
  AnalyticsResult,
  TurningPointInsight,
  TurningPointType,
} from './analytics'
import { formatDayLabel } from './analytics/dateUtils'
import { PatternsEmptyState } from './components/PatternsEmptyState'
import { usePatternsAnalytics } from './usePatternsAnalytics'

import './patterns.css'

const TYPE_TAG: Record<TurningPointType, { label: string; className: string }> = {
  sustainedIncrease: {
    label: 'Sustained increase',
    className: 'pattern-tag--increase',
  },
  sustainedDecrease: { label: 'Positive change', className: 'pattern-tag--decrease' },
  recovery: { label: 'Positive change', className: 'pattern-tag--recovery' },
  spike: { label: 'One-day spike', className: 'pattern-tag--spike' },
}

function TurningPointCard({
  turningPoint,
}: {
  readonly turningPoint: TurningPointInsight
}): React.JSX.Element {
  const tag = TYPE_TAG[turningPoint.type]
  return (
    <IonCard>
      <IonCardContent>
        <div className="pattern-turning-card__head">
          <h3 className="pattern-turning-card__date">
            {formatDayLabel(turningPoint.date)}
          </h3>
          <span className={`pattern-tag ${tag.className}`}>{tag.label}</span>
        </div>
        <p className="pattern-insight__detail">{turningPoint.summary}</p>
      </IonCardContent>
    </IonCard>
  )
}

function TurningPointsContent({
  result,
}: {
  readonly result: AnalyticsResult
}): React.JSX.Element {
  if (result.turningPoints.length === 0) {
    return (
      <PatternsEmptyState
        title="No big shifts detected"
        message={
          result.dataQuality.hasEnoughData
            ? 'Things have been fairly steady — we haven’t detected any lasting shifts recently. We’ll flag them here if a sustained change appears.'
            : result.dataQuality.message
        }
      />
    )
  }

  // Most recent first — that's usually what a caregiver wants to see.
  const ordered = [...result.turningPoints].reverse()

  return (
    <>
      <p className="patterns-lede">
        Bigger shifts in household distress — moments where things changed and stayed
        changed for a while. Everyday ups and downs are left out on purpose.
      </p>
      {ordered.map((turningPoint) => (
        <TurningPointCard
          key={`${turningPoint.date}-${turningPoint.type}`}
          turningPoint={turningPoint}
        />
      ))}
    </>
  )
}

/**
 * Turning points page. Consumes: turning point insights.
 */
export default function TurningPointsPage(): React.JSX.Element {
  const { result, isLoading, hasError } = usePatternsAnalytics()

  return (
    <Page
      title="Turning points"
      className="patterns-page"
      backHref="/patterns"
    >
      {isLoading && <LoadingState />}
      {hasError && <p>We couldn’t load your patterns just now. Please try again.</p>}
      {!isLoading && !hasError && result && <TurningPointsContent result={result} />}
    </Page>
  )
}
