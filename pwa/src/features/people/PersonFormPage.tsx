import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonPage,
  IonSpinner,
  IonToolbar,
  useIonAlert,
  useIonRouter,
} from '@ionic/react'
import {
  addOutline,
  arrowBackOutline,
  cameraOutline,
  checkmarkCircle,
  closeCircle,
  closeOutline,
  createOutline,
  heart,
  removeCircle,
  sparkles,
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
import { useIndicatorMutations } from './indicators/useIndicatorMutations'
import type { Polarity, InputType } from './indicators/indicatorMeta'
import {
  roleTemplates,
  roleKeys,
  roleToPersonRole,
  type IndicatorType,
  type RoleKey,
  type RoleTemplate,
} from '../../templates/roleTemplates'

const TOTAL_STEPS = 3

const DEFAULT_ROLE: RoleKey = 'child'

interface PolaritySection {
  polarity: Polarity
  title: string
  icon: string
  iconColor: string
}

const polaritySections: PolaritySection[] = [
  {
    polarity: 'undesired',
    title: 'Challenges',
    icon: removeCircle,
    iconColor: 'var(--ion-color-danger)',
  },
  {
    polarity: 'desired',
    title: 'Positive Signs',
    icon: checkmarkCircle,
    iconColor: 'var(--ion-color-success)',
  },
]

const AVATAR_IMAGE_SIZE = 320
const AVATAR_JPEG_QUALITY = 0.82
const MAX_AVATAR_UPLOAD_BYTES = 8 * 1024 * 1024

type WizardStep = 1 | 2 | 3
type PresentAlert = ReturnType<typeof useIonAlert>[0]

interface SuggestedItem {
  id: string
  name: string
  polarity: Polarity
  inputType: InputType
  suggested: boolean
}

let nextSuggestedId = 0

const polarityForType = (type: IndicatorType): Polarity =>
  type === 'positive' ? 'desired' : 'undesired'

const loadImageFromFile = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
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

const createAvatarDataUrl = async (file: File): Promise<string> => {
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

const dotState = (position: number, step: number): 'done' | 'active' | 'upcoming' => {
  if (position < step) return 'done'
  return position === step ? 'active' : 'upcoming'
}

const detailsPrimaryLabel = (
  isProcessingPhoto: boolean,
  isEditing: boolean,
): string => {
  if (isProcessingPhoto) return 'Preparing photo…'
  return isEditing ? 'Save Changes' : 'Continue'
}

const seedSuggestedItems = (template: RoleTemplate): SuggestedItem[] =>
  template.indicators.map((indicator) => ({
    id: `suggested-${nextSuggestedId++}`,
    name: indicator.label,
    polarity: polarityForType(indicator.type),
    inputType: 'boolean',
    suggested: true,
  }))

const WizardHeader = ({
  isEditing,
  onBack,
  onClose,
}: {
  readonly isEditing: boolean
  readonly onBack: () => void
  readonly onClose: () => void
}) => (
  <IonHeader
    translucent
    className="wizard-header"
  >
    <IonToolbar className="wizard-toolbar">
      <IonButtons slot="start">
        {isEditing ? (
          <IonBackButton
            defaultHref="/dashboard"
            text=""
          />
        ) : (
          <IonButton
            fill="clear"
            onClick={onBack}
            aria-label="Go back"
          >
            <IonIcon
              slot="icon-only"
              icon={arrowBackOutline}
            />
          </IonButton>
        )}
      </IonButtons>

      <div className="wizard-brand">
        <img
          src="/favicon.png"
          alt=""
          className="wizard-brand__logo"
        />
        <span className="wizard-brand__name">TenderGrove</span>
      </div>

      <IonButtons slot="end">
        <IonButton
          fill="clear"
          onClick={onClose}
          aria-label="Close"
        >
          <IonIcon
            slot="icon-only"
            icon={closeOutline}
          />
        </IonButton>
      </IonButtons>
    </IonToolbar>
  </IonHeader>
)

const StepIndicator = ({ step }: { readonly step: number }) => (
  <div className="wizard-stepper">
    <p className="wizard-stepper__label">
      Step {step} of {TOTAL_STEPS}
    </p>
    <div className="wizard-stepper__track">
      {Array.from({ length: TOTAL_STEPS }, (_, index) => {
        const position = index + 1
        return (
          <React.Fragment key={position}>
            {index > 0 && (
              <span
                className={`wizard-stepper__line ${
                  position <= step ? 'wizard-stepper__line--filled' : ''
                }`}
              />
            )}
            <span
              className={`wizard-stepper__dot wizard-stepper__dot--${dotState(position, step)}`}
            />
          </React.Fragment>
        )
      })}
    </div>
  </div>
)

const RoleCard = ({
  template,
  selected,
  onSelect,
}: {
  readonly template: RoleTemplate
  readonly selected: boolean
  readonly onSelect: () => void
}) => (
  <button
    type="button"
    className={`role-card ${selected ? 'role-card--selected' : ''}`}
    aria-pressed={selected}
    onClick={onSelect}
  >
    <IonIcon
      className="role-card__icon"
      icon={template.icon}
    />
    <span className="role-card__text">
      <span className="role-card__label">{template.label}</span>
      <span className="role-card__desc">{template.description}</span>
    </span>
    {selected && (
      <IonIcon
        className="role-card__check"
        icon={checkmarkCircle}
      />
    )}
  </button>
)

const RoleStep = ({
  role,
  setRole,
  onNext,
}: {
  readonly role: RoleKey
  readonly setRole: (role: RoleKey) => void
  readonly onNext: () => void
}) => (
  <section className="wizard-step">
    <StepIndicator step={1} />

    <div className="wizard-step__intro">
      <h1 className="wizard-heading">Who are you tracking?</h1>
      <p className="wizard-subheading">
        We&rsquo;ll personalize suggestions based on who this person is.
      </p>
    </div>

    <div className="role-grid">
      {roleKeys.map((key) => (
        <RoleCard
          key={key}
          template={roleTemplates[key]}
          selected={role === key}
          onSelect={() => setRole(key)}
        />
      ))}
    </div>

    <div className="wizard-footer">
      <IonButton
        expand="block"
        onClick={onNext}
      >
        Continue
      </IonButton>
    </div>
  </section>
)

const NameField = ({
  displayName,
  setDisplayName,
}: {
  readonly displayName: string
  readonly setDisplayName: (displayName: string) => void
}) => (
  <div className="wizard-field">
    <label
      className="wizard-field__label"
      htmlFor="person-name"
    >
      Name
    </label>
    <div className="wizard-input">
      <IonInput
        id="person-name"
        placeholder="Enter a name"
        value={displayName}
        clearInput
        onIonInput={(event) => setDisplayName(event.detail.value ?? '')}
      />
    </div>
  </div>
)

interface PhotoFieldProps {
  readonly avatarUrl: string | undefined
  readonly roleLabel: string
  readonly displayName: string
  readonly choosePhoto: () => void
  readonly isProcessingPhoto: boolean
  readonly photoError: string | undefined
  readonly photoInputRef: React.RefObject<HTMLInputElement | null>
  readonly handlePhotoChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}

const PhotoField = ({
  avatarUrl,
  roleLabel,
  displayName,
  choosePhoto,
  isProcessingPhoto,
  photoError,
  photoInputRef,
  handlePhotoChange,
}: PhotoFieldProps) => (
  <div className="wizard-field">
    <span className="wizard-field__label">Photo</span>
    <button
      type="button"
      className="wizard-photo"
      onClick={choosePhoto}
      disabled={isProcessingPhoto}
    >
      <span className="wizard-photo__avatar">
        <PersonAvatar
          name={displayName || roleLabel}
          src={avatarUrl}
        />
        <span className="wizard-photo__badge">
          <IonIcon icon={cameraOutline} />
        </span>
      </span>
      <span className="wizard-photo__caption">
        {avatarUrl ? 'Change profile picture' : 'Add a profile picture'}
      </span>
    </button>
    <input
      ref={photoInputRef}
      type="file"
      accept="image/*"
      hidden
      onChange={handlePhotoChange}
    />
    {photoError && <p className="wizard-photo__error">{photoError}</p>}
  </div>
)

interface DetailsStepProps extends PhotoFieldProps {
  readonly isEditing: boolean
  readonly isSaving: boolean
  readonly onContinue: () => void
  readonly setDisplayName: (displayName: string) => void
}

const DetailsStep = (props: DetailsStepProps) => {
  const { displayName, isEditing, isProcessingPhoto, isSaving, onContinue } = props
  const primaryLabel = detailsPrimaryLabel(isProcessingPhoto, isEditing)

  return (
    <section className="wizard-step">
      {!isEditing && <StepIndicator step={2} />}

      <div className="wizard-step__intro">
        <h1 className="wizard-heading">
          {isEditing ? 'Update person' : 'Let’s add some details'}
        </h1>
        <p className="wizard-subheading">This helps personalize their experience.</p>
      </div>

      <NameField
        displayName={displayName}
        setDisplayName={props.setDisplayName}
      />

      <PhotoField
        avatarUrl={props.avatarUrl}
        roleLabel={props.roleLabel}
        displayName={displayName}
        choosePhoto={props.choosePhoto}
        isProcessingPhoto={isProcessingPhoto}
        photoError={props.photoError}
        photoInputRef={props.photoInputRef}
        handlePhotoChange={props.handlePhotoChange}
      />

      <div className="wizard-footer">
        <IonButton
          expand="block"
          disabled={!displayName.trim() || isProcessingPhoto || isSaving}
          onClick={onContinue}
        >
          {isSaving ? <IonSpinner name="crescent" /> : primaryLabel}
        </IonButton>
      </div>
    </section>
  )
}

const SuggestedIntro = ({ roleLabel }: { readonly roleLabel: string }) => (
  <div className="wizard-step__intro wizard-step__intro--celebrate">
    <IonIcon
      className="wizard-step__badge"
      icon={heart}
    />
    <h1 className="wizard-heading">We&rsquo;ve created a starting point</h1>
    <p className="wizard-subheading">
      Based on your selected role
      {roleLabel ? (
        <>
          {' '}
          (<strong>{roleLabel}</strong>)
        </>
      ) : null}
      , we&rsquo;ve prepared a thoughtful set of indicators to help you begin tracking
      right away.
    </p>
  </div>
)

const SuggestedRow = ({
  item,
  section,
  onEdit,
  onRemove,
}: {
  readonly item: SuggestedItem
  readonly section: PolaritySection
  readonly onEdit: (item: SuggestedItem) => void
  readonly onRemove: (id: string) => void
}) => (
  <div className="suggested-row">
    <IonIcon
      className="suggested-row__icon"
      icon={section.icon}
      style={{ color: section.iconColor }}
    />
    <span className="suggested-row__name">{item.name}</span>
    {item.suggested && <span className="suggested-row__badge">Suggested</span>}
    <button
      type="button"
      className="suggested-row__action"
      aria-label={`Edit ${item.name}`}
      onClick={() => onEdit(item)}
    >
      <IonIcon icon={createOutline} />
    </button>
    <button
      type="button"
      className="suggested-row__action suggested-row__action--remove"
      aria-label={`Remove ${item.name}`}
      onClick={() => onRemove(item.id)}
    >
      <IonIcon icon={closeCircle} />
    </button>
  </div>
)

const SuggestedSection = ({
  section,
  items,
  onAdd,
  onEdit,
  onRemove,
}: {
  readonly section: PolaritySection
  readonly items: SuggestedItem[]
  readonly onAdd: () => void
  readonly onEdit: (item: SuggestedItem) => void
  readonly onRemove: (id: string) => void
}) => (
  <div className="suggested-section">
    <div className="suggested-section__header">
      <h2 style={{ color: section.iconColor }}>{section.title}</h2>
      <button
        type="button"
        className="suggested-section__add"
        aria-label={`Add ${section.title.toLowerCase()}`}
        onClick={onAdd}
      >
        <IonIcon icon={addOutline} />
      </button>
    </div>

    <div className="suggested-list">
      {items.length === 0 && <p className="suggested-empty">Nothing here yet.</p>}
      {items.map((item) => (
        <SuggestedRow
          key={item.id}
          item={item}
          section={section}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      ))}
    </div>
  </div>
)

interface SuggestedItemsState {
  items: SuggestedItem[]
  itemsFor: (polarity: Polarity) => SuggestedItem[]
  removeItem: (id: string) => void
  editItem: (id: string, name: string) => void
  addItem: (polarity: Polarity, name: string) => void
}

const useSuggestedItems = (roleKey: RoleKey): SuggestedItemsState => {
  const [items, setItems] = useState<SuggestedItem[]>([])
  const seededRole = useRef<RoleKey | null>(null)

  useEffect(() => {
    if (seededRole.current === roleKey) return
    seededRole.current = roleKey
    setItems(seedSuggestedItems(roleTemplates[roleKey]))
  }, [roleKey])

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((item) => item.id !== id))

  // Editing a suggested indicator turns it into a normal (user-owned) one.
  const editItem = (id: string, name: string) =>
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name, suggested: false } : item)),
    )

  const addItem = (polarity: Polarity, name: string) =>
    setItems((prev) => [
      ...prev,
      {
        id: `suggested-${nextSuggestedId++}`,
        name,
        polarity,
        inputType: 'boolean',
        suggested: false,
      },
    ])

  return {
    items,
    itemsFor: (polarity) => items.filter((item) => item.polarity === polarity),
    removeItem,
    editItem,
    addItem,
  }
}

