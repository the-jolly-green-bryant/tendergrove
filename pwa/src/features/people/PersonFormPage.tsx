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
  informationCircleOutline,
} from 'ionicons/icons'
import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { PersonRole } from '../../lib/domain'
import { client } from '../../lib/api'
import { useAppAuth } from '../../auth/AuthContext'
import { usePerson } from './usePerson'
import { PersonAvatar } from '../../components/PersonAvatar'
import { useRouteModal } from '../../components/RouteModalContext'

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

type ExistingPerson = Exclude<ReturnType<typeof usePerson>['data'], null | undefined>

interface RoleStepProps {
  readonly role: PersonRole
  readonly setRole: (role: PersonRole) => void
  readonly onNext: () => void
}

function RoleStep({ role, setRole, onNext }: RoleStepProps) {
  return (
    <section className="person-form-section">
      <h1 className="choose-type__heading">Who are you tracking?</h1>
      <p className="indicator-intro">Choose the role that best fits.</p>

      <div className="indicator-why">
        <IonIcon
          icon={informationCircleOutline}
          color="primary"
        />
        <div>
          <strong>You can always edit this later</strong>
          <p>This helps tailor suggested indicators and check-ins.</p>
        </div>
      </div>

      <IonRadioGroup
        value={role}
        onIonChange={(event) => setRole(event.detail.value)}
      >
        <IonList
          lines="none"
          className="indicator-list"
        >
          {roleOptions.map((option) => (
            <IonItem
              key={option.value}
              className="role-option indicator-row"
              button
              detail={false}
              onClick={() => setRole(option.value)}
            >
              <IonIcon
                slot="start"
                icon={option.icon}
                color="primary"
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
        </IonList>
      </IonRadioGroup>

      <IonButton
        expand="block"
        onClick={onNext}
      >
        Next
      </IonButton>
    </section>
  )
}

interface DetailsStepProps {
  readonly avatarUrl: string | undefined
  readonly choosePhoto: () => void
  readonly displayName: string
  readonly handlePhotoChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  readonly isEditing: boolean
  readonly isProcessingPhoto: boolean
  readonly photoError: string | undefined
  readonly photoInputRef: React.RefObject<HTMLInputElement | null>
  readonly role: PersonRole
  readonly save: () => void
  readonly saveButtonLabel: string
  readonly setAvatarUrl: (avatarUrl: string | undefined) => void
  readonly setDisplayName: (displayName: string) => void
  readonly setPhotoError: (photoError: string | undefined) => void
}

function DetailsStep({
  avatarUrl,
  choosePhoto,
  displayName,
  handlePhotoChange,
  isEditing,
  isProcessingPhoto,
  photoError,
  photoInputRef,
  role,
  save,
  saveButtonLabel,
  setAvatarUrl,
  setDisplayName,
  setPhotoError,
}: DetailsStepProps) {
  return (
    <section className="person-form-section">
      <h1 className="choose-type__heading">
        {isEditing ? 'Update person' : 'Let’s add some details'}
      </h1>
      <p className="indicator-intro">This helps personalize their experience.</p>

      <IonList
        lines="none"
        className="indicator-list"
      >
        <IonItem className="indicator-row">
          <IonInput
            label="Name"
            labelPlacement="stacked"
            placeholder="Enter text"
            value={displayName}
            onIonInput={(event) => setDisplayName(event.detail.value ?? '')}
          />
        </IonItem>
      </IonList>

      <PhotoRow
        avatarUrl={avatarUrl}
        choosePhoto={choosePhoto}
        displayName={displayName}
        handlePhotoChange={handlePhotoChange}
        isProcessingPhoto={isProcessingPhoto}
        photoInputRef={photoInputRef}
        role={role}
        setAvatarUrl={setAvatarUrl}
        setPhotoError={setPhotoError}
      />

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
  )
}

interface PhotoRowProps {
  readonly avatarUrl: string | undefined
  readonly choosePhoto: () => void
  readonly displayName: string
  readonly handlePhotoChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  readonly isProcessingPhoto: boolean
  readonly photoInputRef: React.RefObject<HTMLInputElement | null>
  readonly role: PersonRole
  readonly setAvatarUrl: (avatarUrl: string | undefined) => void
  readonly setPhotoError: (photoError: string | undefined) => void
}

function PhotoRow({
  avatarUrl,
  choosePhoto,
  displayName,
  handlePhotoChange,
  isProcessingPhoto,
  photoInputRef,
  role,
  setAvatarUrl,
  setPhotoError,
}: PhotoRowProps) {
  return (
    <IonItem className="indicator-row person-form-photo-row">
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
      <PhotoButtons
        avatarUrl={avatarUrl}
        choosePhoto={choosePhoto}
        isProcessingPhoto={isProcessingPhoto}
        setAvatarUrl={setAvatarUrl}
        setPhotoError={setPhotoError}
      />
    </IonItem>
  )
}

interface PhotoButtonsProps {
  readonly avatarUrl: string | undefined
  readonly choosePhoto: () => void
  readonly isProcessingPhoto: boolean
  readonly setAvatarUrl: (avatarUrl: string | undefined) => void
  readonly setPhotoError: (photoError: string | undefined) => void
}

function PhotoButtons({
  avatarUrl,
  choosePhoto,
  isProcessingPhoto,
  setAvatarUrl,
  setPhotoError,
}: PhotoButtonsProps) {
  return (
    <>
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
    </>
  )
}

function usePrefillPerson(
  existingPerson: ExistingPerson | undefined,
  setDisplayName: (displayName: string) => void,
  setRole: (role: PersonRole) => void,
  setAvatarUrl: (avatarUrl: string | undefined) => void,
) {
  useEffect(() => {
    if (!existingPerson) return
    setDisplayName(existingPerson.displayName)
    setRole((existingPerson.role as PersonRole | null) ?? 'child')
    setAvatarUrl(existingPerson.avatarUrl ?? undefined)
  }, [existingPerson, setAvatarUrl, setDisplayName, setRole])
}

function usePhotoUpload(setAvatarUrl: (avatarUrl: string | undefined) => void) {
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [photoError, setPhotoError] = useState<string | undefined>()
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false)
  const choosePhoto = () => photoInputRef.current?.click()

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

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

  return {
    choosePhoto,
    handlePhotoChange,
    isProcessingPhoto,
    photoError,
    photoInputRef,
    setPhotoError,
  }
}

interface NavigationParams {
  readonly existingPerson: ExistingPerson | undefined
  readonly routeModal: ReturnType<typeof useRouteModal>
  readonly router: ReturnType<typeof useIonRouter>
  readonly setStep: (step: 1 | 2) => void
  readonly step: 1 | 2
}

function usePersonFormNavigation({
  existingPerson,
  routeModal,
  router,
  setStep,
  step,
}: NavigationParams) {
  const goBack = () => {
    if (step === 2 && !existingPerson) {
      setStep(1)
      return
    }
    if (routeModal.isRouteModal) routeModal.dismiss()
    else router.goBack()
  }

  const close = () =>
    routeModal.isRouteModal
      ? routeModal.dismiss()
      : router.push('/dashboard', 'back', 'replace')

  return { close, goBack }
}

interface SavePersonParams {
  readonly avatarUrl: string | undefined
  readonly displayName: string
  readonly personId: string | undefined
  readonly queryClient: ReturnType<typeof useQueryClient>
  readonly role: PersonRole
  readonly routeModal: ReturnType<typeof useRouteModal>
  readonly router: ReturnType<typeof useIonRouter>
  readonly user: ReturnType<typeof useAppAuth>['user']
}

function useSavePerson({
  avatarUrl,
  displayName,
  personId,
  queryClient,
  role,
  routeModal,
  router,
  user,
}: SavePersonParams) {
  return async () => {
    const trimmedDisplayName = displayName.trim()
    if (!trimmedDisplayName) return
    if (!user) throw new Error('Cannot save a person without an authenticated user')

    const result = personId
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

    if (result.errors?.length) throw new Error(result.errors[0].message)
    await queryClient.invalidateQueries({ queryKey: ['people'] })
    if (personId)
      await queryClient.invalidateQueries({ queryKey: ['person', personId] })

    return routeModal.isRouteModal
      ? routeModal.dismiss()
      : router.push('/dashboard', 'back')
  }
}

/**
 * Allows us to create or edit a person.
 * @returns {React.JSX.Element}
 * @constructor
 */
export default function PersonFormPage() {
  const router = useIonRouter()
  const routeModal = useRouteModal()
  const queryClient = useQueryClient()
  const { user } = useAppAuth()
  const { personId } = useParams<{ personId?: string }>()
  const { data: existingPerson } = usePerson(personId ? personId : undefined)

  const [step, setStep] = useState<1 | 2>(existingPerson ? 2 : 1)
  const [role, setRole] = useState<PersonRole>('child')
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>()

  const loadedPerson = existingPerson ?? undefined

  usePrefillPerson(loadedPerson, setDisplayName, setRole, setAvatarUrl)
  const photoUpload = usePhotoUpload(setAvatarUrl)
  const { close, goBack } = usePersonFormNavigation({
    existingPerson: loadedPerson,
    routeModal,
    router,
    setStep,
    step,
  })
  const save = useSavePerson({
    avatarUrl,
    displayName,
    personId,
    queryClient,
    role,
    routeModal,
    router,
    user,
  })
  const saveButtonLabel = getSaveButtonLabel(
    photoUpload.isProcessingPhoto,
    loadedPerson !== undefined,
  )

  return (
    <IonPage>
      {renderHeader(goBack, close, loadedPerson !== undefined)}

      <IonContent
        fullscreen
        className="ion-padding safe-content person-form-content"
      >
        {step === 1 ? (
          <RoleStep
            role={role}
            setRole={setRole}
            onNext={() => setStep(2)}
          />
        ) : (
          <DetailsStep
            avatarUrl={avatarUrl}
            choosePhoto={photoUpload.choosePhoto}
            displayName={displayName}
            handlePhotoChange={photoUpload.handlePhotoChange}
            isEditing={loadedPerson !== undefined}
            isProcessingPhoto={photoUpload.isProcessingPhoto}
            photoError={photoUpload.photoError}
            photoInputRef={photoUpload.photoInputRef}
            role={role}
            save={save}
            saveButtonLabel={saveButtonLabel}
            setAvatarUrl={setAvatarUrl}
            setDisplayName={setDisplayName}
            setPhotoError={photoUpload.setPhotoError}
          />
        )}
      </IonContent>
    </IonPage>
  )
}
