import {
  accessibilityOutline,
  bodyOutline,
  flowerOutline,
  happyOutline,
  heartCircleOutline,
  heartOutline,
  medkitOutline,
  peopleCircleOutline,
  peopleOutline,
  personCircleOutline,
  sparklesOutline,
} from 'ionicons/icons'
import type { PersonRole } from '../lib/domain'

/**
 * Starter indicators are signals, not opposites. Each measures a distinct
 * aspect of a person's day (e.g. "Used coping skills" vs "Meltdown"), favoring
 * observable behaviors, accomplishments, events, and challenges over vague
 * adjectives. These defaults are only a starting point — every one can be
 * edited, removed, or added to during onboarding.
 */
export type IndicatorType = 'positive' | 'negative'

/**
 * A single suggested indicator within a role template.
 */
export interface IndicatorTemplate {
  label: string
  type: IndicatorType
}

/**
 * The roles a person can be tracked as. This is the single source of truth for
 * the onboarding role picker — adding a new role only requires adding an entry
 * to {@link roleTemplates} (and mapping it in {@link roleToPersonRole}).
 */
export type RoleKey =
  | 'myself'
  | 'child'
  | 'teen'
  | 'partner'
  | 'parent'
  | 'caregiver'
  | 'sibling'
  | 'grandparent'
  | 'friend'
  | 'recovery'
  | 'autismSupport'

/**
 * A role's label, description, icon, and starter indicators.
 */
export interface RoleTemplate {
  label: string
  description: string
  icon: string
  indicators: IndicatorTemplate[]
}

