import { describe, expect, it } from 'vitest'
import { emphasisDirection } from './reportEmphasis'

describe('report emphasis direction', () => {
  it('treats decreases in difficult signals as positive', () => {
    expect(emphasisDirection('down', 'concern')).toBe('positive')
    expect(emphasisDirection('decrease', 'concern')).toBe('positive')
    expect(emphasisDirection('less common', 'concern')).toBe('positive')
    expect(emphasisDirection('8 points down', 'concern')).toBe('positive')
  })

  it('treats increases in difficult signals as negative', () => {
    expect(emphasisDirection('up', 'concern')).toBe('negative')
    expect(emphasisDirection('more common', 'concern')).toBe('negative')
  })

  it('uses the inverse meaning for positive signals', () => {
    expect(emphasisDirection('up', 'positive')).toBe('positive')
    expect(emphasisDirection('down', 'positive')).toBe('negative')
  })
})