const promptAddIndicator = (
  presentAlert: PresentAlert,
  addItem: (polarity: Polarity, name: string) => void,
  polarity: Polarity,
) => {
  const isChallenge = polarity === 'undesired'
  void presentAlert({
    header: isChallenge ? 'Add a challenge' : 'Add a positive sign',
    inputs: [
      {
        name: 'name',
        type: 'text',
        placeholder: isChallenge ? 'e.g. Missed medication' : 'e.g. Went for a walk',
      },
    ],
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Add',
        handler: (values: { name?: string }) => {
          const name = values.name?.trim()
          if (!name) return false
          addItem(polarity, name)
          return true
        },
      },
    ],
  })
}

const promptEditIndicator = (
  presentAlert: PresentAlert,
  editItem: (id: string, name: string) => void,
  item: SuggestedItem,
) => {
  void presentAlert({
    header: 'Edit indicator',
    inputs: [{ name: 'name', type: 'text', value: item.name }],
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Save',
        handler: (values: { name?: string }) => {
          const name = values.name?.trim()
          if (!name) return false
          editItem(item.id, name)
          return true
        },
      },
    ],
  })
}

const SuggestedIndicatorsStep = ({
  roleLabel,
  suggested,
  isSaving,
  onFinish,
}: {
  readonly roleLabel: string
  readonly suggested: SuggestedItemsState
  readonly isSaving: boolean
  readonly onFinish: (items: SuggestedItem[]) => void
}) => {
  const [presentAlert] = useIonAlert()

  return (
    <section className="wizard-step">
      <StepIndicator step={3} />
      <SuggestedIntro roleLabel={roleLabel} />

      <div className="suggested-tip">
        <IonIcon icon={sparkles} />
        <span>
          You can remove anything that doesn&rsquo;t fit, rename an indicator, or add
          your own anytime.
        </span>
      </div>

      {polaritySections.map((section) => (
        <SuggestedSection
          key={section.polarity}
          section={section}
          items={suggested.itemsFor(section.polarity)}
          onAdd={() =>
            promptAddIndicator(presentAlert, suggested.addItem, section.polarity)
          }
          onEdit={(item) => promptEditIndicator(presentAlert, suggested.editItem, item)}
          onRemove={suggested.removeItem}
        />
      ))}

      <div className="wizard-footer">
        <IonButton
          expand="block"
          disabled={isSaving}
          onClick={() => onFinish(suggested.items)}
        >
          {isSaving ? <IonSpinner name="crescent" /> : 'Finish'}
        </IonButton>
      </div>
    </section>
  )
}

