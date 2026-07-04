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
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { useIndicators } from './useIndicators'
import { useIndicatorMutations } from './useIndicatorMutations'
import { polarityMeta, type Polarity } from './indicatorMeta'

function isPolarity(value: string | undefined): value is Polarity {
  return value === 'undesired' || value === 'desired'
}

async function performWrite(
  personId: string,
  isEditing: boolean,
  indicatorId: string | undefined,
  payload: {
    name: string
    description: string | undefined
    notes: string | undefined
    polarity: 'desired' | 'undesired'
    inputType: 'boolean'
  },
) {
  const { create, update } = useIndicatorMutations(personId)
  return isEditing && indicatorId
    ? await update(indicatorId, payload)
    : await create(payload)
}

const renderDeleteButton = (deleteIndicator: () => void) => (
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
)

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
  const { remove } = useIndicatorMutations(personId)

  const polarity: Polarity = isPolarity(polarityParam)
    ? polarityParam
    : (existing?.polarity ?? 'undesired')

  const meta = polarityMeta[polarity]

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Prefill once the indicator being edited has loaded.
  useEffect(() => {
    if (!existing) {
      return
    }
    setName(existing.name)
    setDescription(existing.description ?? '')
    setNotes(existing.notes ?? '')
  }, [existing])

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
      inputType: 'boolean' as const,
    }

    setSaving(true)
    try {
      await performWrite(personId, isEditing, indicatorId, payload)
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
            <IonBackButton
              defaultHref={`/person/${personId}/indicators`}
              text=""
            />
          </IonButtons>
          <IonTitle>
            {isEditing ? 'Edit' : 'Add'} {meta.title} Indicator
          </IonTitle>
          {isEditing && renderDeleteButton(deleteIndicator)}
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
