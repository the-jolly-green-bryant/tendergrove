import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
  useIonAlert,
  useIonRouter,
} from '@ionic/react'
import { addOutline, createOutline, trashOutline } from 'ionicons/icons'
import React, { type Dispatch, type SetStateAction, useEffect, useState } from 'react'
import { useParams, useLocation } from 'react-router-dom'

import { LoadingState } from '../../../components/LoadingState'
import { useIndicatorMutations } from './useIndicatorMutations'
import { useRoleTemplate } from './useRoleTemplates'
import { polarityMeta, type Polarity } from './indicatorMeta'
import type { PersonRole } from '../../../lib/domain'
import type { TemplateIndicator } from './roleTemplates'

interface ChecklistItem extends TemplateIndicator {
  id: string
  selected: boolean
  isCustom?: boolean
}

type RoleTemplate = NonNullable<ReturnType<typeof useRoleTemplate>['data']>
type PresentAlert = ReturnType<typeof useIonAlert>[0]

interface ChecklistState {
  desired: ChecklistItem[]
  items: ChecklistItem[]
  saving: boolean
  selectedCount: number
  setSaving: (saving: boolean) => void
  showCustomIndicatorAlert: (polarity: Polarity, item?: ChecklistItem) => void
  toggleItem: (id: string) => void
  undesired: ChecklistItem[]
  confirmRemoveCustomIndicator: (item: ChecklistItem) => void
}

let nextCustomId = 0

const LOADING_STATE = <LoadingState className="ion-text-center ion-padding" />

const renameChecklistItem = (
  items: ChecklistItem[],
  itemId: string,
  name: string,
): ChecklistItem[] =>
  items.map((current) => (current.id === itemId ? { ...current, name } : current))

const removeChecklistItem = (items: ChecklistItem[], itemId: string): ChecklistItem[] =>
  items.filter((current) => current.id !== itemId)

interface CustomIndicatorAlertParams {
  readonly addCustomIndicator: (polarity: Polarity, name: string) => void
  readonly item?: ChecklistItem
  readonly polarity: Polarity
  readonly presentAlert: PresentAlert
  readonly setItems: Dispatch<SetStateAction<ChecklistItem[]>>
}

const showCustomIndicatorAlert = ({
  addCustomIndicator,
  item,
  polarity,
  presentAlert,
  setItems,
}: CustomIndicatorAlertParams) => {
  const meta = polarityMeta[polarity]
  void presentAlert({
    header: `${item ? 'Edit' : 'Add'} ${meta.title} Indicator`,
    message: 'Enter the behavior you want to track.',
    inputs: [
      {
        name: 'behavior',
        type: 'text',
        value: item?.name,
        placeholder: `e.g. ${meta.examples.split(',')[0]}`,
      },
    ],
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      createSaveCustomIndicatorButton(item, polarity, setItems, addCustomIndicator),
    ],
  })
}

const confirmRemoveCustomIndicator = (
  item: ChecklistItem,
  presentAlert: PresentAlert,
  setItems: Dispatch<SetStateAction<ChecklistItem[]>>,
) => {
  void presentAlert({
    header: 'Remove indicator?',
    message: `Remove "${item.name}" from this setup checklist?`,
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Remove',
        role: 'destructive',
        handler: () => setItems((prev) => removeChecklistItem(prev, item.id)),
      },
    ],
  })
}

