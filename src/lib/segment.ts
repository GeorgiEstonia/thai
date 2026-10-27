/**
 * Splitting a Thai sentence into words, or admitting it cannot.
 *
 * Thai is written without spaces, so "where does this word end" has to be
 * worked out before anything can be looked up. The tempting version — search
 * the sentence for any vocabulary you know — is quietly wrong: เขาต้อง… is
 * "he must…", and searching it finds ขา, "leg", because เขา is not in the
 * deck. A gloss that confidently says "leg" is worse than no gloss, because
 * the reader has no way to know it is wrong.
 *
 * So this tiles the whole run or gives up on it. There is no partial answer
 * and no best guess: either every character belongs to a known word, or the
 * sentence is returned untappable and reads exactly as it did before.
 */

const THAI = /[฀-๿]/

/** What the panel needs to explain one word. */
export interface Gloss {
  ipa: string
  english: string
}

export interface Segment {
  text: string
  /** Set when this piece is a word we can explain; absent for punctuation. */
  gloss?: Gloss
}

export type Lexicon = Map<string, Gloss>

/**
 * Splits `text` into pieces, or returns null if any Thai in it is unaccounted for.
 *
 * Null is the point. Making "never guess" a property of the return type means
 * a caller cannot accidentally render a half-understood sentence as though it
 * were understood.
 */
export function segmentThai(text: string, lexicon: Lexicon): Segment[] | null {
  if (!text) return null

  const out: Segment[] = []
  let buffer = ''

  const flush = () => {
    if (buffer) {
      out.push({ text: buffer })
      buffer = ''
    }
  }

  let index = 0
  while (index < text.length) {
    if (!THAI.test(text[index])) {
      buffer += text[index]
      index++
      continue
    }

    let end = index
    while (end < text.length && THAI.test(text[end])) end++
    const run = text.slice(index, end)

    const tiled = tile(run, lexicon)
    if (!tiled) return null

    flush()
    out.push(...tiled)
    index = end
  }

  flush()
  return out
}

/**
 * The fewest known words that account for every character of `run`.
 *
 * Fewest, which for Thai means longest-match — the convention every Thai
 * segmenter uses, and the one that picks ตอนเย็น over ตอน + เย็น. Shortest
 * path over positions: each edge is a word, so the cheapest path is the
 * fewest words, and no path at all means the run cannot be accounted for.
 */
function tile(run: string, lexicon: Lexicon): Segment[] | null {
  const n = run.length
  const cost = new Array<number>(n + 1).fill(Number.POSITIVE_INFINITY)
  const from = new Array<number>(n + 1).fill(-1)
  cost[0] = 0

  // Bounded by the longest entry, so a long sentence does not try every
  // substring of itself.
  let longest = 0
  for (const key of lexicon.keys()) if (key.length > longest) longest = key.length

  for (let i = 0; i < n; i++) {
    if (cost[i] === Number.POSITIVE_INFINITY) continue
    const limit = Math.min(longest, n - i)
    for (let length = limit; length >= 1; length--) {
      if (!lexicon.has(run.slice(i, i + length))) continue
      const next = i + length
      if (cost[i] + 1 < cost[next]) {
        cost[next] = cost[i] + 1
        from[next] = i
      }
    }
  }

  if (cost[n] === Number.POSITIVE_INFINITY) return null

  const pieces: Segment[] = []
  let at = n
  while (at > 0) {
    const start = from[at]
    const word = run.slice(start, at)
    pieces.unshift({ text: word, gloss: lexicon.get(word) })
    at = start
  }
  return pieces
}

/**
 * The Thai inside a usage note, which is written as `ป่วย /pùaj/`.
 *
 * The reading is already there, so only the meaning is missing. The reading is
 * left in place rather than folded into the panel: it is part of the sentence
 * the note is making, and removing it would change what the note says.
 */
export function segmentNote(text: string, lexicon: Lexicon): Segment[] | null {
  if (!text || !THAI.test(text)) return null

  const out: Segment[] = []
  let buffer = ''
  let index = 0
  let found = false

  const flush = () => {
    if (buffer) {
      out.push({ text: buffer })
      buffer = ''
    }
  }

  while (index < text.length) {
    if (!THAI.test(text[index])) {
      buffer += text[index]
      index++
      continue
    }

    let end = index
    while (end < text.length && THAI.test(text[end])) end++
    const run = text.slice(index, end)

    // Only whole runs here, not a tiling. A note names one word at a time, and
    // a run that is not a word on its own is not something to explain.
    const gloss = lexicon.get(run)
    if (gloss) {
      flush()
      out.push({ text: run, gloss })
      found = true
    } else {
      buffer += run
    }
    index = end
  }

  flush()
  return found ? out : null
}
