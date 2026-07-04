/**
 * Member data used to position and style a bloom petal.
 */
export type BloomMember = {
  id: string
  name: string
  score: number
  avatarUrl?: string
}

/**
 * Returns visual style values for a member's bloom petal.
 */
export function getBloomPetalStyle(member: BloomMember, index: number, total: number) {
  const score = Math.max(0, Math.min(100, member.score))
  const angle = (index * 360) / Math.max(total, 1)

  let color = '#8BB368'
  if (score < 45) {
    color = '#E2594B'
  } else if (score < 70) {
    color = '#EFAE45'
  }

  return {
    angle,
    color,
    scale: 0.62 + (score / 100) * 0.38,
    opacity: 0.35 + (score / 100) * 0.45,
    isCrisis: score < 45,
    isSevere: score < 25,
  }
}
