import {
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
import { arrowBackOutline, trashOutline } from 'ionicons/icons'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { useIndicators } from './useIndicators'
import { useIndicatorMutations } from './useIndicatorMutations'
import { polarityMeta, type InputType, type Polarity } from './indicatorMeta'

function isPolarity(value: string | undefined): value is Polarity {
  return value === 'undesired' || value === 'desired'
}

/**
 * Allows users to create bespoke indicators for people.
 * @returns {React.JSX.Element}
 * @constructor
 */
export default function IndicatorFormPage() {
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
  const { data: indicators } = useIndicators(isEditing ? personId : undefined)
  const existing = isEditing
    ? indicators?.find((item) => item.id === indicatorId)
    : undefined
  const { create, update, remove } = useIndicatorMutations(personId)

  const polarity: Polarity = isPolarity(polarityParam)
    ? polarityParam
    : ((existing?.polarity as Polarity | undefined) ?? 'undesired')

  const meta = polarityMeta[polarity]

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [inputType, setInputType] = useState<InputType>('boolean')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Prefill once the indicator being edited has loaded.
  useEffect(() => {
    if (!existing) {
      return
    }
    setName(existing.name)
    setDescription(existing.description ?? '')
    setInputType((existing.inputType as InputType | null) ?? 'boolean')
    setNotes(existing.notes ?? '')
  }, [existing])

  function goBack() {
    if (router.canGoBack()) {
      router.goBack()
      return
    }
    router.push(`/person/${personId}/indicators`, 'back', 'pop')
  }

  async function save() {
    const trimmedName = name.trim()
    if (!trimmedName || saving) {
      return
    }

    const payload = {
      name: trimmedName,
      description: description.trim() || undefined,
      notes: notes.trim() || undefined,
      polarity,
      inputType,
    }

    setSaving(true)
    try {
      isEditing && indicatorId
        ? await update(indicatorId, payload)
        : await create(payload)
      router.push(`/person/${personId}/indicators`, 'back', 'pop')
    } finally {
      setSaving(false)
    }
  }

  async function deleteIndicator() {
    if (!indicatorId || saving) {
      return
    }
    setSaving(true)
    try {
      await remove(indicatorId)
      router.push(`/person/${personId}/indicators`, 'back', 'pop')
    } finally {
      setSaving(false)
    }
  }

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton
              fill="clear"
              onClick={goBack}
              aria-label="Go back"
            >
              <IonIcon
                slot="icon-only"
                icon={arrowBackOutline}
              />
            </IonButton>
          </IonButtons>
          <IonTitle>
            {isEditing ? 'Edit' : 'Add'} {meta.title} Indicator
          </IonTitle>
          {isEditing && (
            <IonButtons slot="end">
              <IonButton
                fill="clear"
                color="danger"
                onClick={deleteIndicator}
                aria-label="Delete indicator"
              >
                <IonIcon
                  slot="icon-only"
                  icon={trashOutline}
                />
              </IonButton>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>

      <IonContent
        fullscreen
        className="ion-padding safe-content"
      >
        <div className="indicator-form__icon">
          <IonIcon
            icon={meta.icon}
            color={meta.color}
          />
        </div>

        <p>{meta.blurb}</p>

        <IonList lines="none">
          <IonItem>
            <IonInput
              label="Behavior"
              labelPlacement="stacked"
              placeholder={`e.g. ${meta.examples}`}
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
    </IonPage>
  )
}
