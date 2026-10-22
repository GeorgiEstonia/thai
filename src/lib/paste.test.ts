import { describe, expect, it } from 'vitest'

import { parsePaste } from './paste'

/**
 * The format has to be forgiving: the whole value of pasting is that it works
 * on the first try, from whatever shape the words happen to arrive in.
 */
describe('parsePaste', () => {
  it('reads a pipe-separated list', () => {
    const { words } = parsePaste('หมา | mǎː | dog\nแมว | mɛːw | cat')

    expect(words).toHaveLength(2)
    expect(words[0]).toMatchObject({ thai: 'หมา', ipa: 'mǎː', english: 'dog', kind: 'word' })
  })

  it('reads a markdown table, separator row and all', () => {
    const { words } = parsePaste(
      ['| หมา | mǎː | dog |', '| --- | --- | --- |', '| แมว | mɛːw | cat |'].join('\n'),
    )

    expect(words.map((word) => word.thai)).toEqual(['หมา', 'แมว'])
  })

  it('reads tab-separated text, which is what a spreadsheet gives you', () => {
    const { words } = parsePaste('หมา\tmǎː\tdog')
    expect(words[0]).toMatchObject({ thai: 'หมา', english: 'dog' })
  })

  it('takes the reading off the Thai when there are only two columns', () => {
    const { words } = parsePaste('หมา (mǎː) | dog')
    expect(words[0]).toMatchObject({ thai: 'หมา', ipa: 'mǎː', english: 'dog' })
  })

  it('reads JSON, which survives commas inside a gloss', () => {
    const { words } = parsePaste(
      JSON.stringify([{ thai: 'ลูก', ipa: 'lûːk', english: 'child, offspring' }]),
    )

    expect(words[0].english).toBe('child, offspring')
  })

  it('reads a JSON object with a words array', () => {
    const { words } = parsePaste('{"words":[{"thai":"ไป","ipa":"paj","english":"to go"}]}')
    expect(words).toHaveLength(1)
  })

  it('calls a multi-word Thai string a phrase', () => {
    const { words } = parsePaste('ผม ไม่ เข้าใจ | pʰǒm mâj kʰâw.tɕaj | I do not understand')
    expect(words[0].kind).toBe('phrase')
  })

  it('honours an explicit kind column', () => {
    const { words } = parsePaste('สวัสดี | sa.wàt.diː | hello | phrase')
    expect(words[0].kind).toBe('phrase')
  })

  it('keeps notes when they are given', () => {
    const { words } = parsePaste('ครับ | kʰráp | polite particle | word | men only')
    expect(words[0].notes).toBe('men only')
  })

  it('reports lines it could not read rather than dropping them silently', () => {
    const { words, skipped } = parsePaste('หมา | mǎː | dog\nthis line has no separator')

    expect(words).toHaveLength(1)
    expect(skipped).toHaveLength(1)
    expect(skipped[0].text).toContain('no separator')
  })

  it('skips a row with no English, which would be an unanswerable card', () => {
    const { words, skipped } = parsePaste('หมา | mǎː |')
    expect(words).toHaveLength(0)
    expect(skipped).toHaveLength(1)
  })

  it('ignores blank lines', () => {
    const { words, skipped } = parsePaste('\n\nหมา | mǎː | dog\n\n')
    expect(words).toHaveLength(1)
    expect(skipped).toHaveLength(0)
  })

  it('returns nothing for an empty paste rather than failing', () => {
    expect(parsePaste('   ')).toEqual({ words: [], skipped: [] })
  })

  it('falls back to line parsing when JSON is malformed', () => {
    // A truncated paste should still give up what it can.
    const { words } = parsePaste('[{"thai": "หมา"\nหมา | mǎː | dog')
    expect(words.length).toBeGreaterThanOrEqual(1)
  })
})
