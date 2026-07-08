import { Preferences } from '@capacitor/preferences'

import type { GeneratedInsight } from './analytics'

/**
 * A persistent cache for humanized insights, keyed by a *signature* of the data
 * they were built from. The signature only changes when the insights change
 * (which only happens when the underlying check-in data changes), so an
 * expensive step — e.g. asking a language model to rephrase them — runs at most
 * once per data update, never on every page load.
 */

/** Minimal key/value store so the cache can be unit-tested without Capacitor. */
export interface KVStore {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
}

const preferencesStore: KVStore = {
  async get(key) {
    return (await Preferences.get({ key })).value
  },
  async set(key, value) {
    await Preferences.set({ key, value })
  },
}

const CACHE_PREFIX = 'patterns:insights:'

/** Stable djb2 hash → short base-36 string. */
function hash(input: string): string {
  let h = 5381
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}

/**
 * A signature that changes only when the insights' content changes, scoped by
 * who they're about (so household and per-person caches don't collide).
 */
export function signInsights(scopeKey: string, insights: GeneratedInsight[]): string {
  const basis = insights.map((i) => `${i.id}|${i.title}|${i.description}`).join('~')
  return `${scopeKey}:${hash(basis)}`
}

/** Read cached insights for a signature, or null on miss / parse failure. */
export async function readInsightCache(
  signature: string,
  store: KVStore = preferencesStore,
): Promise<GeneratedInsight[] | null> {
  const raw = await store.get(CACHE_PREFIX + signature)
  if (!raw) return null
  try {
    return JSON.parse(raw) as GeneratedInsight[]
  } catch {
    return null
  }
}

/** Persist insights for a signature. */
export async function writeInsightCache(
  signature: string,
  insights: GeneratedInsight[],
  store: KVStore = preferencesStore,
): Promise<void> {
  await store.set(CACHE_PREFIX + signature, JSON.stringify(insights))
}
