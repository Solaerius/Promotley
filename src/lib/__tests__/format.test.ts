import { describe, it, expect } from 'vitest'
import { formatEngagementRate } from '../format'

describe('formatEngagementRate', () => {
  it('formats a typical decimal rate', () => {
    expect(formatEngagementRate(0.043)).toBe('4.3%')
  })
  it('formats zero', () => {
    expect(formatEngagementRate(0)).toBe('0.0%')
  })
  it('rounds to 1 decimal', () => {
    expect(formatEngagementRate(0.1234)).toBe('12.3%')
  })
  it('formats 100%', () => {
    expect(formatEngagementRate(1)).toBe('100.0%')
  })
  it('rounds midpoint correctly', () => {
    expect(formatEngagementRate(0.0555)).toBe('5.6%')
  })
})
