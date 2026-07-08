import { IonCard, IonCardContent, IonSkeletonText } from '@ionic/react'
import React from 'react'

/**
 * A calm loading placeholder shaped like the analytics cards, so the page
 * doesn't jump when data arrives. Prefer this over a bare spinner.
 */
export function AnalyticsLoadingSkeleton(): React.JSX.Element {
  return (
    <div
      className="pattern-skeleton"
      aria-hidden="true"
    >
      <IonCard>
        <IonCardContent>
          <IonSkeletonText
            animated
            style={{ width: '55%', height: 18 }}
          />
          <IonSkeletonText
            animated
            style={{ width: '100%', height: 140, marginTop: 14, borderRadius: 12 }}
          />
        </IonCardContent>
      </IonCard>
      {[0, 1].map((row) => (
        <IonCard key={row}>
          <IonCardContent>
            <IonSkeletonText
              animated
              style={{ width: '70%', height: 16 }}
            />
            <IonSkeletonText
              animated
              style={{ width: '90%', height: 12, marginTop: 10 }}
            />
          </IonCardContent>
        </IonCard>
      ))}
    </div>
  )
}
