import { IonCard, IonCardContent, IonIcon } from '@ionic/react'
import {
  calendarNumberOutline,
  chevronForwardOutline,
  flagOutline,
  gitNetworkOutline,
  heartOutline,
  trendingDownOutline,
  trendingUpOutline,
  removeOutline,
} from 'ionicons/icons'
import React from 'react'
import { useHistory } from 'react-router-dom'

import { LoadingState } from '../../components/LoadingState'
import { Page } from '../../components/Page'
import type { AnalyticsResult, TrendDirection } from './analytics'
import { InsightCard } from './components/InsightCard'
import { PatternsEmptyState } from './components/PatternsEmptyState'
import { TrendChart, type ChartSeries } from './components/TrendChart'
import { usePatternsAnalytics } from './usePatternsAnalytics'

import './patterns.css'

/** How many days of the trend to show on the overview chart (kept readable). */
const OVERVIEW_TREND_DAYS = 14

const DIRECTION_ICON: Record<TrendDirection, string> = {
  improving: trendingDownOutline, // distress down = good
  worsening: trendingUpOutline,
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

/** Build the chart series (daily line + rolling average) from the trend. */
function overviewSeries(result: AnalyticsResult): {
  dates: string[]
  series: ChartSeries[]
} {
  const points = result.householdTrend.points.slice(-OVERVIEW_TREND_DAYS)
  return {
    dates: points.map((p) => p.date),
    series: [
      {
        label: 'Daily distress',
        color: 'var(--ion-color-primary)',
        values: points.map((p) => p.score),
      },
      {
        label: '7-day average',
        color: 'var(--ion-color-secondary-shade)',
        values: points.map((p) => p.rollingAverage),
        dashed: true,
      },
    ],
  }
}

function TrendSummary({
  result,
}: {
  readonly result: AnalyticsResult
}): React.JSX.Element {
  const { overallTrend } = result.overview
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
  result,
}: {
  readonly result: AnalyticsResult
}): React.JSX.Element {
  const { dates, series } = overviewSeries(result)
  return (
    <section
      className="patterns-section"
      aria-labelledby="trend-heading"
    >
      <h2
        id="trend-heading"
        className="pattern-calendar-heading"
      >
        Household distress trend
      </h2>
      <p className="patterns-lede">
        Daily average distress score (0 = low, 100 = high). Missing days simply mean no
        check-in yet.
      </p>
      <IonCard>
        <IonCardContent>
          <TrendChart
            dates={dates}
            series={series}
          />
        </IonCardContent>
      </IonCard>
      <TrendSummary result={result} />
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
  result,
}: {
  readonly result: AnalyticsResult
}): React.JSX.Element {
  const { dates, series } = overviewSeries(result)
  const hasTrend = dates.some((_, i) => series[0].values[i] !== null)

  return (
    <>
      <p className="patterns-lede">
        Discover trends and connections — gently, over time.
      </p>

      {/* Weekly headline insight */}
      <div className="pattern-weekly-wrap patterns-section">
        <InsightCard insight={{ ...result.overview.weeklyInsight }} />
      </div>

      {!result.dataQuality.hasEnoughData && (
        <PatternsEmptyState message={result.dataQuality.message} />
      )}

      {/* One major chart: household distress trend */}
      {hasTrend && <TrendSection result={result} />}

      {/* Noteworthy changes */}
      {result.overview.noteworthy.length > 0 && (
        <section className="patterns-section">
          <h2 className="pattern-calendar-heading">Worth noticing</h2>
          {result.overview.noteworthy.map((insight) => (
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
 * Consumes: weekly insight, trend chart data, deeper-pattern cards.
 */
export default function PatternsOverviewPage(): React.JSX.Element {
  const { result, isLoading, hasError } = usePatternsAnalytics()

  return (
    <Page
      title="Patterns"
      className="patterns-page"
      backHref="/dashboard"
    >
      {isLoading && <LoadingState />}
      {hasError && <p>We couldn’t load your patterns just now. Please try again.</p>}
      {!isLoading && !hasError && result && <OverviewContent result={result} />}
    </Page>
  )
}
