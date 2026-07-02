import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonRadio,
  IonRadioGroup,
  IonTitle,
  IonToolbar,
  useIonRouter,
} from '@ionic/react'
import {
  arrowBackOutline,
  cameraOutline,
  closeOutline,
  personCircleOutline,
  peopleOutline,
  heartOutline,
  accessibilityOutline,
} from 'ionicons/icons'
import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { PersonRole } from '../../lib/domain'
import { client } from '../../lib/api'
import { useAppAuth } from '../../auth/AuthContext'
import { usePerson } from './usePerson'
import { PersonAvatar } from '../../components/PersonAvatar'

const roleOptions: Array<{
  value: PersonRole
  label: string
  description: string
  icon: string
}> = [
  {
    value: 'self',
    label: 'Myself',
    description: 'Track your own well-being',
    icon: personCircleOutline,
  },
  {
    value: 'child',
    label: 'Child',
    description: 'Track your child',
    icon: accessibilityOutline,
  },
  {
    value: 'spouse',
    label: 'Spouse',
    description: 'Track your partner',
    icon: heartOutline,
  },
  {
    value: 'parent',
    label: 'Parent',
    description: 'Track a parent',
    icon: peopleOutline,
  },
  {
    value: 'caregiver',
    label: 'Caregiver',
    description: 'Track a caregiver',
    icon: peopleOutline,
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Someone else',
    icon: personCircleOutline,
  },
]

const AVATAR_IMAGE_SIZE = 320
const AVATAR_JPEG_QUALITY = 0.82
const MAX_AVATAR_UPLOAD_BYTES = 8 * 1024 * 1024

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not read that image. Try a different photo.'))
    }
    image.src = objectUrl
  })
}

async function createAvatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file.')
  }
  if (file.size > MAX_AVATAR_UPLOAD_BYTES) {
    throw new Error('Choose an image smaller than 8 MB.')
  }

  const image = await loadImageFromFile(file)
  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight)

  if (!sourceSize) {
    throw new Error('Could not read that image. Try a different photo.')
  }

  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_IMAGE_SIZE
  canvas.height = AVATAR_IMAGE_SIZE

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Photo upload is not available on this device.')
  }

  context.drawImage(
    image,
    (image.naturalWidth - sourceSize) / 2,
    (image.naturalHeight - sourceSize) / 2,
    sourceSize,
    sourceSize,
    0,
    0,
    AVATAR_IMAGE_SIZE,
    AVATAR_IMAGE_SIZE,
  )

  return canvas.toDataURL('image/jpeg', AVATAR_JPEG_QUALITY)
}

function getSaveButtonLabel(isProcessingPhoto: boolean, isEditing: boolean): string {
  if (isProcessingPhoto) return 'Preparing photo...'
  return isEditing ? 'Save Changes' : 'Next'
}

const renderHeader = (fnBack: () => void, fnClose: () => void, isEditing: boolean) => (
  <IonHeader translucent>
    <IonToolbar>
      <IonButtons slot="start">
        {isEditing ? (
          <IonBackButton
            defaultHref="/dashboard"
            text=""
          />
        ) : (
          <IonButton
            fill="clear"
            onClick={fnBack}
            aria-label="Go back"
          >
            <IonIcon
              slot="icon-only"
              icon={arrowBackOutline}
            />
          </IonButton>
        )}
      </IonButtons>

      <IonTitle />

      <IonButtons
        slot="end"
        className="person-photo-upload"
      >
        <IonButton
          fill="clear"
          onClick={fnClose}
        >
          <IonIcon icon={closeOutline} />
        </IonButton>
      </IonButtons>
    </IonToolbar>
  </IonHeader>
)

/**
 * Allows us to create or edit a person.
 * @returns {React.JSX.Element}
 * @constructor
 */
