import React from 'react'

import { LoadingState } from '../../components/LoadingState'
import { Page } from '../../components/Page'
import type { ScopedPatternsView } from './analytics'
import { CorrelationCard } from './components/CorrelationCard'
import { PatternsEmptyState } from './components/PatternsEmptyState'
import { PatternsFilterBar } from './components/PatternsFilterBar'
import { useScopedPatterns } from './useScopedPatterns'

import './patterns.css'

function CorrelationsContent({
  view,
}: {
  readonly view: ScopedPatternsView
}): React.JSX.Element {
  if (view.correlations.length === 0) {
    const who = view.personName ? `for ${view.personName}` : 'yet'
    return (
      <PatternsEmptyState
        title="No clear connections yet"
        message={`We didn’t find any strong same-day or next-day connections ${who}. That’s completely normal — we only surface links we’re reasonably confident about.`}
      />
    )
  }

  return (
    <>
      <p className="patterns-lede">
        How often one thing appears near another. These are gentle observations, not
        causes — patterns worth watching.
      </p>
      {view.correlations.map((correlation) => (
        <CorrelationCard
          key={`${correlation.sourceLabel}-${correlation.targetLabel}-${correlation.lagDays}`}
          correlation={correlation}
        />
      ))}
    </>
  )
}

/**
 * Correlations page. Consumes: correlation insights (scoped by the shared filter).
 */
export default function CorrelationsPage(): React.JSX.Element {
  const { view, isLoading, hasError } = useScopedPatterns()

  return (
    <Page
      title="Correlations"
      className="patterns-page"
      backHref="/patterns"
    >
      {isLoading && <LoadingState />}
      {hasError && <p>We couldn’t load your patterns just now. Please try again.</p>}
      {!isLoading && !hasError && view && (
        <>
          <PatternsFilterBar />
          <CorrelationsContent view={view} />
        </>
      )}
    </Page>
  )
}
