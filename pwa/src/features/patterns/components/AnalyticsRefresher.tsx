import {
  IonRefresher,
  IonRefresherContent,
  type RefresherCustomEvent,
} from '@ionic/react'
import { useQueryClient } from '@tanstack/react-query'
import React from 'react'

/**
 * Pull-to-refresh for the analytics pages. Invalidates the shared household
 * query so every Patterns page recomputes from fresh data. Must be rendered as
 * a direct child of the page's `IonContent` (the `Page` component satisfies
 * this by rendering children straight into its content).
 */
export function AnalyticsRefresher(): React.JSX.Element {
  const queryClient = useQueryClient()

  const handleRefresh = async (event: RefresherCustomEvent) => {
    try {
      await queryClient.invalidateQueries({ queryKey: ['patterns-data'] })
    } finally {
      await event.detail.complete()
    }
  }

  return (
    <IonRefresher
      slot="fixed"
      onIonRefresh={handleRefresh}
    >
      <IonRefresherContent />
    </IonRefresher>
  )
}
