import React from 'react'
import { IonButton, IonCard, IonCardContent } from '@ionic/react'

import { Page } from '../../components/Page'
import type { ScopedPatternsView } from './analytics'
import { AnalyticsLoadingSkeleton } from './components/AnalyticsLoadingSkeleton'
import { AnalyticsRefresher } from './components/AnalyticsRefresher'
import { GeneratedInsightCard } from './components/GeneratedInsightCard'
import { PatternsFilterBar } from './components/PatternsFilterBar'
import { useHumanInsights } from './useHumanInsights'
import { useScopedPatterns } from './useScopedPatterns'

import './patterns.scss'

const InsightsContent = ({
  view,
}: {
  readonly view: ScopedPatternsView
}): React.JSX.Element => {
  const { insights } = useHumanInsights(
    view.personId ?? 'household',
    view.generatedInsights,
  )

  if (insights.length === 0) {
    return (
      <IonCard className="first-week-payoff"><IonCardContent>
        <h2>Your starting picture</h2>
        <p>{view.scoredDays === 0 ? 'Your first check-in will create a baseline.' : `${view.scoredDays} day${view.scoredDays === 1 ? '' : 's'} recorded so far. That is already useful context for an appointment.`}</p>
        <h3>Questions worth noticing next</h3>
        <ul>
          <li>What changed in the hours before a difficult period?</li>
          <li>How much sleep, food, and quiet time came beforehand?</li>
          <li>What support was accepted, and what seemed to make things worse?</li>
          <li>Did your own exhaustion change what help was available?</li>
        </ul>
        <p>There is no streak to protect. Check in when you can; we will wait for enough observations before calling something a pattern.</p>
        <IonButton routerLink="/reports">Prepare for an appointment now</IonButton>
      </IonCardContent></IonCard>
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

const PatternInsightsPage = (): React.JSX.Element => {
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

export default PatternInsightsPage
