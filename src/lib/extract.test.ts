import { describe, expect, it } from 'vitest'

import type { ExtractedWord } from './db/schema'
import { dedupe, parseDataUrl, sortForReview } from './extract'

function word(
  thai: string,
  confidence: ExtractedWord['confidence'],
  kind: ExtractedWord['kind'] = 'word',
): ExtractedWord {
  return { thai, ipa: '', english: '', kind, notes: null, confidence }
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

describe('sortForReview', () => {
  it('puts the least certain first, where they get looked at', () => {
    const sorted = sortForReview([
      word('สูง', 'high'),
      word('กลาง', 'medium'),
      word('ต่ำ', 'low'),
    ])
    expect(sorted.map((w) => w.confidence)).toEqual(['low', 'medium', 'high'])
  })

  it('puts words before phrases at equal confidence', () => {
    const sorted = sortForReview([
      word('ประโยค', 'high', 'phrase'),
      word('คำ', 'high', 'word'),
    ])
    expect(sorted.map((w) => w.kind)).toEqual(['word', 'phrase'])
  })

  it('does not mutate the input', () => {
    const input = [word('a', 'high'), word('b', 'low')]
    sortForReview(input)
    expect(input.map((w) => w.confidence)).toEqual(['high', 'low'])
  })

  it('copes with an empty page', () => {
    expect(sortForReview([])).toEqual([])
  })
})

describe('dedupe', () => {
  it('collapses the same word repeated across pages, keeping the surest', () => {
    const result = dedupe([word('คน', 'low'), word('คน', 'high'), word('คน', 'medium')])
    expect(result).toHaveLength(1)
    expect(result[0].confidence).toBe('high')
  })

  it('keeps a word and a phrase that happen to share text', () => {
    expect(dedupe([word('ไป', 'high', 'word'), word('ไป', 'high', 'phrase')])).toHaveLength(2)
  })

  it('ignores surrounding whitespace when comparing', () => {
    expect(dedupe([word('คน', 'high'), word('  คน  ', 'high')])).toHaveLength(1)
  })
})
