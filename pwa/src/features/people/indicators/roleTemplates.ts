import type { PersonRole } from '../../../lib/domain';
import type { Polarity, InputType } from './indicatorMeta';

export interface TemplateIndicator {
    name: string;
    polarity: Polarity;
    inputType: InputType;
    description?: string;
    /** Whether this indicator is pre-checked by default in the checklist */
    defaultSelected: boolean;
}

export interface RoleTemplate {
    role: PersonRole;
    label: string;
    indicators: TemplateIndicator[];
}

/**
 * Role-based indicator templates managed in code.
 * These are the source of truth and can be synced to DynamoDB
 * so users get updates without downloading a new app version.
 */
export const roleTemplates: RoleTemplate[] = [
    {
        role: 'child',
        label: 'Child',
        indicators: [
            { name: 'Aggression', polarity: 'undesired', inputType: 'frequency', defaultSelected: true },
            { name: 'School Refusal', polarity: 'undesired', inputType: 'boolean', defaultSelected: true },
            { name: 'Sleep Problems', polarity: 'undesired', inputType: 'boolean', defaultSelected: true },
            { name: 'Sensory Overload', polarity: 'undesired', inputType: 'frequency', defaultSelected: true },
            { name: 'Toileting Regression', polarity: 'undesired', inputType: 'boolean', defaultSelected: true },
            { name: 'Appetite Changes', polarity: 'undesired', inputType: 'boolean', defaultSelected: false },
            { name: 'Self Harm', polarity: 'undesired', inputType: 'frequency', defaultSelected: false },
            { name: 'Isolation', polarity: 'undesired', inputType: 'boolean', defaultSelected: false },
            { name: 'Meltdowns', polarity: 'undesired', inputType: 'frequency', defaultSelected: false },
            { name: 'Eating 3 Meals', polarity: 'desired', inputType: 'boolean', defaultSelected: true },
            { name: 'Using Coping Skills', polarity: 'desired', inputType: 'boolean', defaultSelected: true },
            { name: 'Good Sleep', polarity: 'desired', inputType: 'boolean', defaultSelected: true },
            { name: 'Completed Homework', polarity: 'desired', inputType: 'boolean', defaultSelected: false },
            { name: 'Positive Social Interaction', polarity: 'desired', inputType: 'boolean', defaultSelected: false },
        ],
    },
    {
        role: 'self',
        label: 'Myself',
        indicators: [
            { name: 'Stress Level', polarity: 'undesired', inputType: 'scale', defaultSelected: true },
            { name: 'Poor Sleep', polarity: 'undesired', inputType: 'boolean', defaultSelected: true },
            { name: 'Skipped Meals', polarity: 'undesired', inputType: 'boolean', defaultSelected: true },
            { name: 'Burnout Feelings', polarity: 'undesired', inputType: 'scale', defaultSelected: false },
            { name: 'Anxiety', polarity: 'undesired', inputType: 'scale', defaultSelected: false },
            { name: 'Exercised', polarity: 'desired', inputType: 'boolean', defaultSelected: true },
            { name: 'Drank Enough Water', polarity: 'desired', inputType: 'boolean', defaultSelected: true },
            { name: 'Took Breaks', polarity: 'desired', inputType: 'boolean', defaultSelected: false },
            { name: 'Practiced Self-Care', polarity: 'desired', inputType: 'boolean', defaultSelected: false },
        ],
    },
    {
        role: 'spouse',
        label: 'Spouse',
        indicators: [
            { name: 'Stress Level', polarity: 'undesired', inputType: 'scale', defaultSelected: true },
            { name: 'Poor Sleep', polarity: 'undesired', inputType: 'boolean', defaultSelected: true },
            { name: 'Conflict', polarity: 'undesired', inputType: 'frequency', defaultSelected: false },
            { name: 'Quality Time Together', polarity: 'desired', inputType: 'boolean', defaultSelected: true },
            { name: 'Good Communication', polarity: 'desired', inputType: 'boolean', defaultSelected: true },
            { name: 'Shared Responsibilities', polarity: 'desired', inputType: 'boolean', defaultSelected: false },
        ],
    },
    {
        role: 'parent',
        label: 'Parent',
        indicators: [
            { name: 'Confusion / Disorientation', polarity: 'undesired', inputType: 'frequency', defaultSelected: true },
            { name: 'Falls', polarity: 'undesired', inputType: 'frequency', defaultSelected: true },
            { name: 'Missed Medication', polarity: 'undesired', inputType: 'boolean', defaultSelected: true },
            { name: 'Mood Changes', polarity: 'undesired', inputType: 'scale', defaultSelected: false },
            { name: 'Ate Well', polarity: 'desired', inputType: 'boolean', defaultSelected: true },
            { name: 'Took Medication', polarity: 'desired', inputType: 'boolean', defaultSelected: true },
            { name: 'Social Activity', polarity: 'desired', inputType: 'boolean', defaultSelected: false },
            { name: 'Physical Activity', polarity: 'desired', inputType: 'boolean', defaultSelected: false },
        ],
    },
    {
        role: 'caregiver',
        label: 'Caregiver',
        indicators: [
            { name: 'Burnout', polarity: 'undesired', inputType: 'scale', defaultSelected: true },
            { name: 'Missed Tasks', polarity: 'undesired', inputType: 'frequency', defaultSelected: true },
            { name: 'Communication Issues', polarity: 'undesired', inputType: 'boolean', defaultSelected: false },
            { name: 'Reliable Attendance', polarity: 'desired', inputType: 'boolean', defaultSelected: true },
            { name: 'Followed Care Plan', polarity: 'desired', inputType: 'boolean', defaultSelected: true },
            { name: 'Positive Engagement', polarity: 'desired', inputType: 'boolean', defaultSelected: false },
        ],
    },
    {
        role: 'other',
        label: 'Other',
        indicators: [
            { name: 'Stress Level', polarity: 'undesired', inputType: 'scale', defaultSelected: true },
            { name: 'Mood Changes', polarity: 'undesired', inputType: 'scale', defaultSelected: false },
            { name: 'Good Communication', polarity: 'desired', inputType: 'boolean', defaultSelected: true },
            { name: 'Positive Engagement', polarity: 'desired', inputType: 'boolean', defaultSelected: false },
        ],
    },
];

/** Get the template for a given role, falling back to 'other' */
export function getTemplateForRole(role: PersonRole): RoleTemplate {
    return roleTemplates.find((t) => t.role === role) ?? roleTemplates[roleTemplates.length - 1];
}