const useChecklistState = (
  template: RoleTemplate | undefined,
  presentAlert: PresentAlert,
): ChecklistState => {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(
    () =>
      template &&
      setItems(
        template.indicators.map((indicator, index) => ({
          ...indicator,
          id: `template-${index}`,
          selected: indicator.defaultSelected,
        })),
      ),
    [template],
  )

  const toggleItem = (id: string) =>
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item,
      ),
    )

  const addCustomIndicator = (polarity: Polarity, name: string) =>
    setItems((prev) => [
      ...prev,
      {
        id: `custom-${nextCustomId++}`,
        name,
        polarity,
        inputType: 'boolean',
        defaultSelected: true,
        selected: true,
        isCustom: true,
      },
    ])

  const openCustomIndicatorAlert = (polarity: Polarity, item?: ChecklistItem) =>
    showCustomIndicatorAlert({
      addCustomIndicator,
      item,
      polarity,
      presentAlert,
      setItems,
    })

  const openRemoveCustomIndicatorAlert = (item: ChecklistItem) =>
    confirmRemoveCustomIndicator(item, presentAlert, setItems)

  return {
    desired: items.filter((i) => i.polarity === 'desired'),
    items,
    saving,
    selectedCount: items.filter((i) => i.selected).length,
    setSaving,
    showCustomIndicatorAlert: openCustomIndicatorAlert,
    toggleItem,
    undesired: items.filter((i) => i.polarity === 'undesired'),
    confirmRemoveCustomIndicator: openRemoveCustomIndicatorAlert,
  }
}

const createSaveCustomIndicatorButton = (
  item: ChecklistItem | undefined,
  polarity: Polarity,
  setItems: Dispatch<SetStateAction<ChecklistItem[]>>,
  addCustomIndicator: (polarity: Polarity, name: string) => void,
) => ({
  text: item ? 'Save' : 'Add',
  handler: (values: { behavior?: string }) => {
    const name = values.behavior?.trim()
    if (!name) return false

    if (item) setItems((prev) => renameChecklistItem(prev, item.id, name))
    else addCustomIndicator(polarity, name)
    return true
  },
})

interface ChecklistContentProps {
  readonly checklist: ChecklistState
  readonly displayName: string
  readonly isLoading: boolean
  readonly isSetup: boolean
  readonly onSave: () => void
  readonly onSkip: () => void
}

const ChecklistContent = ({
  checklist,
  displayName,
  isLoading,
  isSetup,
  onSave,
  onSkip,
}: ChecklistContentProps) =>
  isLoading ? (
    LOADING_STATE
  ) : (
    <>
      <h1>What should we watch for?</h1>
      <p className="checklist-sub">
        Select all that apply{displayName && ` for ${displayName}`}.
      </p>

      {(['undesired', 'desired'] as const).map((polarity) => (
        <PolaritySection
          key={polarity}
          polarity={polarity}
          items={polarity === 'undesired' ? checklist.undesired : checklist.desired}
          onToggle={checklist.toggleItem}
          onAddCustom={checklist.showCustomIndicatorAlert}
          onEditCustom={checklist.showCustomIndicatorAlert}
          onRemoveCustom={checklist.confirmRemoveCustomIndicator}
        />
      ))}

      <ChecklistFooter
        isSetup={isSetup}
        saving={checklist.saving}
        selectedCount={checklist.selectedCount}
        onSave={onSave}
        onSkip={onSkip}
      />
    </>
  )

const ChecklistFooter = ({
  isSetup,
  saving,
  selectedCount,
  onSave,
  onSkip,
}: {
  readonly isSetup: boolean
  readonly saving: boolean
  readonly selectedCount: number
  readonly onSave: () => void
  readonly onSkip: () => void
}) => (
  <div className="checklist-footer">
    <IonButton
      expand="block"
      disabled={selectedCount === 0 || saving}
      onClick={onSave}
    >
      {saving ? (
        <LoadingState
          className=""
          name="crescent"
        />
      ) : (
        `Save Indicators (${selectedCount})`
      )}
    </IonButton>

    {isSetup && (
      <IonButton
        expand="block"
        fill="clear"
        onClick={onSkip}
      >
        Skip for now
      </IonButton>
    )}
  </div>
)

/**
 * Allows users to create a list of indicators to watch for.
 * @returns {React.JSX.Element}
 * @constructor
 */
