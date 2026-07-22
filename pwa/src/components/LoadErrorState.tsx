import { IonButton, IonIcon } from '@ionic/react'
import { cloudOfflineOutline, refreshOutline } from 'ionicons/icons'

export const LoadErrorState = ({
  noun,
  onRetry,
  showingSavedCopy = false,
}: {
  readonly noun: string
  readonly onRetry: () => void
  readonly showingSavedCopy?: boolean
}) => (
  <section className="load-error" role="alert">
    <IonIcon icon={cloudOfflineOutline} aria-hidden="true" />
    <div>
      <h2>We couldn’t refresh {noun}</h2>
      <p>
        {showingSavedCopy
          ? 'You’re seeing the most recent copy saved on this device. Nothing shown here has been deleted.'
          : 'Your information may still be safe. Check your connection and try again.'}
      </p>
      <IonButton fill="outline" size="small" onClick={onRetry}>
        <IonIcon slot="start" icon={refreshOutline} />
        Try again
      </IonButton>
    </div>
  </section>
)
