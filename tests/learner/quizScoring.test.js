import { describe, it, expect } from 'vitest'
import { computeQuizScore, isQuizPassing } from '../../src/utils.js'

describe('computeQuizScore', () => {
  it('returns 100 for a perfect score', () => expect(computeQuizScore(5, 5)).toBe(100))
  it('returns 0 for zero correct answers', () => expect(computeQuizScore(0, 5)).toBe(0))
  it('returns 80 for 4 out of 5 correct', () => expect(computeQuizScore(4, 5)).toBe(80))
  it('returns 60 for 3 out of 5 correct', () => expect(computeQuizScore(3, 5)).toBe(60))

  it('rounds to the nearest integer', () => {
    expect(computeQuizScore(1, 3)).toBe(33)  // 33.33…
    expect(computeQuizScore(2, 3)).toBe(67)  // 66.66…
  })

  it('returns 0 safely when total is 0 (no questions)', () => {
    expect(computeQuizScore(0, 0)).toBe(0)
  })
})

describe('isQuizPassing — default threshold of 80', () => {
  it('passes at exactly 80%', () => expect(isQuizPassing(80)).toBe(true))
  it('passes above 80%', () => expect(isQuizPassing(100)).toBe(true))
  it('fails at 79%', () => expect(isQuizPassing(79)).toBe(false))
  it('fails at 0%', () => expect(isQuizPassing(0)).toBe(false))
})

describe('isQuizPassing — custom threshold', () => {
  it('passes at the custom threshold', () => expect(isQuizPassing(70, 70)).toBe(true))
  it('fails just below the custom threshold', () => expect(isQuizPassing(69, 70)).toBe(false))
  it('passes with a 60% threshold', () => expect(isQuizPassing(60, 60)).toBe(true))
})

describe('isQuizPassing — documents known source bug', () => {
  /**
   * showResult() in index.html hardcodes "pct >= 80" regardless of the
   * course's configurable .pass property. A course with pass:70 should allow
   * 70% to pass — but the live app rejects it.
   *
   * This test documents the CORRECT behaviour (parameterised threshold).
   * The bug is that the HTML file does not call isQuizPassing(pct, course.pass).
   */
  it('70% passes a course whose threshold is 70', () => {
    expect(isQuizPassing(70, 70)).toBe(true)
  })
})
