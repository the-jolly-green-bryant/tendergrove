import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonTitle,
  IonToolbar,
  IonPage,
  useIonRouter,
} from '@ionic/react'
import { trashOutline } from 'ionicons/icons'
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { LoadingState } from '../../../components/LoadingState'
import { useIndicators } from './useIndicators'
import { type IndicatorInput, useIndicatorMutations } from './useIndicatorMutations'
import { polarityMeta, type Polarity } from './indicatorMeta'

const isPolarity = (value: string | undefined): value is Polarity =>
  value === 'undesired' || value === 'desired'

const renderDeleteButton = (deleteIndicator: () => void) => (
  <IonButtons slot="end">
    <IonButton
      fill="clear"
      color="danger"
      onClick={deleteIndicator}
      aria-label="Delete signal"
    >
      <IonIcon
        slot="icon-only"
        icon={trashOutline}
      />
    </IonButton>
  </IonButtons>
)

interface IndicatorFormHeaderProps {
  readonly deleteIndicator: () => void
  readonly isEditing: boolean
  readonly personId: string
  readonly title: string
}

const IndicatorFormHeader = ({
  deleteIndicator,
  isEditing,
  personId,
  title,
}: IndicatorFormHeaderProps) => (
  <IonHeader translucent>
    <IonToolbar>
      <IonButtons slot="start">
        <IonBackButton
          defaultHref={`/person/${personId}/indicators`}
          text=""
        />
      </IonButtons>
      <IonTitle>{title}</IonTitle>
      {isEditing && renderDeleteButton(deleteIndicator)}
    </IonToolbar>
  </IonHeader>
)

interface IndicatorFormContentProps {
  readonly exampleText: string
  readonly icon: string
  readonly color: 'danger' | 'success'
  readonly blurb: string
  readonly name: string
  readonly saving: boolean
  readonly save: () => void
  readonly setName: (name: string) => void
}

const IndicatorFormContent = ({
  exampleText,
  icon,
  color,
  blurb,
  name,
  saving,
  save,
  setName,
}: IndicatorFormContentProps) => (
  <IonContent
    fullscreen
    className="ion-padding safe-content"
  >
    <div className="indicator-form__icon">
      <IonIcon
        icon={icon}
        color={color}
      />
    </div>

    <p>{blurb}</p>

    <IonList lines="none">
      <IonItem>
        <IonInput
          label="Behavior"
          labelPlacement="stacked"
          placeholder={`e.g. ${exampleText}`}
          value={name}
          onIonInput={(event) => setName(event.detail.value ?? '')}
        />
      </IonItem>
    </IonList>

    <IonButton
      expand="block"
      disabled={!name.trim() || saving}
      onClick={save}
    >
      Save Indicator
    </IonButton>
  </IonContent>
)

const createIndicatorPayload = (
  name: string,
  description: string,
  notes: string,
  polarity: Polarity,
): IndicatorInput => ({
  name,
  description: description.trim() || undefined,
  notes: notes.trim() || undefined,
  polarity,
  inputType: 'boolean',
})

type ExistingIndicator = NonNullable<ReturnType<typeof useIndicators>['data']>[number]
type IndicatorMutations = ReturnType<typeof useIndicatorMutations>

const useIndicatorDraft = (existing: ExistingIndicator | undefined) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!existing) return
    setName(existing.name)
    setDescription(existing.description ?? '')
    setNotes(existing.notes ?? '')
  }, [existing])

  return { description, name, notes, setName }
}

interface IndicatorActionsParams {
  readonly draft: ReturnType<typeof useIndicatorDraft>
  readonly indicatorId: string | undefined
  readonly isEditing: boolean
  readonly mutations: IndicatorMutations
  readonly personId: string
  readonly polarity: Polarity
  readonly router: ReturnType<typeof useIonRouter>
}

const useIndicatorActions = ({
  draft,
  indicatorId,
  isEditing,
  mutations,
  personId,
  polarity,
  router,
}: IndicatorActionsParams) => {
  const [saving, setSaving] = useState(false)
  const returnToList = () =>
    router.push(`/person/${personId}/indicators`, 'back', 'pop')

  const save = async () => {
    const trimmedName = draft.name.trim()
    if (!trimmedName || saving) return

    const payload = createIndicatorPayload(
      trimmedName,
      draft.description,
      draft.notes,
      polarity,
    )

    setSaving(true)
    try {
      if (isEditing && indicatorId) await mutations.update(indicatorId, payload)
      else await mutations.create(payload)
      returnToList()
    } finally {
      setSaving(false)
    }
  }

  const deleteIndicator = async () => {
    if (!indicatorId || saving) return
    setSaving(true)
    try {
      await mutations.remove(indicatorId)
      returnToList()
    } finally {
      setSaving(false)
    }
  }

  return { deleteIndicator, save, saving }
}

/**
 * Allows users to create bespoke indicators for people.
 * @returns {React.JSX.Element}
 * @constructor
 */
const IndicatorFormPage = (): React.JSX.Element => {
  const router = useIonRouter()
  const {
    personId,
    polarity: polarityParam,
    indicatorId,
  } = useParams<{
    personId: string
    polarity?: string
    indicatorId?: string
  }>()

  const isEditing = Boolean(indicatorId)
  const { data: indicators, isLoading } = useIndicators(
    isEditing ? personId : undefined,
  )
  const existing = isEditing
    ? indicators?.find((item) => item.id === indicatorId)
    : undefined
  const mutations = useIndicatorMutations(personId)

  const polarity: Polarity = isPolarity(polarityParam)
    ? polarityParam
    : (existing?.polarity ?? 'undesired')

  const meta = polarityMeta[polarity]
  const draft = useIndicatorDraft(existing)
  const { deleteIndicator, save, saving } = useIndicatorActions({
    draft,
    indicatorId,
    isEditing,
    mutations,
    personId,
    polarity,
    router,
  })

  return (
    <IonPage>
      <IndicatorFormHeader
        deleteIndicator={deleteIndicator}
        isEditing={isEditing}
        personId={personId}
        title={`${isEditing ? 'Edit' : 'Add'} ${meta.title} Signal`}
      />
      {isEditing && isLoading ? (
        <IonContent
          fullscreen
          className="ion-padding safe-content"
        >
          <LoadingState
            variant="form"
            label="Loading signal form"
            rows={3}
          />
        </IonContent>
      ) : (
        <IndicatorFormContent
          blurb={meta.blurb}
          color={meta.color}
          exampleText={meta.examples}
          icon={meta.icon}
          name={draft.name}
          saving={saving}
          save={save}
          setName={draft.setName}
        />
      )}
    </IonPage>
  )
}

export default IndicatorFormPage
