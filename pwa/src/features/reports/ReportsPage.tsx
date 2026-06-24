import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonTextarea,
  useIonViewWillEnter,
} from '@ionic/react'
import { useMemo } from 'react'
import { Page } from '../../components/Page'
import { useTrackerStore } from '../../stores/trackerStore'

/**
 * Users can view a list of relevant reports with ability to export and share reports
 *  to relevant third-parties.
 *
 * @returns {React.JSX.Element}
 * @constructor
 */
export default function ReportsPage() {
  const { hydrate, checkIns, incidents, parentCare } = useTrackerStore()
  useIonViewWillEnter(() => {
    void hydrate()
  })
  const report = useMemo(() => 'blah', [checkIns, incidents, parentCare])

  const copy = async () => navigator.clipboard.writeText(report)

  return (
    <Page title="Reports">
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>Provider / school summary</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <p>
            This is intentionally plain text so it can be pasted into an email, MyChart,
            IEP notes, or a provider message.
          </p>
          <IonButton onClick={copy}>Copy report</IonButton>
        </IonCardContent>
      </IonCard>
      <IonTextarea
        autoGrow
        readonly
        value={report}
        className="report-box"
      />
    </Page>
  )
}
