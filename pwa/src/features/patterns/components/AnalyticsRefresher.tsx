import {
  IonRefresher,
  IonRefresherContent,
  type RefresherCustomEvent,
} from '@ionic/react'
import { useQueryClient } from '@tanstack/react-query'
import React from 'react'

export const AnalyticsRefresher = (): React.JSX.Element => {
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