type ExistingPerson = Exclude<ReturnType<typeof usePerson>['data'], null | undefined>

const usePrefillPerson = (
  existingPerson: ExistingPerson | undefined,
  setDisplayName: (displayName: string) => void,
  setAvatarUrl: (avatarUrl: string | undefined) => void,
) => {
  useEffect(() => {
    if (!existingPerson) return
    setDisplayName(existingPerson.displayName)
    setAvatarUrl(existingPerson.avatarUrl ?? undefined)
  }, [existingPerson, setAvatarUrl, setDisplayName])
}

const usePhotoUpload = (setAvatarUrl: (avatarUrl: string | undefined) => void) => {
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
  }
}

interface SavePersonArgs {
  displayName: string
  role: PersonRole
  avatarUrl: string | undefined
  personId: string | undefined
  createdPersonId: string | undefined
  user: ReturnType<typeof useAppAuth>['user']
  queryClient: ReturnType<typeof useQueryClient>
  setCreatedPersonId: (id: string) => void
}

const savePerson = async (args: SavePersonArgs): Promise<string> => {
  const { displayName, role, avatarUrl, personId, createdPersonId, user } = args
  const trimmed = displayName.trim()
  if (!trimmed) throw new Error('A name is required')
  if (!user) throw new Error('Cannot save a person without an authenticated user')

  const existingId = personId ?? createdPersonId
  if (existingId) {
    const result = await client.models.Person.update({
      id: existingId,
      displayName: trimmed,
      role,
      avatarUrl,
    })
    if (result.errors?.length) throw new Error(result.errors[0].message)
    await args.queryClient.invalidateQueries({ queryKey: ['people'] })
    await args.queryClient.invalidateQueries({ queryKey: ['person', existingId] })
    return existingId
  }

  const result = await client.models.Person.create({
    displayName: trimmed,
    role,
    avatarUrl,
    householdId: user.userId,
  })
  if (result.errors?.length) throw new Error(result.errors[0].message)
  const newId = result.data!.id
  args.setCreatedPersonId(newId)
  await args.queryClient.invalidateQueries({ queryKey: ['people'] })
  return newId
}

