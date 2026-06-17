import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
} from '@ionic/react'

export function StatCard({
  title,
  value,
  note,
}: {
  title: string
  value: string | number
  note?: string
}) {
  return (
    <IonCard className="stat-card">
      <IonCardHeader>
        <IonCardSubtitle>{title}</IonCardSubtitle>
        <IonCardTitle>{value}</IonCardTitle>
      </IonCardHeader>
      {note && <IonCardContent>{note}</IonCardContent>}
    </IonCard>
  )
}
