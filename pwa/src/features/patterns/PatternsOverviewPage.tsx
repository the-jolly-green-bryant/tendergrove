import { IonCard, IonCardContent, IonIcon } from '@ionic/react'
import {
  calendarNumberOutline,
  chevronForwardOutline,
  flagOutline,
  gitNetworkOutline,
  heartOutline,
  removeOutline,
  trendingDownOutline,
  trendingUpOutline,
} from 'ionicons/icons'
import React from 'react'
import { useHistory } from 'react-router-dom'

import { LoadingState } from '../../components/LoadingState'
import { Page } from '../../components/Page'
import type { ScopedPatternsView, TrendDirection } from './analytics'
import { InsightCard } from './components/InsightCard'
import { PatternsEmptyState } from './components/PatternsEmptyState'
import { PatternsFilterBar } from './components/PatternsFilterBar'
import { TrendChart } from './components/TrendChart'
import { buildTrendChart } from './components/trendSeries'
import { useScopedPatterns } from './useScopedPatterns'

import './patterns.css'

/** How many days of the trend to show on the overview chart (kept readable). */
const OVERVIEW_TREND_DAYS = 14

const DIRECTION_ICON: Record<TrendDirection, string> = {
  improving: trendingUpOutline, // well-being up = good
  worsening: trendingDownOutline,
  stable: removeOutline,
  insufficient: removeOutline,
}

const DEEPER_PATTERNS = [
  {
    href: '/patterns/calendar',
    icon: calendarNumberOutline,
    title: 'Calendar heatmap',
    sub: 'See patterns by day at a glance',
  },
  {
    href: '/patterns/correlations',
    icon: gitNetworkOutline,
    title: 'Correlations',
    sub: 'See which indicators appear connected',
  },
  {
    href: '/patterns/relationships',
    icon: heartOutline,
    title: 'Relationships',
    sub: "How people's patterns move together",
  },
  {
    href: '/patterns/turning-points',
    icon: flagOutline,
    title: 'Turning points',
    sub: 'Big shifts and lasting changes',
  },
] as const

function TrendSummary({
  view,
}: {
  readonly view: ScopedPatternsView
}): React.JSX.Element {
  const { overallTrend } = view.overview
  const { current, previous } = overallTrend
  const comparison =
    current !== null && previous !== null ? ` (${previous} → ${current})` : ''
  return (
    <div className="pattern-trend-summary">
      <IonIcon
        className="pattern-trend-summary__arrow"
        icon={DIRECTION_ICON[overallTrend.direction]}
        aria-hidden="true"
      />
      <span>
        {overallTrend.summary}
        {comparison}.
      </span>
    </div>
  )
}

function TrendSection({
  view,
  showDelta,
}: {
  readonly view: ScopedPatternsView
  readonly showDelta: boolean
}): React.JSX.Element {
  const subject = view.personName ? `${view.personName}'s` : 'Household'
  const points = view.trend.points.slice(-OVERVIEW_TREND_DAYS)
  const chart = buildTrendChart(points, showDelta)
  return (
    <section
      className="patterns-section"
      aria-labelledby="trend-heading"
    >
      <h2
        id="trend-heading"
        className="pattern-calendar-heading"
      >
        {subject} well-being trend
      </h2>
      <p className="patterns-lede">
        {showDelta
          ? 'Day-to-day change in well-being. Points above the dashed line are better days than the one before; below it, harder ones.'
          : 'Daily average well-being score (higher is better). Missing days simply mean no check-in yet.'}
      </p>
      <IonCard>
        <IonCardContent>
          <TrendChart
            dates={chart.dates}
            series={chart.series}
            clampTo={chart.clampTo}
            baseline={chart.baseline}
          />
        </IonCardContent>
      </IonCard>
      {!showDelta && <TrendSummary view={view} />}
    </section>
  )
}

function DeeperPatternsNav(): React.JSX.Element {
  const history = useHistory()
  return (
    <section className="patterns-section">
      <h2 className="pattern-calendar-heading">Explore deeper patterns</h2>
      <div className="pattern-nav-list">
        {DEEPER_PATTERNS.map((item) => (
          <button
            key={item.href}
            type="button"
            className="pattern-nav-card"
            onClick={() => history.push(item.href)}
          >
            <IonIcon
              className="pattern-nav-card__icon"
              icon={item.icon}
              aria-hidden="true"
            />
            <span className="pattern-nav-card__body">
              <span className="pattern-nav-card__title">{item.title}</span>
              <span className="pattern-nav-card__sub">{item.sub}</span>
            </span>
            <IonIcon
              className="pattern-nav-card__chevron"
              icon={chevronForwardOutline}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
    </section>
  )
}

function OverviewContent({
  view,
  showDelta,
}: {
  readonly view: ScopedPatternsView
  readonly showDelta: boolean
}): React.JSX.Element {
  const hasTrend = view.trend.points.some((p) => p.score !== null)
  const emptyMessage = view.personName
    ? `Keep logging daily check-ins for ${view.personName} and patterns will appear here.`
    : 'We’re still gathering data. Keep logging daily check-ins and patterns will appear here — usually within a week or so.'

  return (
    <>
      <p className="patterns-lede">
        Discover trends and connections — gently, over time.
      </p>

      <div className="pattern-weekly-wrap patterns-section">
        <InsightCard insight={view.overview.weeklyInsight} />
      </div>

      {view.scoredDays === 0 && <PatternsEmptyState message={emptyMessage} />}

      {hasTrend && (
        <TrendSection
          view={view}
          showDelta={showDelta}
        />
      )}

      {view.overview.noteworthy.length > 0 && (
        <section className="patterns-section">
          <h2 className="pattern-calendar-heading">Worth noticing</h2>
          {view.overview.noteworthy.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
            />
          ))}
        </section>
      )}

      <DeeperPatternsNav />
    </>
  )
}

/**
 * Patterns overview — the landing screen for the Patterns section.
 * Consumes: weekly insight, trend chart data, deeper-pattern cards. The shared
 * filter scopes everything to Everyone or one person.
 */
export default function PatternsOverviewPage(): React.JSX.Element {
  const { view, isLoading, hasError, showDelta } = useScopedPatterns()

  return (
    <Page
      title="Patterns"
      className="patterns-page"
      backHref="/dashboard"
    >
      {isLoading && <LoadingState />}
      {hasError && <p>We couldn’t load your patterns just now. Please try again.</p>}
      {!isLoading && !hasError && view && (
        <>
          <PatternsFilterBar showDeltaToggle />
          <OverviewContent
            view={view}
            showDelta={showDelta}
          />
        </>
      )}
    </Page>
  )
}
