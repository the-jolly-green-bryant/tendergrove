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
  accessibilityOutline,
  addOutline,
  arrowBackOutline,
  cameraOutline,
  checkmarkCircle,
  closeCircle,
  closeOutline,
  heart,
  heartOutline,
  peopleOutline,
  personCircleOutline,
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
import { useRoleTemplate } from './indicators/useRoleTemplates'
import { useIndicatorMutations } from './indicators/useIndicatorMutations'
import type { RoleTemplate } from './indicators/roleTemplates'
import type { Polarity, InputType } from './indicators/indicatorMeta'

const TOTAL_STEPS = 3

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
    label: 'Spouse / Partner',
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

const roleLabels: Record<PersonRole, string> = {
  self: 'Myself',
  child: 'Child',
  spouse: 'Spouse',
  parent: 'Parent',
  caregiver: 'Caregiver',
  other: 'Other',
}

interface PolaritySection {
  polarity: Polarity
  title: string
  icon: string
  iconColor: string
}

const polaritySections: PolaritySection[] = [
  {
    polarity: 'undesired',
    title: 'Challenges to watch',
    icon: removeCircle,
    iconColor: 'var(--ion-color-danger)',
  },
  {
    polarity: 'desired',
    title: 'Positive signs',
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

function dotState(position: number, step: number): 'done' | 'active' | 'upcoming' {
  if (position < step) return 'done'
  return position === step ? 'active' : 'upcoming'
}

function detailsPrimaryLabel(isProcessingPhoto: boolean, isEditing: boolean): string {
  if (isProcessingPhoto) return 'Preparing photo…'
  return isEditing ? 'Save Changes' : 'Continue'
}

function seedSuggestedItems(template: RoleTemplate): SuggestedItem[] {
  return template.indicators
    .filter((indicator) => indicator.defaultSelected)
    .map((indicator) => ({
      id: `suggested-${nextSuggestedId++}`,
      name: indicator.name,
      polarity: indicator.polarity,
      inputType: indicator.inputType,
      suggested: true,
    }))
}

/** Branded modal header: back, centered TenderGrove logo, close. */
function WizardHeader({
  isEditing,
  onBack,
  onClose,
}: {
  readonly isEditing: boolean
  readonly onBack: () => void
  readonly onClose: () => void
}) {
  return (
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
}

/** "Step X of 3" label with a connected three-dot progress track. */
function StepIndicator({ step }: { readonly step: number }) {
  return (
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
}

function RoleCard({
  option,
  selected,
  onSelect,
}: {
  readonly option: (typeof roleOptions)[number]
  readonly selected: boolean
  readonly onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={`role-card ${selected ? 'role-card--selected' : ''}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <IonIcon
        className="role-card__icon"
        icon={option.icon}
      />
      <span className="role-card__text">
        <span className="role-card__label">{option.label}</span>
        <span className="role-card__desc">{option.description}</span>
      </span>
      {selected && (
        <IonIcon
          className="role-card__check"
          icon={checkmarkCircle}
        />
      )}
    </button>
  )
}

function RoleStep({
  role,
  setRole,
  onNext,
}: {
  readonly role: PersonRole
  readonly setRole: (role: PersonRole) => void
  readonly onNext: () => void
}) {
  return (
    <section className="wizard-step">
      <StepIndicator step={1} />

      <div className="wizard-step__intro">
        <h1 className="wizard-heading">Who are you tracking?</h1>
        <p className="wizard-subheading">
          We&rsquo;ll personalize suggestions based on who this person is.
        </p>
      </div>

      <div className="role-grid">
        {roleOptions.map((option) => (
          <RoleCard
            key={option.value}
            option={option}
            selected={role === option.value}
            onSelect={() => setRole(option.value)}
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
}

function NameField({
  displayName,
  setDisplayName,
}: {
  readonly displayName: string
  readonly setDisplayName: (displayName: string) => void
}) {
  return (
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
}

interface PhotoFieldProps {
  readonly avatarUrl: string | undefined
  readonly role: PersonRole
  readonly displayName: string
  readonly choosePhoto: () => void
  readonly isProcessingPhoto: boolean
  readonly photoError: string | undefined
  readonly photoInputRef: React.RefObject<HTMLInputElement | null>
  readonly handlePhotoChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}

function PhotoField({
  avatarUrl,
  role,
  displayName,
  choosePhoto,
  isProcessingPhoto,
  photoError,
  photoInputRef,
  handlePhotoChange,
}: PhotoFieldProps) {
  return (
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
            name={displayName || roleLabels[role]}
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
}

interface DetailsStepProps extends PhotoFieldProps {
  readonly isEditing: boolean
  readonly isSaving: boolean
  readonly onContinue: () => void
  readonly setDisplayName: (displayName: string) => void
}

function DetailsStep(props: DetailsStepProps) {
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
        role={props.role}
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

function SuggestedIntro({
  role,
  displayName,
  count,
}: {
  readonly role: PersonRole
  readonly displayName: string
  readonly count: number
}) {
  return (
    <div className="wizard-step__intro wizard-step__intro--celebrate">
      <IonIcon
        className="wizard-step__badge"
        icon={heart}
      />
      <h1 className="wizard-heading">We&rsquo;ve created a starting point</h1>
      <p className="wizard-subheading">
        Based on <strong>&ldquo;{roleLabels[role]}&rdquo;</strong>
      </p>
      <p className="wizard-subheading">
        We&rsquo;ve added {count} suggested indicator{count === 1 ? '' : 's'}
        {displayName ? ` for ${displayName}` : ''} to help you get started.
      </p>
    </div>
  )
}

function SuggestedRow({
  item,
  section,
  onRemove,
}: {
  readonly item: SuggestedItem
  readonly section: PolaritySection
  readonly onRemove: (id: string) => void
}) {
  return (
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
        className="suggested-row__remove"
        aria-label={`Remove ${item.name}`}
        onClick={() => onRemove(item.id)}
      >
        <IonIcon icon={closeCircle} />
      </button>
    </div>
  )
}

function SuggestedSection({
  section,
  items,
  onAdd,
  onRemove,
}: {
  readonly section: PolaritySection
  readonly items: SuggestedItem[]
  readonly onAdd: () => void
  readonly onRemove: (id: string) => void
}) {
  return (
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
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  )
}

interface SuggestedItemsState {
  items: SuggestedItem[]
  suggestedCount: number
  itemsFor: (polarity: Polarity) => SuggestedItem[]
  removeItem: (id: string) => void
  addItem: (polarity: Polarity, name: string) => void
}

function useSuggestedItems(template: RoleTemplate | undefined): SuggestedItemsState {
  const [items, setItems] = useState<SuggestedItem[]>([])
  const [suggestedCount, setSuggestedCount] = useState(0)
  const initialized = useRef(false)

  useEffect(() => {
    if (!template || initialized.current) return
    initialized.current = true
    const seeded = seedSuggestedItems(template)
    setItems(seeded)
    setSuggestedCount(seeded.length)
  }, [template])

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((item) => item.id !== id))

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
    suggestedCount,
    itemsFor: (polarity) => items.filter((item) => item.polarity === polarity),
    removeItem,
    addItem,
  }
}

function promptForIndicatorName(
  presentAlert: PresentAlert,
  addItem: (polarity: Polarity, name: string) => void,
  polarity: Polarity,
) {
  const isChallenge = polarity === 'undesired'
  void presentAlert({
    header: isChallenge ? 'Add a challenge to watch' : 'Add a positive sign',
    inputs: [
      {
        name: 'name',
        type: 'text',
        placeholder: isChallenge ? 'e.g. Anxiety' : 'e.g. Ate breakfast',
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

function SuggestedIndicatorsStep({
  role,
  displayName,
  isSaving,
  onFinish,
}: {
  readonly role: PersonRole
  readonly displayName: string
  readonly isSaving: boolean
  readonly onFinish: (items: SuggestedItem[]) => void
}) {
  const { data: template, isLoading } = useRoleTemplate(role)
  const suggested = useSuggestedItems(template)
  const [presentAlert] = useIonAlert()

  if (isLoading) {
    return (
      <section className="wizard-step wizard-step--center">
        <StepIndicator step={3} />
        <IonSpinner name="crescent" />
      </section>
    )
  }

  return (
    <section className="wizard-step">
      <StepIndicator step={3} />
      <SuggestedIntro
        role={role}
        displayName={displayName}
        count={suggested.suggestedCount}
      />

      <div className="suggested-tip">
        <IonIcon icon={sparkles} />
        <span>
          You can remove anything that doesn&rsquo;t fit and add your own anytime.
        </span>
      </div>

      {polaritySections.map((section) => (
        <SuggestedSection
          key={section.polarity}
          section={section}
          items={suggested.itemsFor(section.polarity)}
          onAdd={() =>
            promptForIndicatorName(presentAlert, suggested.addItem, section.polarity)
          }
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

async function savePerson(args: SavePersonArgs): Promise<string> {
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

function useWizardActions(config: WizardActionsArgs) {
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

/**
 * Guided flow for adding a new person (role → details → suggested indicators)
 * or editing an existing one (details only).
 * @returns {React.JSX.Element}
 * @constructor
 */
export default function PersonFormPage() {
  const { personId } = useParams<{ personId?: string }>()
  const { data: existingPerson } = usePerson(personId ? personId : undefined)
  const loadedPerson = existingPerson ?? undefined
  const isEditing = loadedPerson !== undefined

  const [step, setStep] = useState<WizardStep>(isEditing ? 2 : 1)
  const [role, setRole] = useState<PersonRole>('child')
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>()

  usePrefillPerson(loadedPerson, setDisplayName, setRole, setAvatarUrl)
  const photoUpload = usePhotoUpload(setAvatarUrl)
  const actions = useWizardActions({
    personId,
    isEditing,
    step,
    setStep,
    role,
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
            role={role}
            setRole={setRole}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <DetailsStep
            avatarUrl={avatarUrl}
            role={role}
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
            role={role}
            displayName={displayName.trim()}
            isSaving={actions.isSavingIndicators}
            onFinish={actions.handleFinish}
          />
        )}
      </IonContent>
    </IonPage>
  )
}
