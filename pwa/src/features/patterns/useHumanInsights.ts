import { useEffect, useMemo, useRef, useState } from 'react'

import type { GeneratedInsight } from './analytics'
import { readInsightCache, signInsights, writeInsightCache } from './insightCache'
import { insightProvider, localInsightProvider } from './insightProvider'

/**
 * Return the insights to display, humanized through the configured provider and
 * cached by a data signature.
 *
 *  - With the default (local) provider there's no work to do and no I/O — the
 *    deterministic insights are returned directly.
 *  - With a language-model provider, results are cached per signature so the
 *    model is only called when the data actually changes; every other page load
 *    reads the cache. The original insights show immediately as a fallback while
 *    the (rare) generation resolves, and on any error we keep the originals.
 */
export function useHumanInsights(
  scopeKey: string,
  insights: GeneratedInsight[],
): { insights: GeneratedInsight[]; pending: boolean } {
  const insightsRef = useRef(insights)
  insightsRef.current = insights
  const signature = useMemo(
    () => signInsights(scopeKey, insights),
    [scopeKey, insights],
  )
  const [resolved, setResolved] = useState<GeneratedInsight[] | null>(null)

  useEffect(() => {
    // The default provider does nothing expensive — skip cache/async entirely.
    if (insightProvider === localInsightProvider) {
      setResolved(insightsRef.current)
      return
    }

    let active = true
    setResolved(null)
    const run = async () => {
      const cached = await readInsightCache(signature)
      if (cached) {
        if (active) setResolved(cached)
        return
      }
      try {
        const generated = await insightProvider(insightsRef.current)
        await writeInsightCache(signature, generated)
        if (active) setResolved(generated)
      } catch {
        if (active) setResolved(insightsRef.current)
      }
    }
    void run()
    return () => {
      active = false
    }
  }, [signature])

  return { insights: resolved ?? insights, pending: resolved === null }
}
