import { FlippableCard } from '../../components/FlippableCard'
import {
  IonCard,
  IonCardContent,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
} from '@ionic/react'
import { calendarOutline, moonOutline } from 'ionicons/icons'
import React, { useState } from 'react'

import { Page } from '../../components/Page'
import type { DayOfWeekBucket, TimeOfDayBucket, TimingAnalysis } from './analytics'
import { MIN_INCIDENTS_FOR_TIME } from './analytics/timing'
import { AnalyticsLoadingSkeleton } from './components/AnalyticsLoadingSkeleton'
import { AnalyticsRefresher } from './components/AnalyticsRefresher'
import { BarChart, type Bar } from './components/BarChart'
import { PatternsEmptyState } from './components/PatternsEmptyState'
import { PatternsFilterBar } from './components/PatternsFilterBar'
import { useScopedPatterns } from './useScopedPatterns'

import './patterns.scss'

type Mode = 'week' | 'time'
type Metric = 'challenges' | 'positive'

const WEEKDAY_PLURAL = [
  'Sundays',
  'Mondays',
  'Tuesdays',
  'Wednesdays',
  'Thursdays',
  'Fridays',
  'Saturdays',
]

const TIME_BLOCKS = [
  { label: '12–4a', start: 0 },
  { label: '4–8a', start: 4 },
  { label: '8a–12p', start: 8 },
  { label: '12–4p', start: 12 },
  { label: '4–8p', start: 16 },
  { label: '8p–12a', start: 20 },
]

const argMax = (values: (number | null)[]): number => {
  let best = -1
  let bestValue = -Infinity
  values.forEach((v, i) => {
    if (v !== null && v > bestValue) {
      bestValue = v
      best = i
    }
  })
  return best
}

const TakeawayCard = ({
  icon,
  text,
}: {
  readonly icon: string
  readonly text: string
}): React.JSX.Element => (
  <FlippableCard className="pattern-insight pattern-insight--neutral">
    <IonCardContent>
      <div className="pattern-insight__head">
        <IonIcon
          className="pattern-insight__icon"
          icon={icon}
          aria-hidden="true"
        />
        <p className="pattern-insight__detail">{text}</p>
      </div>
    </IonCardContent>
  </FlippableCard>
)

const DayOfWeekView = ({
  dayOfWeek,
  metric,
}: {
  readonly dayOfWeek: DayOfWeekBucket[]
  readonly metric: Metric
}): React.JSX.Element => {
  const rates = dayOfWeek.map((d) =>
    metric === 'challenges' ? d.challengingRate : d.positiveRate,
  )
  const peak = argMax(rates)
  if (peak < 0) {
    return (
      <PatternsEmptyState
        title="Not enough days yet"
        message="A week or two of check-ins will reveal which days of the week tend to be easier or harder."
      />
    )
  }

  const accent =
    metric === 'challenges' ? 'var(--ion-color-danger)' : 'var(--ion-color-success)'
  const bars: Bar[] = dayOfWeek.map((d, i) => ({
    label: d.label,
    value: rates[i],
    color: i === peak ? accent : undefined,
  }))
  const takeaway =
    metric === 'challenges'
      ? `${WEEKDAY_PLURAL[peak]} show the highest chance of a challenging day.`
      : `${WEEKDAY_PLURAL[peak]} tend to bring the most positive signs.`

  return (
    <>
      <FlippableCard>
        <IonCardContent>
          <BarChart bars={bars} />
        </IonCardContent>
      </FlippableCard>
      <TakeawayCard
        icon={calendarOutline}
        text={takeaway}
      />
    </>
  )
}

const TimeOfDayView = ({
  timeOfDay,
  totalIncidents,
}: {
  readonly timeOfDay: TimeOfDayBucket[]
  readonly totalIncidents: number
}): React.JSX.Element => {
  if (totalIncidents < MIN_INCIDENTS_FOR_TIME) {
    return (
      <PatternsEmptyState
        title="Time-of-day needs incident logs"
        message="Check-ins are recorded by day, so time-of-day patterns come from logged incidents. Once a few incidents are recorded with times, they’ll show up here."
      />
    )
  }

  const bars: Bar[] = TIME_BLOCKS.map((block) => ({
    label: block.label,
    value: timeOfDay
      .slice(block.start, block.start + 4)
      .reduce((sum, b) => sum + b.percentage, 0),
  }))
  const peak = argMax(bars.map((b) => b.value))
  const yMax = Math.max(20, Math.ceil((bars[peak]?.value ?? 0) * 1.2))
  if (peak >= 0) bars[peak].color = 'var(--ion-color-danger)'

  return (
    <>
      <FlippableCard>
        <IonCardContent>
          <BarChart
            bars={bars}
            yMax={yMax}
          />
        </IonCardContent>
      </FlippableCard>
      <TakeawayCard
        icon={moonOutline}
        text={`Incidents most often happen around ${TIME_BLOCKS[peak].label.replace('a', ' AM').replace('p', ' PM')}.`}
      />
    </>
  )
}

const TrendsContent = ({
  timing,
}: {
  readonly timing: TimingAnalysis
}): React.JSX.Element => {
  const { filters } = useScopedPatterns()
  const [mode, setMode] = useState<Mode>('week')
  const [metric, setMetric] = useState<Metric>(
    filters.type === 'positive' ? 'positive' : 'challenges',
  )

  return (
    <>
      <p className="patterns-lede">When do things tend to happen? Pick a lens below.</p>

      <IonSegment
        className="pattern-segment"
        value={mode}
        onIonChange={(e) => setMode((e.detail.value as Mode) ?? 'week')}
      >
        <IonSegmentButton value="week">
          <IonLabel>Day of week</IonLabel>
        </IonSegmentButton>
        <IonSegmentButton value="time">
          <IonLabel>Time of day</IonLabel>
        </IonSegmentButton>
      </IonSegment>

      {mode === 'week' && (
        <>
          <IonSegment
            className="pattern-segment"
            value={metric}
            onIonChange={(e) => setMetric((e.detail.value as Metric) ?? 'challenges')}
          >
            <IonSegmentButton value="challenges">
              <IonLabel>Challenges</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="positive">
              <IonLabel>Positive signs</IonLabel>
            </IonSegmentButton>
          </IonSegment>
          <DayOfWeekView
            dayOfWeek={timing.dayOfWeek}
            metric={metric}
          />
        </>
      )}

      {mode === 'time' && (
        <TimeOfDayView
          timeOfDay={timing.timeOfDay}
          totalIncidents={timing.totalIncidents}
        />
      )}
    </>
  )
}

const TrendsPage = (): React.JSX.Element => {
  const { view, isLoading, hasError } = useScopedPatterns()

  return (
    <Page
      title="Trends"
      className="patterns-page"
      backHref="/patterns"
    >
      <AnalyticsRefresher />
      {isLoading && <AnalyticsLoadingSkeleton />}
      {hasError && <p>We couldn’t load your patterns just now. Please try again.</p>}
      {!isLoading && !hasError && view && (
        <>
          <PatternsFilterBar />
          <TrendsContent timing={view.timing} />
        </>
      )}
    </Page>
  )
}

export default TrendsPage