const IndicatorChecklistPage = (): React.JSX.Element => {
  const router = useIonRouter()
  const { personId } = useParams<{ personId: string }>()
  const location = useLocation()

  const params = new URLSearchParams(location.search)
  const role = (params.get('role') as PersonRole) || 'child'
  const displayName = params.get('name') || ''
  const isSetup = params.get('setup') === '1'

  const { data: template, isLoading } = useRoleTemplate(role)
  const { create } = useIndicatorMutations(personId)
  const [presentAlert] = useIonAlert()
  const checklist = useChecklistState(template, presentAlert)

  const saveIndicators = async () => {
    const selected = checklist.items.filter((item) => item.selected)
    if (selected.length === 0) return

    checklist.setSaving(true)

    try {
      for (const item of selected) {
        await create({
          name: item.name,
          polarity: item.polarity,
          inputType: item.inputType,
          description: item.description,
        })
      }

      router.push(`/person/${personId}`, 'forward', 'replace')
    } catch (error) {
      console.error('Failed to save indicators:', error)
      checklist.setSaving(false)
    }
  }

  const skip = () => router.push(`/person/${personId}`, 'forward', 'replace')

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton text="" />
          </IonButtons>
          <IonTitle>Configure Indicators</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent
        fullscreen
        className="ion-padding safe-content"
      >
        <ChecklistContent
          checklist={checklist}
          displayName={displayName}
          isLoading={isLoading}
          isSetup={isSetup}
          onSave={saveIndicators}
          onSkip={skip}
        />
      </IonContent>
    </IonPage>
  )
}

const PolaritySection = ({
  polarity,
  items,
  onToggle,
  onAddCustom,
  onEditCustom,
  onRemoveCustom,
}: {
  readonly polarity: Polarity
  readonly items: ChecklistItem[]
  readonly onToggle: (id: string) => void
  readonly onAddCustom: (polarity: Polarity) => void
  readonly onEditCustom: (polarity: Polarity, item: ChecklistItem) => void
  readonly onRemoveCustom: (item: ChecklistItem) => void
}) => {
  const meta = polarityMeta[polarity]

  return (
    <section className="checklist-section">
      <div className="section-header">
        <h2
          className="checklist-section__title"
          style={{ color: `var(--ion-color-${meta.color})` }}
        >
          {meta.title}
        </h2>
        <IonButton
          fill="clear"
          size="small"
          onClick={() => onAddCustom(polarity)}
          aria-label={`Add ${meta.title.toLowerCase()} indicator`}
        >
          <IonIcon
            slot="icon-only"
            icon={addOutline}
          />
        </IonButton>
      </div>
      <IonList
        lines="none"
        className="checklist-list"
      >
        {items.length === 0 && (
          <p className="section-empty">No {meta.title.toLowerCase()} indicators yet.</p>
        )}
        {items.map((item) => (
          <IonItem
            key={item.id}
            className="checklist-item"
          >
            <IonCheckbox
              slot="start"
              checked={item.selected}
              onIonChange={() => onToggle(item.id)}
              color={meta.color}
            />
            <IonLabel>{item.name}</IonLabel>
            <CustomIndicatorButtons
              item={item}
              polarity={polarity}
              onEdit={onEditCustom}
              onRemove={onRemoveCustom}
            />
          </IonItem>
        ))}
      </IonList>
    </section>
  )
}

const CustomIndicatorButtons = ({
  item,
  polarity,
  onEdit,
  onRemove,
}: {
  readonly item: ChecklistItem
  readonly polarity: Polarity
  readonly onEdit: (polarity: Polarity, item: ChecklistItem) => void
  readonly onRemove: (item: ChecklistItem) => void
}) =>
  item.isCustom && (
    <>
      <IonButton
        slot="end"
        fill="clear"
        aria-label={`Edit ${item.name}`}
        onClick={() => onEdit(polarity, item)}
      >
        <IonIcon
          slot="icon-only"
          icon={createOutline}
        />
      </IonButton>
      <IonButton
        slot="end"
        fill="clear"
        color="danger"
        aria-label={`Remove ${item.name}`}
        onClick={() => onRemove(item)}
      >
        <IonIcon
          slot="icon-only"
          icon={trashOutline}
        />
      </IonButton>
    </>
  )

export default IndicatorChecklistPage
