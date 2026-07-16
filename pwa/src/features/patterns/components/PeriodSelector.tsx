import React from 'react'
import { IonLabel, IonSegment, IonSegmentButton } from '@ionic/react'

/** Selectable time ranges, in days. 1M is the default across the app. */
export const PERIOD_OPTIONS = [
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '12M', days: 365 },
] as const

/**
 * A compact 1M / 3M / 6M / 12M range selector (stock-chart style). Drives the
 * visible chart window; analytics retain a longer lookback for context.
 */
export const PeriodSelector = ({
  value,
  onChange,
}: {
  readonly value: number
  readonly onChange: (days: number) => void
}): React.JSX.Element => (
  <IonSegment value={value}>
    {PERIOD_OPTIONS.map((period) => (
      <IonSegmentButton
        value={period.days}
        key={period.days}
        onClick={() => onChange(period.days)}
      >
        <IonLabel>{period.label}</IonLabel>
      </IonSegmentButton>
    ))}
  </IonSegment>
)
