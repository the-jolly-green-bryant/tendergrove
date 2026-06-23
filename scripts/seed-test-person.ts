/**
 * Seed a test person with a full year of check-in data.
 *
 * Run with: npx tsx scripts/seed-test-person.ts
 *
 * Creates:
 *  - A "Test Household" with one child person ("Alex Test")
 *  - Indicators from the child role template (defaultSelected ones)
 *  - 365 days of check-ins (ending today) with:
 *      • Baseline random behavior across all indicators
 *      • Crisis-level spikes in 3 randomly chosen months
 *      • One specific indicator that flags ONLY on two fixed weekdays
 */

import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';
import outputs from '../amplify_outputs.json';

Amplify.configure(outputs as Parameters<typeof Amplify.configure>[0]);

const client = generateClient<Schema>();

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Pick `count` unique random items from an array */
function pickRandom<T>(arr: T[], count: number): T[] {
    const copy = [...arr];
    const result: T[] = [];
    for (let i = 0; i < count && copy.length > 0; i++) {
        const idx = Math.floor(Math.random() * copy.length);
        result.push(copy.splice(idx, 1)[0]);
    }
    return result;
}

/** Day-of-week names for logging */
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/* ------------------------------------------------------------------ */
/*  Indicator definitions (child template, default-selected subset)   */
/* ------------------------------------------------------------------ */

interface SeedIndicator {
    name: string;
    polarity: 'desired' | 'undesired';
    inputType: string;
}

const INDICATORS: SeedIndicator[] = [
    { name: 'Aggression', polarity: 'undesired', inputType: 'frequency' },
    { name: 'School Refusal', polarity: 'undesired', inputType: 'boolean' },
    { name: 'Sleep Problems', polarity: 'undesired', inputType: 'boolean' },
    { name: 'Sensory Overload', polarity: 'undesired', inputType: 'frequency' },
    { name: 'Toileting Regression', polarity: 'undesired', inputType: 'boolean' },
    { name: 'Self Harm', polarity: 'undesired', inputType: 'frequency' },
    { name: 'Meltdowns', polarity: 'undesired', inputType: 'frequency' },
    { name: 'Eating 3 Meals', polarity: 'desired', inputType: 'boolean' },
    { name: 'Using Coping Skills', polarity: 'desired', inputType: 'boolean' },
    { name: 'Good Sleep', polarity: 'desired', inputType: 'boolean' },
];

/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */

async function seed() {
    console.log('🌱 Seeding test person with a year of check-in data...\n');

    // 1. Create household
    const hhResult = await client.models.Household.create({ name: 'Test Household' });
    if (hhResult.errors?.length) throw new Error(hhResult.errors[0].message);
    const householdId = hhResult.data!.id;
    console.log(`  ✓ Household created: ${householdId}`);

    // 2. Create person
    const personResult = await client.models.Person.create({
        householdId,
        displayName: 'Alex Test',
        role: 'child',
    });
    if (personResult.errors?.length) throw new Error(personResult.errors[0].message);
    const personId = personResult.data!.id;
    console.log(`  ✓ Person created: Alex Test (${personId})`);

    // 3. Create indicators and collect their IDs
    const indicatorIds: { id: string; meta: SeedIndicator }[] = [];
    for (const ind of INDICATORS) {
        const result = await client.models.Indicator.create({
            personId,
            name: ind.name,
            polarity: ind.polarity,
            inputType: ind.inputType,
            active: true,
        });
        if (result.errors?.length) throw new Error(result.errors[0].message);
        indicatorIds.push({ id: result.data!.id, meta: ind });
        console.log(`  ✓ Indicator: ${ind.name} (${ind.polarity})`);
    }

    // 4. Separate undesired indicators (used for crisis spike + weekday selection)
    const undesiredIndicators = indicatorIds.filter((i) => i.meta.polarity === 'undesired');

    // 5. Pick 3 random months (0-11) for crisis spikes
    const allMonths = Array.from({ length: 12 }, (_, i) => i);
    const crisisMonths = pickRandom(allMonths, 3);
    console.log(`\n  📈 Crisis spike months: ${crisisMonths.map((m) => m + 1).join(', ')}`);

    // 6. Pick one undesired indicator to flag on exactly 2 weekdays
    const weekdayIndicator = pickRandom(undesiredIndicators, 1)[0];
    const allDays = [0, 1, 2, 3, 4, 5, 6]; // Sun-Sat
    const fixedDays = pickRandom(allDays, 2);
    console.log(
        `  📅 "${weekdayIndicator.meta.name}" will flag only on ${fixedDays.map((d) => DAY_NAMES[d]).join(' & ')}\n`,
    );

    // 7. Generate 365 days of check-ins
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    let created = 0;
    for (let daysAgo = 364; daysAgo >= 0; daysAgo--) {
        const date = new Date(today);
        date.setDate(date.getDate() - daysAgo);

        const month = date.getMonth();
        const dayOfWeek = date.getDay();
        const isCrisisMonth = crisisMonths.includes(month);

        const checked: string[] = [];

        for (const ind of indicatorIds) {
            // Special weekday-only indicator
            if (ind.id === weekdayIndicator.id) {
                if (fixedDays.includes(dayOfWeek)) {
                    checked.push(ind.id);
                }
                continue;
            }

            if (ind.meta.polarity === 'undesired') {
                // Crisis months: 60-85% chance each undesired indicator fires
                // Normal months: 10-20% chance
                const prob = isCrisisMonth ? 0.6 + Math.random() * 0.25 : 0.1 + Math.random() * 0.1;
                if (Math.random() < prob) {
                    checked.push(ind.id);
                }
            } else {
                // Desired indicators: crisis months → less frequent (30-50%)
                // Normal months: 60-85%
                const prob = isCrisisMonth ? 0.3 + Math.random() * 0.2 : 0.6 + Math.random() * 0.25;
                if (Math.random() < prob) {
                    checked.push(ind.id);
                }
            }
        }

        const occurredAt = date.toISOString();
        const result = await client.models.CheckIn.create({
            personId,
            occurredAt,
            answersJson: JSON.stringify({ checked }),
        });

        if (result.errors?.length) {
            console.error(`  ✗ Check-in ${date.toISOString().slice(0, 10)}: ${result.errors[0].message}`);
        } else {
            created++;
            if (created % 30 === 0) {
                console.log(`  … ${created} check-ins created`);
            }
        }
    }

    console.log(`\n  ✓ ${created} check-ins created over 365 days`);

    // 8. Summary
    console.log('\n📋 Summary:');
    console.log(`   Person:  Alex Test (child)`);
    console.log(`   Crisis months: ${crisisMonths.map((m) => m + 1).join(', ')}`);
    console.log(
        `   Weekday indicator: "${weekdayIndicator.meta.name}" → ${fixedDays.map((d) => DAY_NAMES[d]).join(' & ')}`,
    );
    console.log(`   Total check-ins: ${created}`);
    console.log('\nDone! 🎉');
}

seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
