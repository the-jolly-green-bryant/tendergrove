import {
  IonButton,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonTextarea,
  IonToggle,
  useIonToast,
} from '@ionic/react'
import { useState } from 'react'
import { Page } from '../../components/Page'
import { SeverityPicker } from '../../components/SeverityPicker'
import { Severity } from '../../lib/domain'
import { useTrackerStore } from '../../stores/trackerStore'

export default function IncidentPage() {
  const addIncident = useTrackerStore((s) => s.addIncident)
  const [present] = useIonToast()
  const [severity, setSeverity] = useState<Severity>(4)
  const [durationMinutes, setDurationMinutes] = useState(15)
  const [trigger, setTrigger] = useState('')
  const [behavior, setBehavior] = useState('')
  const [intervention, setIntervention] = useState('')
  const [recovered, setRecovered] = useState(false)
  const [notes, setNotes] = useState('')

  const save = async () => {
    if (!behavior.trim()) {
      await present({
        message: 'Behavior is required',
        duration: 1200,
        position: 'bottom',
      })
      return
    }
    await addIncident({
      severity,
      durationMinutes,
      trigger: trigger || undefined,
      behavior,
      intervention: intervention || undefined,
      recovered,
      notes: notes || undefined,
    })
    setBehavior('')
    setTrigger('')
    setIntervention('')
    setNotes('')
    setRecovered(false)
    await present({ message: 'Incident saved', duration: 1200, position: 'bottom' })
  }

  return (
    <Page title="Incident">
      <IonList inset>
        <IonItem lines="none">
          <IonLabel>Severity</IonLabel>
        </IonItem>
        <SeverityPicker
          value={severity}
          onChange={setSeverity}
        />
        <IonItem>
          <IonInput
            label="Duration minutes"
            labelPlacement="stacked"
            type="number"
            value={durationMinutes}
            onIonInput={(e) => setDurationMinutes(Number(e.detail.value || 0))}
          />
        </IonItem>
        <IonItem>
          <IonInput
            label="Possible trigger"
            labelPlacement="stacked"
            value={trigger}
            onIonInput={(e) => setTrigger(e.detail.value ?? '')}
          />
        </IonItem>
        <IonItem>
          <IonTextarea
            label="Behavior"
            labelPlacement="stacked"
            value={behavior}
            onIonInput={(e) => setBehavior(e.detail.value ?? '')}
          />
        </IonItem>
        <IonItem>
          <IonTextarea
            label="Intervention"
            labelPlacement="stacked"
            value={intervention}
            onIonInput={(e) => setIntervention(e.detail.value ?? '')}
          />
        </IonItem>
        <IonItem>
          <IonToggle
            checked={recovered}
            onIonChange={(e) => setRecovered(e.detail.checked)}
          >
            Recovered before sleep/end of day
          </IonToggle>
        </IonItem>
        <IonItem>
          <IonTextarea
            label="Notes"
            labelPlacement="stacked"
            value={notes}
            onIonInput={(e) => setNotes(e.detail.value ?? '')}
          />
        </IonItem>
      </IonList>
      <IonButton
        expand="block"
        color="danger"
        onClick={save}
      >
        Save incident
      </IonButton>
    </Page>
  )
}