interface WizardActionsArgs {
  personId: string | undefined
  isEditing: boolean
  step: WizardStep
  setStep: (step: WizardStep) => void
  role: PersonRole
  displayName: string
  avatarUrl: string | undefined
  isProcessingPhoto: boolean
}

const useWizardActions = (config: WizardActionsArgs) => {
  const router = useIonRouter()
  const routeModal = useRouteModal()
  const queryClient = useQueryClient()
  const { user } = useAppAuth()
  const [createdPersonId, setCreatedPersonId] = useState<string | undefined>()
  const [isSavingPerson, setIsSavingPerson] = useState(false)
  const [isSavingIndicators, setIsSavingIndicators] = useState(false)
  const activePersonId = config.personId ?? createdPersonId
  const { create: createIndicator } = useIndicatorMutations(activePersonId)

  const navigateToPerson = (id: string) =>
    routeModal.isRouteModal
      ? routeModal.dismiss(`/person/${id}`)
      : router.push(`/person/${id}`, 'back')

  const handleDetailsContinue = async () => {
    if (!config.displayName.trim() || config.isProcessingPhoto) return
    setIsSavingPerson(true)
    try {
      const id = await savePerson({
        ...config,
        createdPersonId,
        user,
        queryClient,
        setCreatedPersonId,
      })
      if (config.isEditing) navigateToPerson(id)
      else config.setStep(3)
    } finally {
      setIsSavingPerson(false)
    }
  }

  const handleFinish = async (items: SuggestedItem[]) => {
    if (!activePersonId) return
    setIsSavingIndicators(true)
    try {
      for (const item of items) {
        await createIndicator({
          name: item.name,
          polarity: item.polarity,
          inputType: item.inputType,
        })
      }
      navigateToPerson(activePersonId)
    } catch (error) {
      console.error('Failed to save indicators:', error)
      setIsSavingIndicators(false)
    }
  }

  const goBack = () => {
    if (config.step === 3) return config.setStep(2)
    if (config.step === 2 && !config.isEditing) return config.setStep(1)
    if (routeModal.isRouteModal) routeModal.dismiss()
    else router.goBack()
  }

  const close = () =>
    routeModal.isRouteModal
      ? routeModal.dismiss()
      : router.push('/dashboard', 'back', 'replace')

  return {
    handleDetailsContinue,
    handleFinish,
    goBack,
    close,
    isSavingPerson,
    isSavingIndicators,
  }
}

