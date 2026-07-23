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
  if (parsed.schemaVersion !== 10 || !Array.isArray(parsed.facts) || parsed.facts.length < 2 || parsed.facts.length > 16) {
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
  return { schemaVersion: 10, facts }
}

const lockedValuePattern = /\d+(?:\.\d+)?%?/g
const lockedValues = (text: string) => (text.match(lockedValuePattern) ?? []).sort()
const recentRatePattern = /\(\d+%, (?:unchanged from baseline|\d+ points (?:up|down) from baseline)\)/

const repairNarrativeTemplate = (text: string, facts: NarrativeFact[]) => {
  const candidates = new Map(text.split('\n').flatMap((line) => {
    const marker = line.match(placeholderPattern)?.[0]
    return marker ? [[marker, line.trim()]] : []
  }))
  return facts.map((fact) => {
    const marker = `{{${fact.id}}}`
    const line = candidates.get(marker)
    const paraphrase = line?.replace(/^- \{\{[a-z][a-z0-9_]*\}\}\s*/, '') ?? ''
    const preservesValues = JSON.stringify(lockedValues(paraphrase)) === JSON.stringify(lockedValues(fact.replacement))
    const preservesRecentRate = !recentRatePattern.test(fact.replacement) || recentRatePattern.test(paraphrase)
    return line && preservesValues && preservesRecentRate && !line.includes('—')
      ? line
      : `- ${marker} ${fact.replacement}`
  }).join('\n')
}

export const validateNarrativeTemplate = (text: string, facts: NarrativeFact[]) => {
  const trimmed = text.trim()
  if (trimmed.length < 40 || trimmed.length > 1_800) throw new Error('Narrative length is invalid')
  if (unsafeClinicalLanguage.test(trimmed)) throw new Error('Narrative contains clinical conclusions')
  if (trimmed.includes('—')) throw new Error('Narrative contains an em dash')
  const allowed = new Set(facts.map((fact) => `{{${fact.id}}}`))
  const placeholders: string[] = trimmed.match(placeholderPattern) ?? []
  if (new Set(placeholders).size < 2 || placeholders.some((placeholder) => !allowed.has(placeholder))) {
    throw new Error('Narrative references invalid facts')
  }
  if (trimmed.replace(placeholderPattern, '').includes('{{') || trimmed.replace(placeholderPattern, '').includes('}}')) {
    throw new Error('Narrative contains malformed placeholders')
  }
  const takeaways = trimmed.split('\n').map((line) => line.trim()).filter(Boolean)
  if (takeaways.length !== facts.length || takeaways.some((line) => !/^- \{\{[a-z][a-z0-9_]*\}\} .+/.test(line))) {
    throw new Error('Narrative must paraphrase every evidence section')
  }
  takeaways.forEach((line) => {
    const marker = line.match(placeholderPattern)?.[0]
    const fact = facts.find(({ id }) => `{{${id}}}` === marker)
    const paraphrase = line.replace(/^- \{\{[a-z][a-z0-9_]*\}\}\s*/, '')
    if (!fact || JSON.stringify(lockedValues(paraphrase)) !== JSON.stringify(lockedValues(fact.replacement))) {
      throw new Error('Narrative changed or omitted a locked value')
    }
    if (recentRatePattern.test(fact.replacement) && !recentRatePattern.test(paraphrase)) {
      throw new Error('Narrative changed the recent-versus-baseline rate format')
    }
  })
  if (new Set(placeholders).size !== facts.length) throw new Error('Narrative omitted an evidence section')
  if (facts.some((fact) => fact.id === 'sustainability') && !placeholders.includes('{{sustainability}}')) {
    throw new Error('Narrative must address day-to-day sustainability')
  }
  const noteworthyIds = new Set(['recent_regressive_days', 'recent_concern_days', 'concern_stretch_1'])
  if (facts.some((fact) => noteworthyIds.has(fact.id)) && !placeholders.some((placeholder) => noteworthyIds.has(placeholder.slice(2, -2)))) {
    throw new Error('Narrative must include noteworthy concern evidence')
  }
  return trimmed
}

export const handler: Schema['generateReportNarrative']['functionHandler'] = async (event) => {
  const { factsJson, factsHash } = event.arguments
  const actualHash = createHash('sha256').update(factsJson).digest('hex')
  if (actualHash !== factsHash) throw new Error('Facts hash does not match payload')
  const envelope = parseEnvelope(factsJson)
  const availableFacts = envelope.facts.map(({ id, meaning, replacement }) => ({
    marker: `{{${id}}}`,
    priority: meaning,
    exactSourceWording: replacement,
  }))

  const response = await bedrock.send(new ConverseCommand({
    modelId: process.env.MODEL_ID,
    system: [{
      text: [
        'You write a calm, concise overview of caregiver-recorded observations.',
        'The deterministic Grove report is the only source of facts.',
        'Paraphrase the supplied source wording into shorter, natural caregiver language.',
        'Do not copy a source sentence verbatim. Change and tighten its non-locked wording while preserving its meaning.',
        'Use concise, natural sentences that explain what the numbers suggest. Never use an em dash.',
        'When source wording contains a parenthetical recent rate such as "(82%, 24 points up from baseline)", copy that entire parenthetical exactly.',
        'Every number, percent, date, and quoted label in a selected source must appear exactly once and unchanged in its paraphrase. Never add a new one.',
        'Never add a diagnosis, cause, treatment recommendation, urgency judgment, or level-of-care conclusion.',
        'Do not mention AI. Do not add a heading.',
        'Return one single-line bullet for every supplied fact, in the supplied order, using the format "- {{marker}} concise paraphrase". Do not skip or repeat a marker.',
        'Keep each line as short as the required evidence permits.',
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
  return validateNarrativeTemplate(repairNarrativeTemplate(text, envelope.facts), envelope.facts)
}
