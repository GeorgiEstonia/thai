import { describe, expect, it } from 'vitest'

import { PRICING, costMicros, formatCost, tokensFrom } from './usage'

/**
 * Costing is the one part of the usage tab that can be quietly wrong: a bad
 * rate or a units slip still renders a plausible number.
 */
describe('costMicros', () => {
  const opus = PRICING['claude-opus-5']

  it('prices a million input tokens at the published input rate', () => {
    const cost = costMicros('claude-opus-5', {
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    })
    expect(cost).toBe(opus.input * 1_000_000)
  })

  it('prices a million output tokens at the published output rate', () => {
    const cost = costMicros('claude-opus-5', {
      inputTokens: 0,
      outputTokens: 1_000_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    })
    expect(cost).toBe(opus.output * 1_000_000)
  })

  it('adds every kind of token together', () => {
    const cost = costMicros('claude-opus-5', {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      cacheReadTokens: 1_000_000,
      cacheWriteTokens: 1_000_000,
    })
    const expected =
      (opus.input + opus.output + opus.cacheRead + opus.cacheWrite) * 1_000_000
    expect(cost).toBe(expected)
  })

  it('costs a realistic call to a believable number of cents', () => {
    // ~4k in, ~2k out is the shape of one describe batch.
    const cost = costMicros('claude-opus-5', {
      inputTokens: 4_000,
      outputTokens: 2_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    })
    // 4000 * $5/M + 2000 * $25/M = $0.02 + $0.05 = $0.07
    expect(cost).toBe(70_000)
    expect(formatCost(cost)).toBe('$0.07')
  })

  it('never reports an unknown model as free', () => {
    const tokens = {
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    }
    expect(costMicros('some-future-model', tokens)).toBe(
      costMicros('claude-opus-5', tokens),
    )
  })

  it('returns whole micro-dollars, so sums cannot drift', () => {
    const cost = costMicros('claude-opus-5', {
      inputTokens: 7,
      outputTokens: 3,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    })
    expect(Number.isInteger(cost)).toBe(true)
  })
})

describe('tokensFrom', () => {
  it('reads the counts a response reports', () => {
    expect(
      tokensFrom({
        input_tokens: 10,
        output_tokens: 20,
        cache_read_input_tokens: 30,
        cache_creation_input_tokens: 40,
      }),
    ).toEqual({
      inputTokens: 10,
      outputTokens: 20,
      cacheReadTokens: 30,
      cacheWriteTokens: 40,
    })
  })

  it('treats missing counts as zero rather than NaN', () => {
    expect(tokensFrom({ input_tokens: 5, output_tokens: null })).toEqual({
      inputTokens: 5,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    })
  })
})

describe('formatCost', () => {
  it('shows nothing spent as nothing', () => {
    expect(formatCost(0)).toBe('$0.00')
  })

  it('does not round a real cost away to zero', () => {
    // A fraction of a cent is still spend; "$0.00" would read as free.
    expect(formatCost(500)).toBe('<$0.01')
  })

  it('shows ordinary amounts as money', () => {
    expect(formatCost(1_234_567)).toBe('$1.23')
  })
})
