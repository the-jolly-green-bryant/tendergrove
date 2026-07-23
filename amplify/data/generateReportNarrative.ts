import { createHash } from 'node:crypto'
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime'

import type { Schema } from './resource'

interface NarrativeFact {
  id: string
  meaning: string
  replacement: string
}

interface NarrativeEnvelope {
  schemaVersion: number
  facts: NarrativeFact[]
}

const bedrock = new BedrockRuntimeClient({})
const placeholderPattern = /\{\{[a-z][a-z0-9_]*\}\}/g
const unsafeClinicalLanguage = /\b(diagnos(?:e|is|ed)|psychosis|schizophren|hospitali[sz]|treatment plan|must seek|needs clinical|requires care|medical advice)\b/i

const parseEnvelope = (value: string): NarrativeEnvelope => {
  if (value.length > 16_000) throw new Error('Facts payload is too large')
  const parsed = JSON.parse(value) as Partial<NarrativeEnvelope>
  if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.facts) || parsed.facts.length < 2 || parsed.facts.length > 16) {
    throw new Error('Unsupported facts payload')
  }
  const facts = parsed.facts.map((fact) => {
    if (
      !fact
      || typeof fact.id !== 'string'
      || !/^[a-z][a-z0-9_]*$/.test(fact.id)
      || typeof fact.meaning !== 'string'
      || fact.meaning.length > 240
      || typeof fact.replacement !== 'string'
      || fact.replacement.length > 500
    ) throw new Error('Invalid narrative fact')
    return fact as NarrativeFact
  })
  if (new Set(facts.map((fact) => fact.id)).size !== facts.length) throw new Error('Duplicate narrative fact')
  return { schemaVersion: 1, facts }
}

export const validateNarrativeTemplate = (text: string, facts: NarrativeFact[]) => {
  const trimmed = text.trim()
  if (trimmed.length < 80 || trimmed.length > 1_800) throw new Error('Narrative length is invalid')
  if (/[0-9%]/.test(trimmed)) throw new Error('Narrative contains model-authored numbers')
  if (unsafeClinicalLanguage.test(trimmed)) throw new Error('Narrative contains clinical conclusions')
  const allowed = new Set(facts.map((fact) => `{{${fact.id}}}`))
  const placeholders = trimmed.match(placeholderPattern) ?? []
  if (new Set(placeholders).size < 2 || placeholders.some((placeholder) => !allowed.has(placeholder))) {
    throw new Error('Narrative references invalid facts')
  }
  if (trimmed.replace(placeholderPattern, '').includes('{{') || trimmed.replace(placeholderPattern, '').includes('}}')) {
    throw new Error('Narrative contains malformed placeholders')
  }
  return trimmed
}

export const handler: Schema['generateReportNarrative']['functionHandler'] = async (event) => {
  const { factsJson, factsHash } = event.arguments
  const actualHash = createHash('sha256').update(factsJson).digest('hex')
  if (actualHash !== factsHash) throw new Error('Facts hash does not match payload')
  const envelope = parseEnvelope(factsJson)
  const availableFacts = envelope.facts.map(({ id, meaning }) => ({ placeholder: `{{${id}}}`, meaning }))

  const response = await bedrock.send(new ConverseCommand({
    modelId: process.env.MODEL_ID,
    system: [{
      text: [
        'You write a calm, concise overview of caregiver-recorded observations.',
        'The deterministic Grove report is the only source of facts.',
        'Use the supplied placeholders verbatim wherever evidence belongs.',
        'Never write a number, percent sign, date, diagnosis, cause, treatment recommendation, urgency judgment, or level-of-care conclusion.',
        'Do not mention AI. Do not add headings. Return only two or three short paragraphs.',
        'Explain what deserves attention, what context may matter, and what could be useful to discuss.',
        'Associations are observations and may have other explanations.',
      ].join(' '),
    }],
    messages: [{
      role: 'user',
      content: [{
        text: `Create a plain-language overview using at least two of these evidence placeholders:\n${JSON.stringify(availableFacts)}`,
      }],
    }],
    inferenceConfig: {
      maxTokens: 320,
      temperature: 0,
      topP: 0.8,
    },
  }))

  const text = response.output?.message?.content
    ?.map((item) => 'text' in item ? item.text : '')
    .join('\n')
  if (!text) throw new Error('The narrative model returned no text')
  return validateNarrativeTemplate(text, envelope.facts)
}
