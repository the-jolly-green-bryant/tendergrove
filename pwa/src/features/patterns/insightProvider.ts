import type { GeneratedInsight } from './analytics'

/**
 * A provider turns the deterministic, structured insights into their final,
 * human-readable form. The default just returns them as-is (they're already
 * written in plain language). Swapping in a language-model provider lets a model
 * rephrase the `description` text so it reads even more like a person talking.
 *
 * ── The SUPER cheap recipe ───────────────────────────────────────────────────
 * 1. Use a small, cheap model (e.g. Claude Haiku).
 * 2. Only call it when the data changes — the `useHumanInsights` hook caches
 *    results by a data signature (see `insightCache.ts`), so a given set of
 *    insights is generated once and reused on every later page load until new
 *    check-ins change the data. In practice that's a handful of tiny calls a
 *    week, not one per page view.
 * 3. Keep the model's job small: hand it the titles/descriptions and ask only
 *    for warmer wording back (same ids, same structure) — a few hundred tokens.
 *
 * Recommended wiring (secure, no client key): an Amplify `a.generation()` route
 * backed by Bedrock Haiku, called from here via `client.queries.<name>()`. On
 * any error this provider must fall back to the input insights, and the hook
 * already does that. Example (server side, in amplify/data/resource.ts):
 *
 *   rephraseInsights: a.generation({ aiModel: a.ai.model('Claude 3.5 Haiku'),
 *     systemPrompt: 'Rewrite each caregiver insight in warm, plain, non-medical
 *     language. Keep it short. Return the same ids.' })
 *     .arguments({ insightsJson: a.string() })
 *     .returns(a.string())
 *
 * We keep the default LOCAL so the app never needs a network call or API key to
 * work, and so nothing here incurs cost until you opt in.
 */
export type InsightProvider = (
  insights: GeneratedInsight[],
) => Promise<GeneratedInsight[]>

/** Default provider: the deterministic insights are already plain-language. */
export const localInsightProvider: InsightProvider = async (insights) => insights

/**
 * The active provider. Point this at a language-model provider to have a model
 * rephrase the insight copy; caching (see `useHumanInsights`) keeps it cheap.
 */
export const insightProvider: InsightProvider = localInsightProvider
