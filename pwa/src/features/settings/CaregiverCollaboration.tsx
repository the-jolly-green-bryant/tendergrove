import { IonButton, IonInput, IonItem, IonLabel, IonList, IonSelect, IonSelectOption } from '@ionic/react'
import { useEffect, useState } from 'react'

import { useAppAuth } from '../../auth/AuthContext'
import { client } from '../../lib/api'
import { usePeople } from '../people/usePeople'
import { trackProductEvent } from '../../lib/productAnalytics'

type Access = {
  id: string
  personId: string
  personName: string
  invitedUserId: string
}

const addUser = (current: readonly (string | null)[] | null | undefined, userId: string) =>
  [...new Set([...(current ?? []).filter((item): item is string => Boolean(item)), userId])]

export const CaregiverCollaboration = () => {
  const { user } = useAppAuth()
  const people = usePeople()
  const activePeople = (people.data ?? []).filter((person) => !person.archived)
  const [personId, setPersonId] = useState('')
  const [collaboratorId, setCollaboratorId] = useState('')
  const [accesses, setAccesses] = useState<Access[]>([])
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [available, setAvailable] = useState(true)

  const load = async () => {
    const result = await client.models.CaregiverAccess.list()
    if (result.errors?.length) {
      setAvailable(false)
      return
    }
    setAvailable(true)
    setAccesses(result.data as Access[])
  }
  useEffect(() => { void load() }, [])

  const grant = async () => {
    const selectedId = personId || activePeople[0]?.id
    const invitedUserId = collaboratorId.trim()
    const selected = activePeople.find((person) => person.id === selectedId)
    if (!selected || !invitedUserId) return
    if (invitedUserId === user?.userId) return setMessage('That is your own Grove account ID.')
    setSaving(true)
    setMessage('')
    try {
      const result = await client.models.Person.get(
        { id: selected.id },
        { selectionSet: ['id', 'collaborators', 'indicators.id', 'indicators.collaborators', 'checkIns.id', 'checkIns.collaborators', 'events.id', 'events.collaborators'] },
      )
      if (result.errors?.length || !result.data) throw new Error(result.errors?.[0]?.message ?? 'Person not found.')
      await client.models.Person.update({ id: selected.id, collaborators: addUser(result.data.collaborators, invitedUserId) })
      await Promise.all((result.data.indicators ?? []).map((item) => client.models.Indicator.update({ id: item.id, collaborators: addUser(item.collaborators, invitedUserId) })))
      await Promise.all((result.data.checkIns ?? []).map((item) => client.models.CheckIn.update({ id: item.id, collaborators: addUser(item.collaborators, invitedUserId) })))
      await Promise.all((result.data.events ?? []).map((item) => client.models.Event.update({ id: item.id, collaborators: addUser(item.collaborators, invitedUserId) })))
      await client.models.CaregiverAccess.create({ personId: selected.id, personName: selected.displayName, invitedUserId, role: 'viewer', collaborators: [invitedUserId] })
      await client.models.CollaborationAudit.create({ personId: selected.id, action: 'granted', invitedUserId })
      void trackProductEvent('collaboration_granted', { access: 'read_only' })
      setCollaboratorId('')
      setMessage(`Read-only access to ${selected.displayName} is active.`)
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Access could not be added.')
    } finally {
      setSaving(false)
    }
  }

  const revoke = async (access: Access) => {
    setSaving(true)
    try {
      const result = await client.models.Person.get(
        { id: access.personId },
        { selectionSet: ['id', 'collaborators', 'indicators.id', 'indicators.collaborators', 'checkIns.id', 'checkIns.collaborators', 'events.id', 'events.collaborators'] },
      )
      const without = (values: readonly (string | null)[] | null | undefined) => (values ?? []).filter((value): value is string => Boolean(value) && value !== access.invitedUserId)
      if (result.data) {
        await client.models.Person.update({ id: result.data.id, collaborators: without(result.data.collaborators) })
        await Promise.all((result.data.indicators ?? []).map((item) => client.models.Indicator.update({ id: item.id, collaborators: without(item.collaborators) })))
        await Promise.all((result.data.checkIns ?? []).map((item) => client.models.CheckIn.update({ id: item.id, collaborators: without(item.collaborators) })))
        await Promise.all((result.data.events ?? []).map((item) => client.models.Event.update({ id: item.id, collaborators: without(item.collaborators) })))
      }
      await client.models.CaregiverAccess.delete({ id: access.id })
      await client.models.CollaborationAudit.create({ personId: access.personId, action: 'revoked', invitedUserId: access.invitedUserId })
      setMessage(`Access to ${access.personName} was removed.`)
      await load()
    } finally {
      setSaving(false)
    }
  }

  return <section>
    <p>Give another Grove account read-only access to one person’s structured observations, check-ins, and events. Free-text notes and descriptions remain private to the account owner. They cannot edit or delete records.</p>
    <p className="legal-note">Your Grove account ID: <code>{user?.userId}</code></p>
    {!available && <p>Collaboration will become available after the latest Grove backend deployment finishes.</p>}
    <IonList inset>
      <IonItem><IonSelect label="Person to share" value={personId || activePeople[0]?.id} onIonChange={(event) => setPersonId(event.detail.value)}>{activePeople.map((person) => <IonSelectOption key={person.id} value={person.id}>{person.displayName}</IonSelectOption>)}</IonSelect></IonItem>
      <IonItem><IonInput label="Collaborator’s Grove account ID" labelPlacement="stacked" value={collaboratorId} onIonInput={(event) => setCollaboratorId(event.detail.value ?? '')} /></IonItem>
    </IonList>
    <IonButton disabled={!available || saving || !collaboratorId.trim() || activePeople.length === 0} onClick={() => void grant()}>{saving ? 'Saving…' : 'Grant read-only access'}</IonButton>
    {message && <p>{message}</p>}
    {accesses.length > 0 && <IonList inset>{accesses.map((access) => <IonItem key={access.id}><IonLabel><h3>{access.personName}</h3><p>Viewer · {access.invitedUserId}</p></IonLabel><IonButton slot="end" color="danger" fill="clear" disabled={saving} onClick={() => void revoke(access)}>Revoke</IonButton></IonItem>)}</IonList>}
  </section>
}
