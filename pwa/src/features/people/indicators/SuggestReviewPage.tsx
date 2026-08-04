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
  IonSpinner,
  IonTitle,
  IonToolbar,
  useIonRouter,
} from '@ionic/react'
import { checkmarkCircle, removeCircle } from 'ionicons/icons'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import { LoadingState } from '../../../components/LoadingState'
import { AppDisclaimer } from '../../../components/AppDisclaimer'
import { useIndicators, type Indicator } from './useIndicators'
import { useIndicatorMutations } from './useIndicatorMutations'
import type { Polarity } from './indicatorMeta'
import {
  roleTemplates,
  type IndicatorType,
  type RoleKey,
} from '../../../templates/roleTemplates'

interface ReviewItem {
  key: string
  name: string
  polarity: Polarity
  /** Set when the indicator is already assigned to the person. */
  existingId?: string
  /** True when the indicator comes from the selected role's template. */
  suggested: boolean
  checked: boolean
}

interface ReviewSectionMeta {
  polarity: Polarity
  title: string
  icon: string
  color: 'danger' | 'success'
}

const sections: ReviewSectionMeta[] = [
  { polarity: 'undesired', title: 'Challenges', icon: removeCircle, color: 'danger' },
  {
    polarity: 'desired',
    title: 'Positive Signs',
    icon: checkmarkCircle,
    color: 'success',
  },
]

const polarityForType = (type: IndicatorType): Polarity =>
  type === 'positive' ? 'desired' : 'undesired'

const matchKey = (polarity: Polarity, name: string) =>
  `${polarity}|${name.trim().toLowerCase()}`

/**
 * Merges the person's current indicators with the selected role's suggestions
 * into one checklist. Exact matches (same polarity + name) collapse into a
 * single existing row so nothing is duplicated.
 */
const buildReviewItems = (existing: Indicator[], roleKey: RoleKey): ReviewItem[] => {
  const items: ReviewItem[] = existing.map((indicator) => ({
    key: `existing-${indicator.id}`,
    name: indicator.name,
    polarity: (indicator.polarity ?? 'undesired') as Polarity,
    existingId: indicator.id,
    suggested: false,
    checked: true,
  }))

  const seen = new Map(items.map((item) => [matchKey(item.polarity, item.name), item]))

  roleTemplates[roleKey].indicators.forEach((indicator, index) => {
    const polarity = polarityForType(indicator.type)
    const existingItem = seen.get(matchKey(polarity, indicator.label))
    if (existingItem) {
      existingItem.suggested = true
      return
    }
    items.push({
      key: `suggested-${index}`,
      name: indicator.label,
      polarity,
      suggested: true,
      checked: true,
    })
  })

  return items
}

const useReviewItems = (personId: string, roleKey: RoleKey) => {
  const { data: existing, isLoading } = useIndicators(personId)
  const { create, remove } = useIndicatorMutations(personId)
  const [items, setItems] = useState<ReviewItem[]>([])
  const [saving, setSaving] = useState(false)
  const initialized = useRef(false)

  useEffect(() => {
    if (isLoading || initialized.current) return
    initialized.current = true
    setItems(buildReviewItems(existing ?? [], roleKey))
  }, [existing, isLoading, roleKey])

  const toggle = (key: string) =>
    setItems((prev) =>
      prev.map((item) =>
        item.key === key ? { ...item, checked: !item.checked } : item,
      ),
    )

  const toAdd = items.filter((item) => !item.existingId && item.checked)
  const toRemove = items.filter((item) => item.existingId && !item.checked)

  const save = async () => {
    setSaving(true)
    try {
      for (const item of toAdd) {
        await create({ name: item.name, polarity: item.polarity, inputType: 'boolean' })
      }
      for (const item of toRemove) {
        await remove(item.existingId!)
      }
      return true
    } catch (error) {
      console.error('Failed to apply suggested indicators:', error)
      setSaving(false)
      return false
    }
  }

  return {
    items,
    isLoading,
    saving,
    toggle,
    save,
    addCount: toAdd.length,
    removeCount: toRemove.length,
  }
}

const ReviewSection = ({
  section,
  items,
  onToggle,
}: {
  readonly section: ReviewSectionMeta
  readonly items: ReviewItem[]
  readonly onToggle: (key: string) => void
}) => (
  <section className="indicator-group">
    <div className="section-header">
      <h2>{section.title}</h2>
    </div>

    {items.length === 0 ? (
      <p className="section-empty">Nothing to suggest here.</p>
    ) : (
      <IonList
        lines="none"
        className="indicator-list"
      >
        {items.map((item) => (
          <IonItem
            key={item.key}
            className="indicator-row"
          >
            <IonIcon
              slot="start"
              icon={section.icon}
              color={section.color}
            />
            <IonLabel>{item.name}</IonLabel>
            {item.suggested && !item.existingId && (
              <span className="suggested-row__badge">Suggested</span>
            )}
            <IonCheckbox
              slot="end"
              checked={item.checked}
              color={section.color}
              onIonChange={() => onToggle(item.key)}
            />
          </IonItem>
        ))}
      </IonList>
    )}
  </section>
)

const saveLabel = (addCount: number, removeCount: number): string => {
  if (addCount === 0 && removeCount === 0) return 'Done'
  const parts: string[] = []
  if (addCount > 0) parts.push(`Add ${addCount}`)
  if (removeCount > 0) parts.push(`Remove ${removeCount}`)
  return parts.join(' · ')
}

/**
 * Add/subtract review: choose which suggested and existing indicators the
 * person should end up with, then apply the changes.
 * @returns Suggested-indicator review page.
 */
const SuggestReviewPage = () => {
  const router = useIonRouter()
  const { personId, roleKey } = useParams<{ personId: string; roleKey: RoleKey }>()
  const template = roleTemplates[roleKey]
  const review = useReviewItems(personId, roleKey)

  const apply = async () => {
    if (await review.save()) {
      router.push(`/person/${personId}`, 'back', 'replace')
    }
  }

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton
              defaultHref={`/person/${personId}/indicators/suggest`}
              text=""
            />
          </IonButtons>
          <IonTitle>{template ? template.label : 'Suggested'}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent
        fullscreen
        className="ion-padding safe-content"
      >
        <p className="indicator-intro">
          Check the signals you want to keep. Unchecked items you already have will be
          removed.
        </p>

        {review.isLoading ? (
          <LoadingState
            variant="list"
            label="Loading suggested signals"
            rows={5}
          />
        ) : (
          <>
            {sections.map((section) => (
              <ReviewSection
                key={section.polarity}
                section={section}
                items={review.items.filter(
                  (item) => item.polarity === section.polarity,
                )}
                onToggle={review.toggle}
              />
            ))}

            <div className="wizard-footer">
              <IonButton
                expand="block"
                disabled={review.saving}
                onClick={apply}
              >
                {review.saving ? (
                  <IonSpinner name="crescent" />
                ) : (
                  saveLabel(review.addCount, review.removeCount)
                )}
              </IonButton>
            </div>
          </>
        )}
        <AppDisclaimer />
      </IonContent>
    </IonPage>
  )
}

export default SuggestReviewPage
