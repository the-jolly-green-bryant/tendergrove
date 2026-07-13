/** Visual health bands used by score-based artwork. */
export type ScoreVisualLevel = 'crisis' | 'watch' | 'stable'

/** Score boundaries for score-based artwork. */
export const SCORE_VISUAL_THRESHOLDS = {
  crisis: 45,
  watch: 70,
} as const

/** Hex colors used for each score visual band. */
export const SCORE_VISUAL_COLORS: Record<ScoreVisualLevel, string> = {
  crisis: '#E2594B',
  watch: '#EFAE45',
  stable: '#8BB368',
}

/** Asset color suffixes used for score-based artwork. */
export const SCORE_VISUAL_ASSET_COLORS: Record<ScoreVisualLevel, string> = {
  crisis: 'coral',
  watch: 'gold',
  stable: 'green',
}

export const scoreVisualLevel = (score: number): ScoreVisualLevel => {
  if (score < SCORE_VISUAL_THRESHOLDS.crisis) return 'crisis'
  if (score < SCORE_VISUAL_THRESHOLDS.watch) return 'watch'
  return 'stable'
}

export const scoreVisualColor = (score: number): string => {
  return SCORE_VISUAL_COLORS[scoreVisualLevel(score)]
}

export const scoreVisualAssetColor = (score: number): string => {
  return SCORE_VISUAL_ASSET_COLORS[scoreVisualLevel(score)]
}

export const isCrisisScore = (score: number): boolean => {
  return scoreVisualLevel(score) === 'crisis'
}
