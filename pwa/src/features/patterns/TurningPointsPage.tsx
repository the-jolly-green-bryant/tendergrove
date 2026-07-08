import { IonCard, IonCardContent } from '@ionic/react'
import React from 'react'

import { LoadingState } from '../../components/LoadingState'
import { Page } from '../../components/Page'
import type {
  ScopedPatternsView,
  TurningPointInsight,
  TurningPointType,
} from './analytics'
import { formatDayLabel } from './analytics/dateUtils'
import { PatternsEmptyState } from './components/PatternsEmptyState'
import { PatternsFilterBar } from './components/PatternsFilterBar'
import { useScopedPatterns } from './useScopedPatterns'

import './patterns.scss'

// className maps to a colour token: --increase = red, --recovery = green,
// --spike = purple. Well-being rising is the good news, so it gets green.
const TYPE_TAG: Record<TurningPointType, { label: string; className: string }> = {
  sustainedIncrease: { label: 'Positive change', className: 'pattern-tag--recovery' },
  recovery: { label: 'Bounced back', className: 'pattern-tag--recovery' },
  sustainedDecrease: { label: 'Worth watching', className: 'pattern-tag--increase' },
  spike: { label: 'One hard day', className: 'pattern-tag--spike' },
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
  view,
}: {
  readonly view: ScopedPatternsView
}): React.JSX.Element {
  if (view.turningPoints.length === 0) {
    const subject = view.personName
      ? `${view.personName}'s well-being has`
      : 'Things have'
    return (
      <PatternsEmptyState
        title="No big shifts detected"
        message={`${subject} been fairly steady — we haven’t detected any lasting shifts recently. We’ll flag them here if a sustained change appears.`}
      />
    )
  }

  // Most recent first — that's usually what a caregiver wants to see.
  const ordered = [...view.turningPoints].reverse()
  const subject = view.personName ? `${view.personName}'s` : 'household'

  return (
    <>
      <p className="patterns-lede">
        Bigger shifts in {subject} well-being — moments where things changed and stayed
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
 * Turning points page. Consumes: turning point insights (scoped by the filter).
 */
export default function TurningPointsPage(): React.JSX.Element {
  const { view, isLoading, hasError } = useScopedPatterns()

  return (
    <Page
      title="Turning points"
      className="patterns-page"
      backHref="/patterns"
    >
      {isLoading && <LoadingState />}
      {hasError && <p>We couldn’t load your patterns just now. Please try again.</p>}
      {!isLoading && !hasError && view && (
        <>
          <PatternsFilterBar />
          <TurningPointsContent view={view} />
        </>
      )}
    </Page>
  )
}
