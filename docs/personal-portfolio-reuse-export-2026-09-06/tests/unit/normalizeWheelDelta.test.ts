import { describe, expect, it } from 'vitest'
import { normalizeWheelDeltaToPixels } from '../../src/components/navigation/SmoothScroll/normalizeWheelDelta'

describe('normalizeWheelDeltaToPixels', () => {
  it('keeps pixel deltas unchanged', () => {
    expect(normalizeWheelDeltaToPixels(42, 0, 900)).toBe(42)
    expect(normalizeWheelDeltaToPixels(-17.5, 0, 900)).toBe(-17.5)
  })

  it('converts line deltas to pixels', () => {
    expect(normalizeWheelDeltaToPixels(3, 1, 900)).toBe(48)
    expect(normalizeWheelDeltaToPixels(-2, 1, 900)).toBe(-32)
  })

  it('converts page deltas to viewport-sized pixels', () => {
    expect(normalizeWheelDeltaToPixels(1, 2, 720)).toBe(720)
    expect(normalizeWheelDeltaToPixels(-0.5, 2, 800)).toBe(-400)
  })

  it('handles invalid and unknown values safely', () => {
    expect(normalizeWheelDeltaToPixels(0, 0, 800)).toBe(0)
    expect(normalizeWheelDeltaToPixels(Number.NaN, 0, 800)).toBe(0)
    expect(normalizeWheelDeltaToPixels(Number.POSITIVE_INFINITY, 0, 800)).toBe(0)
    expect(normalizeWheelDeltaToPixels(12, 99, 800)).toBe(12)
  })
})
