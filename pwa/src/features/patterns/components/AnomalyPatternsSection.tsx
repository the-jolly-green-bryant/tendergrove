import { IonButton, IonCard, IonCardContent, IonIcon } from '@ionic/react'

import {
  calendarOutline,
  chevronForwardOutline,
  peopleOutline,
  pricetagOutline,
} from 'ionicons/icons'

import React from 'react'

import type {
  AnomalyOtherPersonItem,
  AnomalyPatterns,
  AnomalyRateItem,
  AnomalyWeekdayBucket,
} from '../analytics'

interface AnomalyPatternsSectionProps {
  readonly personName: string
  readonly patterns: AnomalyPatterns
  readonly onExplore: (tab: 'trend' | 'calendar' | 'household') => void
}

const PercentBar = ({
  value,
  accent,
}: {
  readonly value: number
  readonly accent: 'weekday' | 'event' | 'household'
}): React.JSX.Element => {
  const intensity = Math.max(0, Math.min(100, value)) / 100
  const severityColor = `rgba(201, 48, 48, ${0.22 + intensity * 0.78})`

  return (
    <span className="anomaly-pattern-stat__track">
      <span
        className={`anomaly-pattern-stat__fill anomaly-pattern-stat__fill--${accent}`}
        style={{
          width: `${Math.max(4, Math.min(100, value))}%`,
          backgroundColor: accent === 'weekday' ? undefined : severityColor,
        }}
      />
    </span>
  )
}

