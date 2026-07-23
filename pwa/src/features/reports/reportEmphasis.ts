export type SignalPolarity = 'concern' | 'positive'
export type EmphasisDirection = 'positive' | 'negative' | ''

export const emphasisDirection = (
  phrase: string,
  signalPolarity?: SignalPolarity,
): EmphasisDirection => {
  const increase = /(?:^|\s)(more common|up|above|improving|increase|higher)$/i.test(phrase)
  const decrease = /(?:^|\s)(less common|down|below|declining|decrease|lower)$/i.test(phrase)

  if (signalPolarity === 'concern') {
    if (decrease) return 'positive'
    if (increase) return 'negative'
  }
  if (signalPolarity === 'positive') {
    if (increase) return 'positive'
    if (decrease) return 'negative'
  }
  if (increase) return 'positive'
  if (decrease) return 'negative'
  return ''
}
