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
import { useState } from 'react'
import { Page } from '../../components/Page'
import { client } from '../../lib/api'
import { clearOfflineCache } from '../../lib/resilientCache'
import { usePeople } from '../people/usePeople'
import { ReminderSettings } from './ReminderSettings'
import { CaregiverCollaboration } from './CaregiverCollaboration'

const downloadJson = (value: unknown): { url: string; name: string } => {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const name = `grove-care-export-${new Date().toISOString().slice(0, 10)}.json`
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.style.display = 'none'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  return { url, name }
}

const SettingsPage = () => {
  const people = usePeople()
  const [presentAlert] = useIonAlert()
  const [preparedExport, setPreparedExport] = useState<{
    url: string
    name: string
  } | null>(null)
  const [exporting, setExporting] = useState(false)

  const exportData = async () => {
    setExporting(true)
    try {
      const lifeEvents = await client.models.LifeEvent.list()
      if (lifeEvents.errors?.length) throw new Error(lifeEvents.errors[0].message)
      if (preparedExport) URL.revokeObjectURL(preparedExport.url)
      setPreparedExport(
        downloadJson({
          exportedAt: new Date().toISOString(),
          notice: 'Personal observations; not a diagnosis or medical record.',
          people: people.data ?? [],
          householdEvents: lifeEvents.data,
        }),
      )
    } finally {
      setExporting(false)
    }
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
      await Promise.all(
        (person.indicators ?? []).map(({ id }) =>
          client.models.Indicator.delete({ id }),
        ),
      )
      await Promise.all(
        (person.checkIns ?? []).map(({ id }) => client.models.CheckIn.delete({ id })),
      )
      await Promise.all(
        (person.events ?? []).map(({ id }) => client.models.Event.delete({ id })),
      )
      await client.models.Person.delete({ id: person.id })
    }
    const lifeEvents = await client.models.LifeEvent.list({
      filter: { householdId: { eq: householdId } },
    })
    await Promise.all(
      lifeEvents.data.map(({ id }) => client.models.LifeEvent.delete({ id })),
    )
    await client.models.Household.delete({ id: householdId })
    clearOfflineCache()
    await people.refetch()
  }

  const confirmHouseholdDelete = () =>
    void presentAlert({
      header: 'Delete household data?',
      message:
        'This permanently deletes household members, check-ins, signals, events, and notes. Export first if you need a copy.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete permanently',
          role: 'destructive',
          handler: () => {
            void deleteHousehold()
          },
        },
      ],
    })

  const confirmAccountDelete = () =>
    void presentAlert({
      header: 'Delete account?',
      message:
        'Delete household data first. This permanently deletes your sign-in account and signs you out.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete account',
          role: 'destructive',
          handler: () => {
            void deleteUser()
          },
        },
      ],
    })

  return (
    <Page
      title="Settings"
      backHref="/dashboard"
      className="settings-page"
    >
      <IonList
        inset
        className="settings-nav"
      >
        <IonItem
          button
          routerLink="/help-now"
        >
          <IonLabel>
            <h2>Safety plan and crisis resources</h2>
            <p>Country, trusted contact, and immediate help</p>
          </IonLabel>
        </IonItem>
        <IonItem
          button
          routerLink="/privacy"
        >
          <IonLabel>Privacy</IonLabel>
        </IonItem>
        <IonItem
          button
          routerLink="/terms"
        >
          <IonLabel>Terms of Use &amp; Medical Disclaimer</IonLabel>
        </IonItem>
      </IonList>

      <IonCard>
        <IonCardContent>
          <h2>Your data</h2>
          <p>Export a readable JSON copy before deleting anything.</p>
          <IonButton
            expand="block"
            fill="outline"
            disabled={exporting}
            onClick={() => void exportData()}
          >
            {exporting ? 'Preparing export…' : 'Export my data'}
          </IonButton>
          {preparedExport && (
            <p className="legal-note">
              If the download did not open automatically,{' '}
              <a
                href={preparedExport.url}
                download={preparedExport.name}
              >
                download the prepared export
              </a>
              .
            </p>
          )}
          <IonButton
            expand="block"
            fill="outline"
            onClick={() => {
              clearOfflineCache()
              void presentAlert({
                header: 'Saved copies cleared',
                message: 'Cloud records were not changed.',
                buttons: ['OK'],
              })
            }}
          >
            Clear saved device copies
          </IonButton>
          <IonButton
            expand="block"
            color="danger"
            fill="outline"
            onClick={confirmHouseholdDelete}
          >
            Delete household data
          </IonButton>
          <IonButton
            expand="block"
            color="danger"
            fill="clear"
            onClick={confirmAccountDelete}
          >
            Delete account
          </IonButton>
        </IonCardContent>
      </IonCard>
      <IonCard>
        <IonCardContent>
          <ReminderSettings />
        </IonCardContent>
      </IonCard>
      <IonCard>
        <IonCardContent>
          <CaregiverCollaboration />
        </IonCardContent>
      </IonCard>
      <p className="legal-note">
        Grove does not diagnose, predict emergencies, or replace professional care.
      </p>
    </Page>
  )
}

export default SettingsPage
