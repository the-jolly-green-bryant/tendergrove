import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { ReactNode } from 'react';

export function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar><IonTitle>{title}</IonTitle></IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding safe-content">
        <IonHeader collapse="condense"><IonToolbar><IonTitle size="large">{title}</IonTitle></IonToolbar></IonHeader>
        {children}
      </IonContent>
    </IonPage>
  );
}
