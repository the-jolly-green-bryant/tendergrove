import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonTextarea, useIonViewWillEnter } from '@ionic/react';
import { useMemo } from 'react';
import { Page } from '../../components/Page';
import { useTrackerStore } from '../../stores/trackerStore';
import { buildPlainTextReport } from './reportBuilder';

export default function ReportsPage() {
  const { hydrate, checkIns, incidents, parentCare } = useTrackerStore();
  useIonViewWillEnter(() => { void hydrate(); });
  const report = useMemo(() => buildPlainTextReport(checkIns, incidents, parentCare), [checkIns, incidents, parentCare]);

  const copy = async () => navigator.clipboard.writeText(report);

  return <Page title="Reports">
    <IonCard>
      <IonCardHeader><IonCardTitle>Provider / school summary</IonCardTitle></IonCardHeader>
      <IonCardContent>
        <p>This is intentionally plain text so it can be pasted into an email, MyChart, IEP notes, or a provider message.</p>
        <IonButton onClick={copy}>Copy report</IonButton>
      </IonCardContent>
    </IonCard>
    <IonTextarea autoGrow readonly value={report} className="report-box" />
  </Page>;
}
