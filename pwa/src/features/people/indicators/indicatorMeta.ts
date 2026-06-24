import {
  checkmarkCircle,
  removeCircle,
  calculatorOutline,
  checkmarkCircleOutline,
  happyOutline,
  repeatOutline,
  timerOutline,
} from 'ionicons/icons'

import type { IndicatorInput } from './useIndicatorMutations'

export type Polarity = IndicatorInput['polarity']
export type InputType = IndicatorInput['inputType']

export const polarityMeta: Record<
  Polarity,
  {
    title: string
    color: 'danger' | 'success'
    icon: string
    blurb: string
    examples: string
  }
> = {
  undesired: {
    title: 'Undesired',
    color: 'danger',
    icon: removeCircle,
    blurb: 'Behaviors or situations that may increase distress or indicate challenges.',
    examples: 'Aggression, meltdowns, school refusal, sleep issues',
  },
  desired: {
    title: 'Desired',
    color: 'success',
    icon: checkmarkCircle,
    blurb: 'Positive behaviors or outcomes that support well-being and progress.',
    examples: 'Eating well, using coping skills, good sleep, completed tasks',
  },
}

interface TrackOption {
  value: InputType
  label: string
  helper: string
}

const commonTrackOptions: TrackOption[] = [
  { value: 'boolean', label: 'Yes / No', helper: 'Did it happen?' },
  { value: 'frequency', label: 'Frequency', helper: 'How often it happens' },
  { value: 'scale', label: 'Intensity', helper: 'Rate severity (1–5)' },
]

export function trackOptionsFor(polarity: Polarity): TrackOption[] {
  if (polarity === 'desired') {
    return [
      ...commonTrackOptions,
      { value: 'count', label: 'Count', helper: 'How many times / how many' },
    ]
  }

  return [
    ...commonTrackOptions,
    { value: 'duration', label: 'Duration', helper: 'How long it lasts' },
  ]
}

export const inputTypeLabels: Record<InputType, string> = {
  boolean: 'Yes / no',
  frequency: 'Frequency',
  scale: 'Intensity',
  count: 'Count',
  duration: 'Duration',
  text: 'Note',
}

export const inputTypeIcons: Record<InputType, string> = {
  boolean: checkmarkCircleOutline,
  frequency: repeatOutline,
  scale: happyOutline,
  count: calculatorOutline,
  duration: timerOutline,
  text: checkmarkCircleOutline,
}
