/** Visual health bands used by score-based artwork. */
export type ScoreVisualLevel = 'needs-attention' | 'watch' | 'stable'

/** Score boundaries for score-based artwork. */
export const SCORE_VISUAL_THRESHOLDS = {
  needsAttention: 45,
  watch: 70,
} as const

/** Hex colors used for each score visual band. */
export const SCORE_VISUAL_COLORS: Record<ScoreVisualLevel, string> = {
  'needs-attention': '#E2594B',
  watch: '#EFAE45',
  stable: '#8BB368',
}

/** Asset color suffixes used for score-based artwork. */
export const SCORE_VISUAL_ASSET_COLORS: Record<ScoreVisualLevel, string> = {
  'needs-attention': 'coral',
  watch: 'gold',
  stable: 'green',
}

export const scoreVisualLevel = (score: number): ScoreVisualLevel => {
  if (score < SCORE_VISUAL_THRESHOLDS.needsAttention) return 'needs-attention'
  if (score < SCORE_VISUAL_THRESHOLDS.watch) return 'watch'
  return 'stable'
}

export const scoreVisualColor = (score: number): string =>
  SCORE_VISUAL_COLORS[scoreVisualLevel(score)]

export const scoreVisualAssetColor = (score: number): string =>
  SCORE_VISUAL_ASSET_COLORS[scoreVisualLevel(score)]

export const needsAttentionScore = (score: number): boolean =>
  scoreVisualLevel(score) === 'needs-attention'
