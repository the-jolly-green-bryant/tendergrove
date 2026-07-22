import { describe, expect, it } from 'vitest'
import { needsAttentionScore, scoreVisualLevel } from './scoreVisuals'

describe('score visual language', () => {
  it('uses non-diagnostic needs-attention language for a low score', () => {
    expect(scoreVisualLevel(20)).toBe('needs-attention')
    expect(needsAttentionScore(20)).toBe(true)
  })
})