export const roleTemplates: Record<RoleKey, RoleTemplate> = {
  myself: {
    label: 'Myself',
    description: 'Track your own well-being and self-care.',
    icon: personCircleOutline,
    indicators: [
      { label: 'Negative self-talk', type: 'negative' },
      { label: 'Anxiety or overwhelm', type: 'negative' },
      { label: 'Low energy', type: 'negative' },
      { label: 'Missed medication', type: 'negative' },
      { label: 'Feeling isolated', type: 'negative' },

      { label: 'Drank enough water', type: 'positive' },
      { label: 'Moved my body', type: 'positive' },
      { label: 'Practiced self-care', type: 'positive' },
      { label: 'Connected with someone', type: 'positive' },
      { label: 'Accomplished something meaningful', type: 'positive' },
    ],
  },

  child: {
    label: 'Child',
    description: "Track your child's behaviors and growth.",
    icon: accessibilityOutline,
    indicators: [
      { label: 'Meltdown', type: 'negative' },
      { label: 'Aggression', type: 'negative' },
      { label: 'Difficulty transitioning', type: 'negative' },
      { label: 'Toileting accident', type: 'negative' },
      { label: 'School concern', type: 'negative' },

      { label: 'Used coping skills', type: 'positive' },
      { label: 'Positive social interaction', type: 'positive' },
      { label: 'Completed routines', type: 'positive' },
      { label: 'Tried something new', type: 'positive' },
      { label: 'Laughed or showed joy', type: 'positive' },
    ],
  },

  teen: {
    label: 'Teen',
    description: 'Track emotional health and independence.',
    icon: bodyOutline,
    indicators: [
      { label: 'Anxiety', type: 'negative' },
      { label: 'School concern', type: 'negative' },
      { label: 'Emotional withdrawal', type: 'negative' },
      { label: 'Conflict at home', type: 'negative' },
      { label: 'Risky behavior', type: 'negative' },

      { label: 'Completed responsibilities', type: 'positive' },
      { label: 'Healthy social interaction', type: 'positive' },
      { label: 'Used coping strategies', type: 'positive' },
      { label: 'Worked toward a goal', type: 'positive' },
      { label: 'Showed independence', type: 'positive' },
    ],
  },

  partner: {
    label: 'Spouse / Partner',
    description: 'Support one another through life.',
    icon: heartOutline,
    indicators: [
      { label: 'High stress', type: 'negative' },
      { label: 'Conflict', type: 'negative' },
      { label: 'Emotional withdrawal', type: 'negative' },
      { label: 'Burnout', type: 'negative' },
      { label: 'Overworked', type: 'negative' },

      { label: 'Open communication', type: 'positive' },
      { label: 'Quality time together', type: 'positive' },
      { label: 'Helped around the house', type: 'positive' },
      { label: 'Practiced self-care', type: 'positive' },
      { label: 'Expressed gratitude', type: 'positive' },
    ],
  },

  parent: {
    label: 'Parent',
    description: 'Monitor the health of an aging parent.',
    icon: peopleOutline,
    indicators: [
      { label: 'Confusion', type: 'negative' },
      { label: 'Missed medication', type: 'negative' },
      { label: 'Fall or near fall', type: 'negative' },
      { label: 'Poor appetite', type: 'negative' },
      { label: 'Social isolation', type: 'negative' },

      { label: 'Social engagement', type: 'positive' },
      { label: 'Completed daily routine', type: 'positive' },
      { label: 'Enjoyed an activity', type: 'positive' },
      { label: 'Stayed physically active', type: 'positive' },
      { label: 'Managed medications independently', type: 'positive' },
    ],
  },

  caregiver: {
    label: 'Caregiver',
    description: 'Care for the caregiver.',
    icon: heartCircleOutline,
    indicators: [
      { label: 'Burnout', type: 'negative' },
      { label: 'Compassion fatigue', type: 'negative' },
      { label: 'Feeling overwhelmed', type: 'negative' },
      { label: 'Skipped meals', type: 'negative' },
      { label: 'Difficulty asking for help', type: 'negative' },

      { label: 'Took a meaningful break', type: 'positive' },
      { label: 'Connected with a friend', type: 'positive' },
      { label: 'Set healthy boundaries', type: 'positive' },
      { label: 'Practiced self-care', type: 'positive' },
      { label: 'Celebrated a win', type: 'positive' },
    ],
  },

  sibling: {
    label: 'Sibling',
    description: 'Track the well-being of a sibling.',
    icon: peopleCircleOutline,
    indicators: [
      { label: 'Feeling left out', type: 'negative' },
      { label: 'Emotional outburst', type: 'negative' },
      { label: 'Conflict', type: 'negative' },
      { label: 'Anxiety', type: 'negative' },
      { label: 'Difficulty expressing feelings', type: 'negative' },

      { label: 'Positive play', type: 'positive' },
      { label: 'Good communication', type: 'positive' },
      { label: 'Helped someone', type: 'positive' },
      { label: 'Tried something new', type: 'positive' },
      { label: 'Shared a happy moment', type: 'positive' },
    ],
  },

  grandparent: {
    label: 'Grandparent',
    description: 'Support healthy aging.',
    icon: flowerOutline,
    indicators: [
      { label: 'Confusion', type: 'negative' },
      { label: 'Fall or near fall', type: 'negative' },
      { label: 'Poor appetite', type: 'negative' },
      { label: 'Fatigue', type: 'negative' },
      { label: 'Memory concerns', type: 'negative' },

      { label: 'Socialized with others', type: 'positive' },
      { label: 'Stayed physically active', type: 'positive' },
      { label: 'Completed daily routine', type: 'positive' },
      { label: 'Enjoyed a favorite activity', type: 'positive' },
      { label: 'Managed medications independently', type: 'positive' },
    ],
  },

  friend: {
    label: 'Friend',
    description: 'Support a friend through life.',
    icon: happyOutline,
    indicators: [
      { label: 'High stress', type: 'negative' },
      { label: 'Social isolation', type: 'negative' },
      { label: 'Anxiety', type: 'negative' },
      { label: 'Low motivation', type: 'negative' },
      { label: 'Health concern', type: 'negative' },

      { label: 'Reached out to someone', type: 'positive' },
      { label: 'Enjoyed a hobby', type: 'positive' },
      { label: 'Practiced self-care', type: 'positive' },
      { label: 'Accomplished a goal', type: 'positive' },
      { label: 'Shared a positive moment', type: 'positive' },
    ],
  },

  recovery: {
    label: 'Recovery',
    description: 'Track recovery after illness or injury.',
    icon: medkitOutline,
    indicators: [
      { label: 'Increased pain', type: 'negative' },
      { label: 'Missed medication', type: 'negative' },
      { label: 'Fever or illness', type: 'negative' },
      { label: 'Fatigue', type: 'negative' },
      { label: 'Mobility difficulties', type: 'negative' },

      { label: 'Completed physical therapy', type: 'positive' },
      { label: 'Pain improving', type: 'positive' },
      { label: 'Walked independently', type: 'positive' },
      { label: 'Healthy appetite', type: 'positive' },
      { label: 'Reached a recovery milestone', type: 'positive' },
    ],
  },

  autismSupport: {
    label: 'Autism Support',
    description: 'Track regulation and developmental progress.',
    icon: sparklesOutline,
    indicators: [
      { label: 'Meltdown', type: 'negative' },
      { label: 'Sensory overload', type: 'negative' },
      { label: 'Elopement attempt', type: 'negative' },
      { label: 'Aggression', type: 'negative' },
      { label: 'Difficulty transitioning', type: 'negative' },

      { label: 'Used coping skills', type: 'positive' },
      { label: 'Successful transition', type: 'positive' },
      { label: 'Positive communication', type: 'positive' },
      { label: 'Completed routine', type: 'positive' },
      { label: 'Self-advocated', type: 'positive' },
    ],
  },
}

/** Ordered role keys for rendering the picker (insertion order preserved). */
export const roleKeys = Object.keys(roleTemplates) as RoleKey[]

/**
 * Maps each wizard role to the closest persisted `Person.role` enum value.
 * The wizard role drives which starter template loads; only this coarser value
 * is stored, so no backend schema change is needed to add new roles.
 */
export const roleToPersonRole: Record<RoleKey, PersonRole> = {
  myself: 'self',
  child: 'child',
  teen: 'child',
  partner: 'spouse',
  parent: 'parent',
  caregiver: 'caregiver',
  sibling: 'other',
  grandparent: 'parent',
  friend: 'other',
  recovery: 'other',
  autismSupport: 'child',
}
