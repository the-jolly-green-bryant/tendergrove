import { FlippableCard } from './FlippableCard'
import { IonCardContent } from '@ionic/react'

export const StatCard = ({
  title,
  value,
  note,
}: {
  readonly title: string
  readonly value: string | number
  readonly note?: string
}) => (
  <FlippableCard className="stat-card" kicker={title} title={value}>
    {note && <IonCardContent>{note}</IonCardContent>}
  </FlippableCard>
)
