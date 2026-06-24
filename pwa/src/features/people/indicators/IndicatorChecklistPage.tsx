import {
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
  useIonRouter,
} from '@ionic/react'
import { addOutline, arrowBackOutline } from 'ionicons/icons'
import { useEffect, useState } from 'react'
import { useParams, useLocation } from 'react-router-dom'

import { useIndicatorMutations, type IndicatorInput } from './useIndicatorMutations'
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

  const [items, setItems] = useState<ChecklistItem[]>([])
  const [customName, setCustomName] = useState('')
  const [customPolarity, setCustomPolarity] = useState<Polarity>('undesired')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!template) return

    setItems(
      template.indicators.map((indicator, index) => ({
        ...indicator,
        id: `template-${index}`,
        selected: indicator.defaultSelected,
      })),
    )
  }, [template])

  function toggleItem(id: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item,
      ),
    )
  }

  function addCustomIndicator() {
    const trimmed = customName.trim()
    if (!trimmed) return

    const newItem: ChecklistItem = {
      id: `custom-${nextCustomId++}`,
      name: trimmed,
      polarity: customPolarity,
      inputType: 'boolean',
      defaultSelected: true,
      selected: true,
      isCustom: true,
    }

    setItems((prev) => [...prev, newItem])
    setCustomName('')
    setShowCustomInput(false)
  }

  async function saveIndicators() {
    const selected = items.filter((item) => item.selected)
    if (selected.length === 0) return

    setSaving(true)

    try {
      for (const item of selected) {
        const input: IndicatorInput = {
          name: item.name,
          polarity: item.polarity,
          inputType: item.inputType,
          description: item.description,
        }
        await create(input)
      }

      router.push(`/person/${personId}`, 'forward', 'replace')
    } catch (error) {
      console.error('Failed to save indicators:', error)
      setSaving(false)
    }
  }

  function skip() {
    router.push(`/person/${personId}`, 'forward', 'replace')
  }

  const undesired = items.filter((i) => i.polarity === 'undesired')
  const desired = items.filter((i) => i.polarity === 'desired')
  const selectedCount = items.filter((i) => i.selected).length

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton
              fill="clear"
              onClick={() => router.goBack()}
              aria-label="Go back"
            >
              <IonIcon
                slot="icon-only"
                icon={arrowBackOutline}
              />
            </IonButton>
          </IonButtons>
          <IonTitle>Configure Indicators</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent
        fullscreen
        className="ion-padding safe-content"
      >
        {isLoading ? (
          <div className="ion-text-center ion-padding">
            <IonSpinner />
          </div>
        ) : (
          <>
            <h1>What should we watch for?</h1>
            <p className="checklist-sub">
              Select all that apply{displayName ? ` for ${displayName}` : ''}.
            </p>

            {undesired.length > 0 && (
              <PolaritySection
                polarity="undesired"
                items={undesired}
                onToggle={toggleItem}
              />
            )}

            {desired.length > 0 && (
              <PolaritySection
                polarity="desired"
                items={desired}
                onToggle={toggleItem}
              />
            )}

            {showCustomInput ? (
              <div className="custom-indicator-input">
                <IonList>
                  <IonItem>
                    <IonInput
                      label="Indicator name"
                      labelPlacement="stacked"
                      placeholder="e.g. Nail biting"
                      value={customName}
                      onIonInput={(e) => setCustomName(e.detail.value ?? '')}
                      autofocus
                    />
                  </IonItem>
                  <IonItem>
                    <IonLabel>Type</IonLabel>
                    <IonButton
                      slot="end"
                      fill={customPolarity === 'undesired' ? 'solid' : 'outline'}
                      color="danger"
                      size="small"
                      onClick={() => setCustomPolarity('undesired')}
                    >
                      Undesired
                    </IonButton>
                    <IonButton
                      slot="end"
                      fill={customPolarity === 'desired' ? 'solid' : 'outline'}
                      color="success"
                      size="small"
                      onClick={() => setCustomPolarity('desired')}
                    >
                      Desired
                    </IonButton>
                  </IonItem>
                </IonList>
                <div className="custom-indicator-actions">
                  <IonButton
                    fill="clear"
                    size="small"
                    onClick={() => {
                      setShowCustomInput(false)
                      setCustomName('')
                    }}
                  >
                    Cancel
                  </IonButton>
                  <IonButton
                    size="small"
                    disabled={!customName.trim()}
                    onClick={addCustomIndicator}
                  >
                    Add
                  </IonButton>
                </div>
              </div>
            ) : (
              <IonButton
                fill="clear"
                className="add-custom-btn"
                onClick={() => setShowCustomInput(true)}
              >
                <IonIcon
                  slot="start"
                  icon={addOutline}
                />
                Custom Indicator
              </IonButton>
            )}

            <div className="checklist-footer">
              <IonButton
                expand="block"
                disabled={selectedCount === 0 || saving}
                onClick={saveIndicators}
              >
                {saving ? (
                  <IonSpinner name="crescent" />
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
}: {
  polarity: Polarity
  items: ChecklistItem[]
  onToggle: (id: string) => void
}) {
  const meta = polarityMeta[polarity]

  return (
    <section className="checklist-section">
      <h2
        className="checklist-section__title"
        style={{ color: `var(--ion-color-${meta.color})` }}
      >
        {meta.title}
      </h2>
      <IonList
        lines="none"
        className="checklist-list"
      >
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
          </IonItem>
        ))}
      </IonList>
    </section>
  )
}
