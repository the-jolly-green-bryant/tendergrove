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
    expect(emphasisDirection('18% below baseline', 'positive')).toBe('negative')
    expect(emphasisDirection('12% above baseline', 'positive')).toBe('positive')
  })

  it('colors complete relative comparisons by their clinical direction', () => {
    expect(emphasisDirection('18% below baseline')).toBe('negative')
    expect(emphasisDirection('9% below recent baseline')).toBe('negative')
    expect(emphasisDirection('12% above baseline')).toBe('positive')
    expect(emphasisDirection('12% above baseline', 'concern')).toBe('negative')
    expect(emphasisDirection('12% below baseline', 'concern')).toBe('positive')
  })

  it('keeps compound changes and concern counts semantically colored', () => {
    expect(emphasisDirection('3-point decrease')).toBe('negative')
    expect(emphasisDirection('3-point decrease', 'concern')).toBe('positive')
    expect(emphasisDirection('8 of 10 recent recorded observations were in the concern range')).toBe('negative')
  })
})
