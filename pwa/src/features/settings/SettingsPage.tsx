import {
  IonButton,
  IonCard,
  IonCardContent,
  IonItem,
  IonLabel,
  IonList,
  useIonAlert,
} from '@ionic/react'
import { deleteUser } from 'aws-amplify/auth'
import { Page } from '../../components/Page'
import { client } from '../../lib/api'
import { clearOfflineCache } from '../../lib/resilientCache'
import { usePeople } from '../people/usePeople'

const downloadJson = (value: unknown) => {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `tendergrove-export-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

const SettingsPage = () => {
  const people = usePeople()
  const [presentAlert] = useIonAlert()

  const exportData = async () => {
    const lifeEvents = await client.models.LifeEvent.list()
    downloadJson({
      exportedAt: new Date().toISOString(),
      notice: 'Personal observations; not a diagnosis or medical record.',
      people: people.data ?? [],
      householdEvents: lifeEvents.data,
    })
  }

  const deleteHousehold = async () => {
    const householdId = people.data?.[0]?.householdId
    if (!householdId) return
    const result = await client.models.Person.list({
      filter: { householdId: { eq: householdId } },
      selectionSet: ['id', 'indicators.id', 'checkIns.id', 'events.id'],
    })
    if (result.errors?.length) throw new Error(result.errors[0].message)
    for (const person of result.data) {
      await Promise.all((person.indicators ?? []).map(({ id }) => client.models.Indicator.delete({ id })))
      await Promise.all((person.checkIns ?? []).map(({ id }) => client.models.CheckIn.delete({ id })))
      await Promise.all((person.events ?? []).map(({ id }) => client.models.Event.delete({ id })))
      await client.models.Person.delete({ id: person.id })
    }
    const lifeEvents = await client.models.LifeEvent.list({ filter: { householdId: { eq: householdId } } })
    await Promise.all(lifeEvents.data.map(({ id }) => client.models.LifeEvent.delete({ id })))
    await client.models.Household.delete({ id: householdId })
    clearOfflineCache()
    await people.refetch()
  }

  const confirmHouseholdDelete = () => void presentAlert({
    header: 'Delete household data?',
    message: 'This permanently deletes household members, check-ins, signals, events, and notes. Export first if you need a copy.',
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Delete permanently', role: 'destructive', handler: () => { void deleteHousehold() } },
    ],
  })

  const confirmAccountDelete = () => void presentAlert({
    header: 'Delete account?',
    message: 'Delete household data first. This permanently deletes your sign-in account and signs you out.',
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Delete account', role: 'destructive', handler: () => { void deleteUser() } },
    ],
  })

  return (
    <Page title="Settings" backHref="/dashboard">
      <IonList inset>
        <IonItem button routerLink="/help-now"><IonLabel><h2>Safety plan and crisis resources</h2><p>Country, trusted contact, and immediate help</p></IonLabel></IonItem>
        <IonItem button routerLink="/privacy"><IonLabel>Privacy</IonLabel></IonItem>
        <IonItem button routerLink="/terms"><IonLabel>Terms and medical disclaimer</IonLabel></IonItem>
      </IonList>

      <IonCard>
        <IonCardContent>
          <h2>Your data</h2>
          <p>Export a readable JSON copy before deleting anything.</p>
          <IonButton expand="block" fill="outline" onClick={() => void exportData()}>Export my data</IonButton>
          <IonButton expand="block" fill="outline" onClick={() => { clearOfflineCache(); void presentAlert({ header: 'Saved copies cleared', message: 'Cloud records were not changed.', buttons: ['OK'] }) }}>Clear saved device copies</IonButton>
          <IonButton expand="block" color="danger" fill="outline" onClick={confirmHouseholdDelete}>Delete household data</IonButton>
          <IonButton expand="block" color="danger" fill="clear" onClick={confirmAccountDelete}>Delete account</IonButton>
        </IonCardContent>
      </IonCard>
      <p className="legal-note">Tendergrove does not diagnose, predict emergencies, or replace professional care.</p>
    </Page>
  )
}

export default SettingsPage
