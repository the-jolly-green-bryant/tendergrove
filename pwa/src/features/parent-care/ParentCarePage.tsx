import {
  IonButton,
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

/**
 * TODO - Refactors into person care page
 * @returns {React.JSX.Element}
 * @constructor
 */
export default function ParentCarePage() {
  const addParentCare = useTrackerStore((s) => s.addParentCare)
  const [present] = useIonToast()
  const [brushedTeeth, setBrushedTeeth] = useState(false)
  const [ateMeal, setAteMeal] = useState(false)
  const [drankWater, setDrankWater] = useState(false)
  const [sleptEnough, setSleptEnough] = useState(false)
  const [stress, setStress] = useState<Severity>(3)
  const [notes, setNotes] = useState('')

  const save = async () => {
    await addParentCare({
      brushedTeeth,
      ateMeal,
      drankWater,
      sleptEnough,
      stress,
      notes: notes || undefined,
    })
    setNotes('')
    await present({ message: 'Care check saved', duration: 1200, position: 'bottom' })
  }

  return (
    <Page title="Parent Care">
      <IonList inset>
        <IonItem>
          <IonToggle
            checked={brushedTeeth}
            onIonChange={(e) => setBrushedTeeth(e.detail.checked)}
          >
            Brushed teeth
          </IonToggle>
        </IonItem>
        <IonItem>
          <IonToggle
            checked={ateMeal}
            onIonChange={(e) => setAteMeal(e.detail.checked)}
          >
            Ate real food
          </IonToggle>
        </IonItem>
        <IonItem>
          <IonToggle
            checked={drankWater}
            onIonChange={(e) => setDrankWater(e.detail.checked)}
          >
            Drank water
          </IonToggle>
        </IonItem>
        <IonItem>
          <IonToggle
            checked={sleptEnough}
            onIonChange={(e) => setSleptEnough(e.detail.checked)}
          >
            Slept enough
          </IonToggle>
        </IonItem>
        <IonItem lines="none">
          <IonLabel>Stress</IonLabel>
        </IonItem>
        <SeverityPicker
          value={stress}
          onChange={setStress}
        />
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
        onClick={save}
      >
        Save parent check
      </IonButton>
    </Page>
  )
}
