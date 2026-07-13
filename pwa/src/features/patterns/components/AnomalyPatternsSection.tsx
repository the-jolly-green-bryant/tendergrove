import { IonButton, IonCard, IonCardContent, IonIcon } from '@ionic/react'

import {
  calendarOutline,
  chevronForwardOutline,
  peopleOutline,
  pricetagOutline,
} from 'ionicons/icons'

import React from 'react'
import { useHistory } from 'react-router-dom'

import type {
  AnomalyOtherPersonItem,
  AnomalyPatterns,
  AnomalyRateItem,
  AnomalyWeekdayBucket,
} from '../analytics'

interface AnomalyPatternsSectionProps {
  readonly personName: string
  readonly patterns: AnomalyPatterns
}

const PercentBar = ({
  value,
  accent,
}: {
  readonly value: number
  readonly accent: 'weekday' | 'event' | 'household'
}): React.JSX.Element => (
  <span className="anomaly-pattern-stat__track">
    <span
      className={`anomaly-pattern-stat__fill anomaly-pattern-stat__fill--${accent}`}
      style={{
        width: `${Math.max(4, Math.min(100, value))}%`,
      }}
    />
  </span>
)

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
        TenderGrove found harder-than-usual days, but no weekday, event, or household
        connection currently appears often enough to call out.
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

const history = useHistory()

const renderWeekdayChart = (patterns: AnomalyPatterns) =>
  patterns.weekday && (
    <IonCard className="anomaly-pattern-card anomaly-pattern-card--weekday">
      <IonCardContent>
        <div className="anomaly-pattern-card__main">
          <div className="anomaly-pattern-card__copy">
            <p className="anomaly-pattern-card__eyebrow">Day of the week</p>

            <h3>{patterns.weekday.label}s are hard!</h3>

            <p className="anomaly-pattern-card__description">
              {patterns.weekday.label}s spike in severity severity{' '}
              <strong>{patterns.weekday.anomalyRate}%</strong> of the time, compared
              with <strong>{patterns.weekday.otherDaysRate}%</strong> on other days.
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
          onClick={() => history.push('/patterns/heatmap')}
        />
      </IonCardContent>
    </IonCard>
  )

const renderEventsChart = (patterns: AnomalyPatterns) =>
  patterns.events && (
    <IonCard className="anomaly-pattern-card anomaly-pattern-card--event">
      <IonCardContent>
        <div className="anomaly-pattern-card__main">
          <div className="anomaly-pattern-card__copy">
            <p className="anomaly-pattern-card__eyebrow">Events</p>

            <h3>{patterns.events.top.label} often happens on harder days</h3>

            <p className="anomaly-pattern-card__description">
              Days where {patterns.events.top.label} is present spike in severity{' '}
              <strong>{patterns.events.top.anomalyRate}%</strong> of the time, compared
              with <strong>{patterns.events.top.typicalRate}%</strong> on more typical
              days.
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
          onClick={() => history.push('/patterns/correlations')}
        />
      </IonCardContent>
    </IonCard>
  )

export const AnomalyPatternsSection = ({
  personName,
  patterns,
}: AnomalyPatternsSectionProps): React.JSX.Element | null =>
  patterns.baseline &&
  (() => (
    <section
      className="anomaly-patterns"
      aria-labelledby="anomaly-patterns-title"
    >
      <div className="anomaly-patterns__heading">
        <div>
          <h2 id="anomaly-patterns-title">Patterns worth watching</h2>

          <p>Based on recent check-ins that were harder than usual for {personName}.</p>
        </div>
      </div>

      {!(
        patterns.weekday !== null ||
        patterns.events !== null ||
        patterns.otherPeople !== null
      ) && EMPTY_STATE}

      {renderWeekdayChart(patterns)}
      {renderEventsChart(patterns)}

      {patterns.otherPeople && (
        <IonCard className="anomaly-pattern-card anomaly-pattern-card--household">
          <IonCardContent>
            <div className="anomaly-pattern-card__main">
              <div className="anomaly-pattern-card__copy">
                <p className="anomaly-pattern-card__eyebrow">Others in your home</p>

                <h3>
                  {patterns.otherPeople.top.personName}
                  ’s {patterns.otherPeople.top.label.toLowerCase()} often overlaps with
                  harder days
                </h3>

                <p className="anomaly-pattern-card__description">
                  Days when {patterns.otherPeople.top.personName} shows{' '}
                  {patterns.otherPeople.top.label.toLowerCase()} see spikes in severity
                  for {personName} on{' '}
                  <strong>{patterns.otherPeople.top.anomalyRate}%</strong> of measurable
                  days.
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
              onClick={() => history.push('/patterns/relationships')}
            />
          </IonCardContent>
        </IonCard>
      )}
    </section>
  ))()
