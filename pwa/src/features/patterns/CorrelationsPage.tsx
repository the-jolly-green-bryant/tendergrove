import React from 'react'

import { LoadingState } from '../../components/LoadingState'
import { Page } from '../../components/Page'
import type { AnalyticsResult } from './analytics'
import { CorrelationCard } from './components/CorrelationCard'
import { PatternsEmptyState } from './components/PatternsEmptyState'
import { usePatternsAnalytics } from './usePatternsAnalytics'

import './patterns.css'

function CorrelationsContent({
  result,
}: {
  readonly result: AnalyticsResult
}): React.JSX.Element {
  if (result.correlations.length === 0) {
    return (
      <PatternsEmptyState
        title="No clear connections yet"
        message={
          result.dataQuality.hasEnoughData
            ? 'We didn’t find any strong same-day or next-day connections yet. That’s completely normal — we only surface links we’re reasonably confident about.'
            : result.dataQuality.message
        }
      />
    )
  }

  return (
    <>
      <p className="patterns-lede">
        How often one thing appears near another. These are gentle observations, not
        causes — patterns worth watching, based on the last {result.window.days} days.
      </p>
      {result.correlations.map((correlation) => (
        <CorrelationCard
          key={`${correlation.sourceLabel}-${correlation.targetLabel}-${correlation.lagDays}`}
          correlation={correlation}
        />
      ))}
    </>
  )
}

/**
 * Correlations page. Consumes: correlation insights.
 */
export default function CorrelationsPage(): React.JSX.Element {
  const { result, isLoading, hasError } = usePatternsAnalytics()

  return (
    <Page
      title="Correlations"
      className="patterns-page"
      backHref="/patterns"
    >
      {isLoading && <LoadingState />}
      {hasError && <p>We couldn’t load your patterns just now. Please try again.</p>}
      {!isLoading && !hasError && result && <CorrelationsContent result={result} />}
    </Page>
  )
}
