export interface ScoreableIndicator {
  id: string
  polarity: string | null
}

/**
 * Scores positive fulfillment and challenge absence as separate, equally
 * weighted channels. Indicator-list size therefore cannot make one polarity
 * dominate simply because more signals were configured for it.
 */
export const balancedIndicatorWellness = (
  indicators: ScoreableIndicator[],
  checkedIds: ReadonlySet<string>,
): number | null => {
  const desired = indicators.filter((indicator) => indicator.polarity === 'desired')
  const undesired = indicators.filter(
    (indicator) => indicator.polarity === 'undesired',
  )
  if (!desired.length && !undesired.length) return null

  const checkedDesired = desired.filter((indicator) =>
    checkedIds.has(indicator.id),
  ).length
  const checkedUndesired = undesired.filter((indicator) =>
    checkedIds.has(indicator.id),
  ).length

  // With no positive channel, an empty check-in is still unknown rather than
  // affirmative evidence of a good outcome.
  if (!desired.length && checkedUndesired === 0) return null

  const channels: number[] = []
  if (desired.length) channels.push(checkedDesired / desired.length)
  if (undesired.length)
    channels.push(1 - checkedUndesired / undesired.length)

  return Math.round(
    (channels.reduce((sum, value) => sum + value, 0) / channels.length) * 100,
  )
}
