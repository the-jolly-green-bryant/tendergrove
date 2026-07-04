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
import { useEffect, useState } from 'react'
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

let nextCustomId = 0

const LOADING_STATE = <LoadingState className="ion-text-center ion-padding" />

function renameChecklistItem(
  items: ChecklistItem[],
  itemId: string,
  name: string,
): ChecklistItem[] {
  return items.map((current) =>
    current.id === itemId ? { ...current, name } : current,
  )
}

function removeChecklistItem(items: ChecklistItem[], itemId: string): ChecklistItem[] {
  return items.filter((current) => current.id !== itemId)
}

/**
 * Allows users to create a list of indicators to watch for.
 * @returns {React.JSX.Element}
 * @constructor
 */
export default function IndicatorChecklistPage() {
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

  function addCustomIndicator(polarity: Polarity, name: string) {
    const newItem: ChecklistItem = {
      id: `custom-${nextCustomId++}`,
      name,
      polarity,
      inputType: 'boolean',
      defaultSelected: true,
      selected: true,
      isCustom: true,
    }

    setItems((prev) => [...prev, newItem])
  }

  const showCustomIndicatorAlert = (polarity: Polarity, item?: ChecklistItem) => {
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
        {
          text: item ? 'Save' : 'Add',
          handler: (values: { behavior?: string }) => {
            const name = values.behavior?.trim()
            if (!name) return false
            if (item) {
              setItems((prev) => renameChecklistItem(prev, item.id, name))
            } else {
              addCustomIndicator(polarity, name)
            }
            return true
          },
        },
      ],
    })
  }

  const confirmRemoveCustomIndicator = (item: ChecklistItem) => {
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

  const saveIndicators = async () => {
    const selected = items.filter((item) => item.selected)
    if (selected.length === 0) return

    setSaving(true)

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
      setSaving(false)
    }
  }

  const skip = () => router.push(`/person/${personId}`, 'forward', 'replace')
  const undesired = items.filter((i) => i.polarity === 'undesired')
  const desired = items.filter((i) => i.polarity === 'desired')
  const selectedCount = items.filter((i) => i.selected).length

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
        {isLoading && LOADING_STATE}

        {!isLoading && (
          <>
            <h1>What should we watch for?</h1>
            <p className="checklist-sub">
              Select all that apply{displayName && ` for ${displayName}`}.
            </p>

            <PolaritySection
              polarity="undesired"
              items={undesired}
              onToggle={toggleItem}
              onAddCustom={showCustomIndicatorAlert}
              onEditCustom={showCustomIndicatorAlert}
              onRemoveCustom={confirmRemoveCustomIndicator}
            />

            <PolaritySection
              polarity="desired"
              items={desired}
              onToggle={toggleItem}
              onAddCustom={showCustomIndicatorAlert}
              onEditCustom={showCustomIndicatorAlert}
              onRemoveCustom={confirmRemoveCustomIndicator}
            />

            <div className="checklist-footer">
              <IonButton
                expand="block"
                disabled={selectedCount === 0 || saving}
                onClick={saveIndicators}
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
                  onClick={skip}
                >
                  Skip for now
                </IonButton>
              )}
            </div>
          </>
        )}
      </IonContent>
    </IonPage>
  )
}

function PolaritySection({
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
}) {
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
            <IonLabel>
              {item.name}
              {item.isCustom && <span className="checklist-custom-badge">Custom</span>}
            </IonLabel>
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

function CustomIndicatorButtons({
  item,
  polarity,
  onEdit,
  onRemove,
}: {
  readonly item: ChecklistItem
  readonly polarity: Polarity
  readonly onEdit: (polarity: Polarity, item: ChecklistItem) => void
  readonly onRemove: (item: ChecklistItem) => void
}) {
  if (!item.isCustom) return null

  return (
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
}