const WeekdayChart = ({
  buckets,
  highlightedWeekday,
}: {
  readonly buckets: AnomalyWeekdayBucket[]
  readonly highlightedWeekday: number
}): React.JSX.Element => {
  const max = Math.max(1, ...buckets.map((bucket) => bucket.anomalyRate ?? 0))

  return (
    <div
      className="anomaly-weekday-chart"
      aria-label="Harder-than-usual check-ins by weekday"
    >
      {buckets.map((bucket) => {
        const value = bucket.anomalyRate ?? 0
        const highlighted = bucket.weekday === highlightedWeekday

        return (
          <div
            key={bucket.weekday}
            className="anomaly-weekday-chart__day"
          >
            <span className="anomaly-weekday-chart__value">
              {bucket.anomalyRate === null ? '–' : `${bucket.anomalyRate}%`}
            </span>

            <span className="anomaly-weekday-chart__bar-space">
              <span
                className={[
                  'anomaly-weekday-chart__bar',
                  highlighted ? 'anomaly-weekday-chart__bar--highlighted' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{
                  height: `${value === 0 ? 3 : Math.max(10, (value / max) * 62)}px`,
                }}
              />
            </span>

            <span
              className={[
                'anomaly-weekday-chart__label',
                highlighted ? 'anomaly-weekday-chart__label--highlighted' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {bucket.label.slice(0, 1)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

const SignalRows = ({
  items,
  accent,
  formatLabel,
}: {
  readonly items: readonly AnomalyRateItem[]
  readonly accent: 'event' | 'household'
  readonly formatLabel?: (item: AnomalyRateItem) => string
}): React.JSX.Element => (
  <div className="anomaly-pattern-stats">
    {items.map((item) => (
      <div
        key={item.id}
        className="anomaly-pattern-stat"
      >
        <span className="anomaly-pattern-stat__label">
          {formatLabel ? formatLabel(item) : item.label}
        </span>

        <span className="anomaly-pattern-stat__percentage">{item.anomalyRate}%</span>

        <PercentBar
          value={item.anomalyRate}
          accent={accent}
        />
      </div>
    ))}
  </div>
)

const EMPTY_STATE = (
  <IonCard className="anomaly-patterns__empty">
    <IonCardContent>
      <h3>No repeated pattern stands out yet</h3>

      <p>
        TenderGrove found days with more severe behavior, but no weekday, event, or
        household connection currently appears often enough to call out.
      </p>
    </IonCardContent>
  </IonCard>
)

const CardFooter = ({
  icon,
  action,
  onClick,
}: {
  readonly icon: React.ComponentProps<typeof IonIcon>['icon']
  readonly action: string
  readonly onClick: () => void
}): React.JSX.Element => (
  <div className="anomaly-pattern-card__footer">
    <div className="anomaly-pattern-card__icon anomaly-pattern-card__icon--event">
      <IonIcon
        icon={icon}
        aria-hidden="true"
      />
    </div>

    <IonButton
      fill="clear"
      size="small"
      onClick={onClick}
    >
      {action}

      <IonIcon
        slot="end"
        icon={chevronForwardOutline}
        aria-hidden="true"
      />
    </IonButton>
  </div>
)

const renderWeekdayChart = (
  patterns: AnomalyPatterns,
  onExplore: AnomalyPatternsSectionProps['onExplore'],
) =>
  patterns.weekday && (
    <IonCard className="anomaly-pattern-card anomaly-pattern-card--weekday">
      <IonCardContent>
        <div className="anomaly-pattern-card__main">
          <div className="anomaly-pattern-card__copy">
            <p className="anomaly-pattern-card__eyebrow">Day of the week</p>

            <h3>{patterns.weekday.label}s are tough</h3>

            <p className="anomaly-pattern-card__description">
              Notably severe behavior appears on{' '}
              <strong>{patterns.weekday.anomalyRate}%</strong> of{' '}
              {patterns.weekday.label}s, compared with{' '}
              <strong>{patterns.weekday.otherDaysRate}%</strong> on other days.
            </p>
          </div>

          <WeekdayChart
            buckets={patterns.weekday.buckets}
            highlightedWeekday={patterns.weekday.weekday}
          />
        </div>

        <CardFooter
          icon={calendarOutline}
          action="Explore days"
          onClick={() => onExplore('calendar')}
        />
      </IonCardContent>
    </IonCard>
  )

const renderEventsChart = (
  patterns: AnomalyPatterns,
  onExplore: AnomalyPatternsSectionProps['onExplore'],
) =>
  patterns.events &&
  (() => {
    const top = patterns.events.top
    const higherOnEventDays = top.anomalyRate > top.typicalRate

    return (
      <IonCard className="anomaly-pattern-card anomaly-pattern-card--event">
        <IonCardContent>
          <div className="anomaly-pattern-card__main">
            <div className="anomaly-pattern-card__copy">
              <p className="anomaly-pattern-card__eyebrow">Events</p>

              <h3>{higherOnEventDays && `Watch for ${top.label}`}</h3>

              <p className="anomaly-pattern-card__description">
                Behavior spikes on <strong>{top.anomalyRate}%</strong> of days with{' '}
                {top.label}, compared with <strong>{top.typicalRate}%</strong> of days
                without it.
              </p>
            </div>

            <SignalRows
              items={patterns.events.items}
              accent="event"
            />
          </div>

          <CardFooter
            icon={pricetagOutline}
            action="Explore events"
            onClick={() => onExplore('trend')}
          />
        </IonCardContent>
      </IonCard>
    )
  })()

export const AnomalyPatternsSection = ({
  personName,
  patterns,
  onExplore,
}: AnomalyPatternsSectionProps): React.JSX.Element | null =>
  patterns.baseline &&
  (() => (
    <section
      className="anomaly-patterns"
      aria-labelledby="anomaly-patterns-title"
    >
      <div className="anomaly-patterns__heading">
        <div>
          <h2 id="anomaly-patterns-title">Patterns at a Glance</h2>

          <p>
            We've highlighted the patterns most likely to be useful today. Explore the
            other analytics views for a deeper look.
          </p>
        </div>
      </div>

      {!(
        patterns.weekday !== null ||
        patterns.events !== null ||
        patterns.otherPeople !== null
      ) && EMPTY_STATE}

      {renderWeekdayChart(patterns, onExplore)}
      {renderEventsChart(patterns, onExplore)}

      {patterns.otherPeople && (
        <IonCard className="anomaly-pattern-card anomaly-pattern-card--household">
          <IonCardContent>
            <div className="anomaly-pattern-card__main">
              <div className="anomaly-pattern-card__copy">
                <p className="anomaly-pattern-card__eyebrow">Others in the home</p>

                <h3>
                  {patterns.otherPeople.top.evidence === 'repeated'
                    ? `${patterns.otherPeople.top.personName}’s ${patterns.otherPeople.top.label.toLowerCase()} often overlaps with ${personName}’s more severe days`
                    : `${patterns.otherPeople.top.personName}'s severe days map to ${personName}'s`}
                </h3>

                <p className="anomaly-pattern-card__description">
                  {patterns.otherPeople.top.personName}’s{' '}
                  {patterns.otherPeople.top.label.toLowerCase()} appears on{' '}
                  <strong>{patterns.otherPeople.top.anomalyRate}%</strong> of{' '}
                  {personName}’s more severe days, compared with{' '}
                  <strong>{patterns.otherPeople.top.typicalRate}%</strong> of other
                  measurable days.
                </p>
              </div>

              <SignalRows
                items={patterns.otherPeople.items}
                accent="household"
                formatLabel={(item) => {
                  const other = item as AnomalyOtherPersonItem

                  return `${other.personName} · ${other.label}`
                }}
              />
            </div>

            <CardFooter
              icon={peopleOutline}
              action="Explore others"
              onClick={() => onExplore('household')}
            />
          </IonCardContent>
        </IonCard>
      )}
    </section>
  ))()
