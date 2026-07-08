import React from 'react'

import { Page } from '../../components/Page'
import type { ScopedPatternsView } from './analytics'
import { AnalyticsLoadingSkeleton } from './components/AnalyticsLoadingSkeleton'
import { AnalyticsRefresher } from './components/AnalyticsRefresher'
import { GeneratedInsightCard } from './components/GeneratedInsightCard'
import { PatternsEmptyState } from './components/PatternsEmptyState'
import { PatternsFilterBar } from './components/PatternsFilterBar'
import { useHumanInsights } from './useHumanInsights'
import { useScopedPatterns } from './useScopedPatterns'

import './patterns.scss'

function InsightsContent({
  view,
}: {
  readonly view: ScopedPatternsView
}): React.JSX.Element {
  const { insights } = useHumanInsights(
    view.personId ?? 'household',
    view.generatedInsights,
  )

  if (insights.length === 0) {
    const who = view.personName ? `for ${view.personName}` : ''
    return (
      <PatternsEmptyState
        title="No clear takeaways yet"
        message={`We don’t have enough to draw confident conclusions ${who} just yet. A week or two of check-ins usually does it.`}
      />
    )
  }

  return (
    <>
      <p className="patterns-lede">
        Plain-language takeaways from the data — the most useful first. These are gentle
        observations to notice, never medical advice.
      </p>
      {insights.map((insight) => (
        <GeneratedInsightCard
          key={insight.id}
          insight={insight}
        />
      ))}
    </>
  )
}

/**
 * Insights page. Human-readable conclusions, almost no charts. Consumes the
 * scoped `generatedInsights`.
 */
export default function PatternInsightsPage(): React.JSX.Element {
  const { view, isLoading, hasError } = useScopedPatterns()

  return (
    <Page
      title="Insights"
      className="patterns-page"
      backHref="/patterns"
    >
      <AnalyticsRefresher />
      {isLoading && <AnalyticsLoadingSkeleton />}
      {hasError && <p>We couldn’t load your patterns just now. Please try again.</p>}
      {!isLoading && !hasError && view && (
        <>
          <PatternsFilterBar />
          <InsightsContent view={view} />
        </>
      )}
    </Page>
  )
}