export default function PersonFormPage() {
  const router = useIonRouter()
  const queryClient = useQueryClient()
  const { user } = useAppAuth()
  const { personId } = useParams<{ personId?: string }>()

  const isEditing = Boolean(personId)
  const { data: existingPerson } = usePerson(isEditing ? personId : undefined)

  const photoInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<1 | 2>(isEditing ? 2 : 1)
  const [role, setRole] = useState<PersonRole>('child')
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>()
  const [photoError, setPhotoError] = useState<string | undefined>()
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false)
  const saveButtonLabel = getSaveButtonLabel(isProcessingPhoto, isEditing)

  // Prefill the form once the person being edited has loaded.
  useEffect(() => {
    if (!existingPerson) {
      return
    }

    setDisplayName(existingPerson.displayName)
    setRole((existingPerson.role as PersonRole | null) ?? 'child')
    setAvatarUrl(existingPerson.avatarUrl ?? undefined)
  }, [existingPerson])

  const goBack = () => (step === 2 && !isEditing ? setStep(1) : router.goBack())
  const close = () => router.push('/people', 'back', 'replace')

  const choosePhoto = () => photoInputRef.current?.click()

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    setPhotoError(undefined)
    setIsProcessingPhoto(true)

    try {
      setAvatarUrl(await createAvatarDataUrl(file))
    } catch (error) {
      setPhotoError(
        error instanceof Error ? error.message : 'Could not upload that photo.',
      )
    } finally {
      setIsProcessingPhoto(false)
    }
  }

  async function save() {
    const trimmedDisplayName = displayName.trim()

    if (!trimmedDisplayName) {
      return
    }

    if (!user) {
      throw new Error('Cannot save a person without an authenticated user')
    }

    const result =
      isEditing && personId
        ? await client.models.Person.update({
            id: personId,
            displayName: trimmedDisplayName,
            role,
            avatarUrl,
          })
        : await client.models.Person.create({
            displayName: trimmedDisplayName,
            role,
            avatarUrl,
            householdId: user.userId,
          })

    if (result.errors?.length) {
      throw new Error(result.errors[0].message)
    }

    await queryClient.invalidateQueries({ queryKey: ['people'] })
    personId &&
      (await queryClient.invalidateQueries({ queryKey: ['person', personId] }))

    const newId = isEditing ? personId : result.data?.id
    if (newId && !isEditing) {
      const params = new URLSearchParams({
        role,
        name: trimmedDisplayName,
        setup: '1',
      })
      return router.push(`/person/${newId}/indicators/checklist?${params}`, 'forward')
    }

    return newId
      ? router.push(`/person/${newId}`, 'forward')
      : router.push('/dashboard', 'back')
  }

  return (
    <IonPage>
      {renderHeader(goBack, close, isEditing)}

      <IonContent fullscreen>
        {step === 1 ? (
          <section>
            <h1>Who are you tracking?</h1>
            <p>You can always edit this later.</p>

            <IonRadioGroup
              value={role}
              onIonChange={(event) => setRole(event.detail.value)}
            >
              {roleOptions.map((option) => (
                <IonItem
                  key={option.value}
                  className="role-option"
                  button
                  detail={false}
                  onClick={() => setRole(option.value)}
                >
                  <IonIcon
                    slot="start"
                    icon={option.icon}
                  />

                  <IonLabel>
                    <h2>{option.label}</h2>
                    <p>{option.description}</p>
                  </IonLabel>

                  <IonRadio
                    slot="end"
                    value={option.value}
                  />
                </IonItem>
              ))}
            </IonRadioGroup>

            <IonButton
              expand="block"
              onClick={() => setStep(2)}
            >
              Next
            </IonButton>
          </section>
        ) : (
          <section>
            <h1>{isEditing ? 'Update person' : 'Let’s add some details'}</h1>
            <p>This helps personalize their experience.</p>

            <IonList>
              <IonItem>
                <IonInput
                  label="Name"
                  labelPlacement="stacked"
                  placeholder="Enter text"
                  value={displayName}
                  onIonInput={(event) => setDisplayName(event.detail.value ?? '')}
                />
              </IonItem>
            </IonList>

            <IonItem>
              <PersonAvatar
                slot="start"
                name={displayName || role}
                src={avatarUrl}
              />
              <IonLabel>
                <h2>Photo</h2>
                <p>Add a profile picture</p>
              </IonLabel>

              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handlePhotoChange}
              />

              <IonButton
                slot="end"
                fill="clear"
                aria-label="Choose photo"
                onClick={choosePhoto}
                disabled={isProcessingPhoto}
              >
                <IonIcon
                  slot="icon-only"
                  icon={cameraOutline}
                />
              </IonButton>

              {avatarUrl && (
                <IonButton
                  slot="end"
                  fill="clear"
                  aria-label="Remove photo"
                  onClick={() => {
                    setAvatarUrl(undefined)
                    setPhotoError(undefined)
                  }}
                  disabled={isProcessingPhoto}
                >
                  <IonIcon
                    slot="icon-only"
                    icon={closeOutline}
                  />
                </IonButton>
              )}
            </IonItem>

            {photoError && (
              <IonNote
                color="danger"
                className="person-form__photo-error"
              >
                {photoError}
              </IonNote>
            )}

            <div className="person-form__footer">
              <IonButton
                expand="block"
                disabled={!displayName.trim() || isProcessingPhoto}
                onClick={save}
              >
                {saveButtonLabel}
              </IonButton>
            </div>
          </section>
        )}
      </IonContent>
    </IonPage>
  )
}
