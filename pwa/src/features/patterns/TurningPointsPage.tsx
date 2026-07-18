import { IonCard, IonCardContent } from '@ionic/react'
import React from 'react'

import { LoadingState } from '../../components/LoadingState'
import { Page } from '../../components/Page'
import type {
  ScopedPatternsView,
  TurningPointInsight,
  TurningPointType,
} from './analytics'
import { dateKeyToDate, daysBetween, formatDayLabel } from './analytics/dateUtils'
import { PatternsEmptyState } from './components/PatternsEmptyState'
import { PatternsFilterBar } from './components/PatternsFilterBar'
import { useScopedPatterns } from './useScopedPatterns'

import './patterns.scss'

const TYPE_TAG: Record<TurningPointType, { label: string; className: string }> = {
  sustainedIncrease: { label: 'Increase', className: 'pattern-tag--recovery' },
  recovery: { label: 'Return toward average', className: 'pattern-tag--recovery' },
  sustainedDecrease: { label: 'Decrease', className: 'pattern-tag--increase' },
  spike: { label: 'One-day drop', className: 'pattern-tag--spike' },
}

const formatShiftDate = (date: string): string => {
  const parsed = dateKeyToDate(date)
  if (parsed.getFullYear() === new Date().getFullYear()) return formatDayLabel(date)
  return parsed.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const CurrentState = ({ view }: { readonly view: ScopedPatternsView }) => {
  const scored = view.calendar.filter(
    (day): day is typeof day & { score: number } => day.score !== null,
  )
  if (scored.length === 0) return null

  const average = Math.round(
    scored.reduce((sum, day) => sum + day.score, 0) / scored.length,
  )
  const relation = (score: number) =>
    score < average - 5
      ? 'below average'
      : score > average + 5
        ? 'above average'
        : 'near average'
  const current = scored.at(-1)!
  const currentRelation = relation(current.score)
  let start = scored.length - 1
  while (start > 0 && relation(scored[start - 1].score) === currentRelation) start--
  const duration = daysBetween(current.date, scored[start].date) + 1

  return (
    <IonCard className="pattern-current-state">
      <IonCardContent>
        <h2>
          {currentRelation.charAt(0).toUpperCase() + currentRelation.slice(1)} for{' '}
          {duration} {duration === 1 ? 'day' : 'days'}.
        </h2>
      </IonCardContent>
    </IonCard>
  )
}

const TurningPointCard = ({
  turningPoint,
}: {
  readonly turningPoint: TurningPointInsight
}): React.JSX.Element => {
  const tag = TYPE_TAG[turningPoint.type]
  return (
    <IonCard>
      <IonCardContent>
        <div className="pattern-turning-card__head">
          <h3 className="pattern-turning-card__date">
            {formatShiftDate(turningPoint.date)}
          </h3>
          <span className={`pattern-tag ${tag.className}`}>{tag.label}</span>
        </div>
        <p className="pattern-insight__detail">{turningPoint.summary}</p>
      </IonCardContent>
    </IonCard>
  )
}

export const TurningPointsContent = ({
  view,
}: {
  readonly view: ScopedPatternsView
}): React.JSX.Element => {
  if (view.turningPoints.length === 0) {
    const subject = view.personName
      ? `${view.personName}'s well-being has`
      : 'Things have'
    return (
      <>
        <CurrentState view={view} />
        <PatternsEmptyState
          title="No shifts detected"
          message={`${subject} not changed enough to identify a sustained shift in the available data.`}
        />
      </>
    )
  }

  // Most recent first — that's usually what a caregiver wants to see.
  const ordered = [...view.turningPoints].reverse()
  const subject = view.personName ?? 'the household'

  return (
    <>
      <CurrentState view={view} />
      <p className="patterns-lede">
        Sustained changes for {subject} and how long each shift lasted.
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

const TurningPointsPage = (): React.JSX.Element => {
  const { view, isLoading, hasError } = useScopedPatterns()

  return (
    <Page
      title="Shifts"
      className="patterns-page"
      backHref="/patterns"
    >
      {isLoading && (
        <LoadingState
          variant="list"
          label="Loading shifts"
          rows={5}
        />
      )}
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

export default TurningPointsPage
