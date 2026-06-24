/**
 * Sync role templates from code to DynamoDB.
 *
 * Run with: npx tsx scripts/sync-role-templates.ts
 *
 * This script reads the role templates defined in code and upserts them
 * into the RoleTemplate DynamoDB table via the Amplify Data client.
 * This allows template updates to be managed in code and deployed
 * without requiring users to download a new app version.
 */

import { Amplify } from 'aws-amplify'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../amplify/data/resource'
import outputs from '../amplify_outputs.json'
import { roleTemplates } from '../pwa/src/features/people/indicators/roleTemplates'

Amplify.configure(outputs as Parameters<typeof Amplify.configure>[0])

const client = generateClient<Schema>()

const TEMPLATE_VERSION = 1

async function syncTemplates() {
  console.log('Syncing role templates to DynamoDB...\n')

  for (const template of roleTemplates) {
    const { role, label, indicators } = template

    // Check if a template already exists for this role
    const existing = await client.models.RoleTemplate.list({
      filter: { role: { eq: role } },
    })

    const existingRecord = existing.data?.[0]

    if (existingRecord) {
      // Update existing template
      const result = await client.models.RoleTemplate.update({
        id: existingRecord.id,
        label,
        version: TEMPLATE_VERSION,
        indicatorsJson: JSON.stringify(indicators),
      })

      if (result.errors?.length) {
        console.error(`  ✗ ${role}: ${result.errors[0].message}`)
      } else {
        console.log(`  ✓ ${role}: updated (${indicators.length} indicators)`)
      }
    } else {
      // Create new template
      const result = await client.models.RoleTemplate.create({
        role,
        label,
        version: TEMPLATE_VERSION,
        indicatorsJson: JSON.stringify(indicators),
      })

      if (result.errors?.length) {
        console.error(`  ✗ ${role}: ${result.errors[0].message}`)
      } else {
        console.log(`  ✓ ${role}: created (${indicators.length} indicators)`)
      }
    }
  }

  console.log('\nDone!')
}

syncTemplates().catch((err) => {
  console.error('Sync failed:', err)
  process.exit(1)
})
