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
