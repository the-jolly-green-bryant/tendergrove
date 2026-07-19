import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/react'
import { closeOutline } from 'ionicons/icons'
import type { CSSProperties, RefObject } from 'react'

import { PersonAvatar } from '../../../components/PersonAvatar'
import { RightDrawer } from '../../../components/RightDrawer'
import type { AnalyticsPersonRef } from '../analytics'

export const COMPARISON_COLORS = [
  '#0072b2',
  '#e69f00',
  '#cc79a7',
  '#56b4e9',
  '#d55e00',
  '#6f42c1',
] as const

type ComparisonColorStyle = CSSProperties & {
  '--comparison-color': string
}

export const comparisonColor = (personId: string) => {
  // Hash the id so a person's color stays stable when the candidate list changes.
  const hash = [...personId].reduce(
    (value, character) => (value * 31 + character.charCodeAt(0)) >>> 0,
    0,
  )
  return COMPARISON_COLORS[hash % COMPARISON_COLORS.length]
}

export const TrendComparisonMenu = ({
  menuRef,
  people,
  selectedIds,
  onToggle,
}: {
  readonly menuRef: RefObject<HTMLIonMenuElement | null>
  readonly people: AnalyticsPersonRef[]
  readonly selectedIds: string[]
  readonly onToggle: (personId: string) => void
}) => (
  <RightDrawer
    menuRef={menuRef}
    menuId="trend-comparison-settings"
    className="trend-comparison-menu"
  >
    <IonContent>
      <section className="trend-comparison-menu__section">
        <div className="trend-comparison-menu__heading">
          <h2>Trend settings</h2>
          <IonButton
            fill="clear"
            aria-label="Close trend settings"
            onClick={() => void menuRef.current?.close()}
          >
            <IonIcon icon={closeOutline} />
          </IonButton>
        </div>
        <p className="trend-comparison-menu__eyebrow">Compare</p>
        <p className="trend-comparison-menu__help">
          Add weighted averages to this chart.
        </p>
        <IonList lines="none">
          {people.length === 0 && (
            <p className="trend-comparison-menu__empty">
              There aren’t any other people to compare yet.
            </p>
          )}
          {people.map((person) => {
            const checked = selectedIds.includes(person.id)
            const color = comparisonColor(person.id)
            return (
              <IonItem
                button
                detail={false}
                key={person.id}
                className="trend-comparison-menu__person"
                style={{ '--comparison-color': color } as ComparisonColorStyle}
                onClick={() => onToggle(person.id)}
              >
                <PersonAvatar
                  slot="start"
                  name={person.displayName}
                  src={person.avatarUrl}
                  className="trend-comparison-menu__avatar"
                />
                <IonLabel>{person.displayName}</IonLabel>
                <span
                  className="trend-comparison-menu__swatch"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <IonCheckbox
                  slot="end"
                  checked={checked}
                  aria-label={`Compare ${person.displayName}`}
                  onClick={(event) => event.stopPropagation()}
                  onIonChange={() => onToggle(person.id)}
                />
              </IonItem>
            )
          })}
        </IonList>
      </section>
    </IonContent>
  </RightDrawer>
)
