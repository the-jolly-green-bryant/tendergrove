import { describe, expect, it } from 'vitest'

import type { GeneratedInsight } from '../analytics'
import {
  readInsightCache,
  signInsights,
  writeInsightCache,
  type KVStore,
} from '../insightCache'

const memStore = (): { store: KVStore; map: Map<string, string> } => {
  const map = new Map<string, string>()
  const store: KVStore = {
    get: async (key) => map.get(key) ?? null,
    set: async (key, value) => {
      map.set(key, value)
    },
  }
  return { store, map }
}

const insight = (id: string, description: string): GeneratedInsight => ({
  id,
  title: 'Title',
  description,
  priority: 1,
  icon: 'leaf',
  tone: 'positive',
  confidence: 'high',
})

describe('signInsights', () => {
  it('is stable for the same content', () => {
    const a = [insight('x', 'hello')]
    expect(signInsights('household', a)).toBe(signInsights('household', a))
  })

  it('changes when insight text changes (so the cache refreshes on new data)', () => {
    const before = signInsights('household', [insight('x', 'hello')])
    const after = signInsights('household', [insight('x', 'hello, changed')])
    expect(after).not.toBe(before)
  })

  it('differs by scope so household and per-person caches never collide', () => {
    const items = [insight('x', 'hello')]
    expect(signInsights('household', items)).not.toBe(signInsights('p1', items))
  })
})

describe('insight cache roundtrip', () => {
  it('returns null on a miss and the stored value on a hit', async () => {
    const { store } = memStore()
    const items = [insight('x', 'hello')]
    const sig = signInsights('household', items)

    expect(await readInsightCache(sig, store)).toBeNull()
    await writeInsightCache(sig, items, store)
    expect(await readInsightCache(sig, store)).toEqual(items)
  })

  it('misses under a new signature once the data changes', async () => {
    const { store } = memStore()
    const oldItems = [insight('x', 'hello')]
    const oldSig = signInsights('household', oldItems)
    await writeInsightCache(oldSig, oldItems, store)

    const newSig = signInsights('household', [insight('x', 'hello again')])
    expect(await readInsightCache(newSig, store)).toBeNull()
  })
})
