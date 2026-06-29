export type BloomMember = {
  id: string
  name: string
  score: number
  avatarUrl?: string
}

export function getBloomPetalStyle(member: BloomMember, index: number, total: number) {
  const score = Math.max(0, Math.min(100, member.score))
  const angle = (index * 360) / Math.max(total, 1)

  const color =
    score < 45 ? '#E2594B' :
    score < 70 ? '#EFAE45' :
    '#8BB368'

  return {
    angle,
    color,
    scale: 0.62 + (score / 100) * 0.38,
    opacity: 0.35 + (score / 100) * 0.45,
    isCrisis: score < 45,
    isSevere: score < 25,
  }
}