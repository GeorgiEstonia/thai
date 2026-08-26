import { describe, expect, it } from 'vitest'

import type { ExtractedWord } from './db/schema'
import { parseDataUrl, sortByConfidence } from './extract'

function word(thai: string, confidence: ExtractedWord['confidence']): ExtractedWord {
  return { thai, ipa: '', english: '', notes: null, confidence }
}

describe('parseDataUrl', () => {
  it('splits the media type from the payload', () => {
    expect(parseDataUrl('data:image/jpeg;base64,AAAB')).toEqual({
      mediaType: 'image/jpeg',
      data: 'AAAB',
    })
  })

  it('handles a long payload containing newlines', () => {
    const data = 'AAAA\nBBBB\nCCCC'
    expect(parseDataUrl(`data:image/png;base64,${data}`).data).toBe(data)
  })

  it('rejects anything that is not a base64 data URL', () => {
    expect(() => parseDataUrl('https://example.com/page.jpg')).toThrow()
    expect(() => parseDataUrl('data:image/png,notbase64')).toThrow()
    expect(() => parseDataUrl('')).toThrow()
  })
})

describe('sortByConfidence', () => {
  it('puts the least certain words first, where they get looked at', () => {
    const sorted = sortByConfidence([
      word('สูง', 'high'),
      word('กลาง', 'medium'),
      word('ต่ำ', 'low'),
    ])
    expect(sorted.map((w) => w.confidence)).toEqual(['low', 'medium', 'high'])
  })

  it('does not mutate the input', () => {
    const input = [word('a', 'high'), word('b', 'low')]
    sortByConfidence(input)
    expect(input.map((w) => w.confidence)).toEqual(['high', 'low'])
  })

  it('copes with an empty page', () => {
    expect(sortByConfidence([])).toEqual([])
  })
})
