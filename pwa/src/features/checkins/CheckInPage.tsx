import {
  IonButton,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonToggle,
  useIonToast,
} from '@ionic/react'
import { useState } from 'react'
import { Page } from '../../components/Page'
import { SeverityPicker } from '../../components/SeverityPicker'
import { Mood, Severity } from '../../lib/domain'
import { useTrackerStore } from '../../stores/trackerStore'

export default function CheckInPage() {
  const addCheckIn = useTrackerStore((s) => s.addCheckIn)
  const [present] = useIonToast()
  const [mood, setMood] = useState<Mood>('fragile')
  const [severity, setSeverity] = useState<Severity>(3)
  const [sleepQuality, setSleepQuality] = useState<Severity>(3)
  const [toiletingChange, setToiletingChange] = useState(false)
  const [schoolDay, setSchoolDay] = useState(true)
  const [notes, setNotes] = useState('')

  const save = async () => {
    await addCheckIn({
      mood,
      severity,
      sleepQuality,
      toiletingChange,
      schoolDay,
      notes: notes.trim() || undefined,
    })
    setNotes('')
    await present({ message: 'Check-in saved', duration: 1200, position: 'bottom' })
  }

  return (
    <Page title="Child Check-in">
      <IonList inset>
        <IonItem>
          <IonLabel>Mood</IonLabel>
          <IonSelect
            value={mood}
            onIonChange={(e) => setMood(e.detail.value)}
          >
            {['regulated', 'fragile', 'distressed', 'shutdown', 'agitated'].map((x) => (
              <IonSelectOption
                key={x}
                value={x}
              >
                {x}
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>
        <IonItem lines="none">
          <IonLabel>Distress level</IonLabel>
        </IonItem>
        <SeverityPicker
          value={severity}
          onChange={setSeverity}
        />
        <IonItem lines="none">
          <IonLabel>Sleep quality</IonLabel>
        </IonItem>
        <SeverityPicker
          value={sleepQuality}
          onChange={setSleepQuality}
        />
        <IonItem>
          <IonToggle
            checked={schoolDay}
            onIonChange={(e) => setSchoolDay(e.detail.checked)}
          >
            School day
          </IonToggle>
        </IonItem>
        <IonItem>
          <IonToggle
            checked={toiletingChange}
            onIonChange={(e) => setToiletingChange(e.detail.checked)}
          >
            Toileting or regression change
          </IonToggle>
        </IonItem>
        <IonItem>
          <IonTextarea
            label="Notes"
            labelPlacement="stacked"
            value={notes}
            onIonInput={(e) => setNotes(e.detail.value ?? '')}
            placeholder="Tiny observation, not an essay"
          />
        </IonItem>
      </IonList>
      <IonButton
        expand="block"
        onClick={save}
      >
        Save check-in
      </IonButton>
    </Page>
  )
}
