import { checkmarkCircle, removeCircle } from 'ionicons/icons'

import type { IndicatorInput } from './useIndicatorMutations'

/**
 * The type of polarity the user is expected to provide for this indicator.
 */
export type Polarity = IndicatorInput['polarity']

/**
 * The type of input the user is expected to provide for this indicator.
 */
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
    title: 'Negative',
    color: 'danger',
    icon: removeCircle,
    blurb: 'Behaviors or situations that may increase distress or indicate challenges.',
    examples: 'Aggression, meltdowns, school refusal, sleep issues',
  },
  desired: {
    title: 'Positive',
    color: 'success',
    icon: checkmarkCircle,
    blurb: 'Positive behaviors or outcomes that support well-being and progress.',
    examples: 'Eating well, using coping skills, good sleep, completed tasks',
  },
}