const PersonFormPage = () => {
  const { personId } = useParams<{ personId?: string }>()
  const { data: existingPerson } = usePerson(personId ? personId : undefined)
  const loadedPerson = existingPerson ?? undefined
  const isEditing = loadedPerson !== undefined

  const [step, setStep] = useState<WizardStep>(isEditing ? 2 : 1)
  const [roleKey, setRoleKey] = useState<RoleKey>(DEFAULT_ROLE)
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>()

  usePrefillPerson(loadedPerson, setDisplayName, setAvatarUrl)
  const photoUpload = usePhotoUpload(setAvatarUrl)
  const suggested = useSuggestedItems(roleKey)

  const roleLabel = roleTemplates[roleKey].label
  const personRole: PersonRole = isEditing
    ? ((loadedPerson.role as PersonRole | null) ?? 'other')
    : roleToPersonRole[roleKey]

  const actions = useWizardActions({
    personId,
    isEditing,
    step,
    setStep,
    role: personRole,
    displayName,
    avatarUrl,
    isProcessingPhoto: photoUpload.isProcessingPhoto,
  })

  return (
    <IonPage>
      <WizardHeader
        isEditing={isEditing}
        onBack={actions.goBack}
        onClose={actions.close}
      />

      <IonContent
        fullscreen
        className="ion-padding safe-content person-wizard-content"
      >
        {step === 1 && (
          <RoleStep
            role={roleKey}
            setRole={setRoleKey}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <DetailsStep
            avatarUrl={avatarUrl}
            roleLabel={roleLabel}
            displayName={displayName}
            choosePhoto={photoUpload.choosePhoto}
            isProcessingPhoto={photoUpload.isProcessingPhoto}
            photoError={photoUpload.photoError}
            photoInputRef={photoUpload.photoInputRef}
            handlePhotoChange={photoUpload.handlePhotoChange}
            isEditing={isEditing}
            isSaving={actions.isSavingPerson}
            onContinue={actions.handleDetailsContinue}
            setDisplayName={setDisplayName}
          />
        )}

        {step === 3 && (
          <SuggestedIndicatorsStep
            roleLabel={roleLabel}
            suggested={suggested}
            isSaving={actions.isSavingIndicators}
            onFinish={actions.handleFinish}
          />
        )}
      </IonContent>
    </IonPage>
  )
}

export default PersonFormPage
