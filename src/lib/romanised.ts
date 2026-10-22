/**
 * Checking that Thai script never stands alone in something you have to read.
 *
 * The prompt asks for a reading after every Thai word and the model obliges —
 * but it reads "in brackets" as licence to put the English there instead, so
 * notes came back saying "after เที่ยง (noon)". That satisfies the letter of
 * the instruction and fails its entire purpose: the script is the thing being
 * learned, so a word written only in it is a word the reader cannot say.
 *
 * Asking more nicely does not fix this. Checking does.
 */

const THAI = /[฀-๿]/
const THAI_RUN = /[฀-๿][฀-๿ะ-ฺ็-๎\s]*/g

/**
 * Thai runs in `text` that are not followed by a reading in slashes.
 *
 * The reading has to be marked unambiguously, because "in brackets" is not:
 * "เที่ยง (noon)" has a bracket and still leaves the word unsayable, and no
 * amount of inspecting the bracket's contents reliably separates a reading
 * from a translation — "noon" and "kin" look alike to a checker.
 *
 * So readings are written the way the rest of the app already writes them,
 * between slashes: เที่ยง /thîaŋ/. A gloss can follow in brackets as well,
 * and often should; it just cannot stand in for the reading.
 */
export function bareThaiRuns(text: string | null | undefined): string[] {
  if (!text || !THAI.test(text)) return []

  const bare: string[] = []
  for (const match of text.matchAll(THAI_RUN)) {
    const run = match[0].trim()
    if (!run) continue

    const after = text.slice((match.index ?? 0) + match[0].length)
    // A reading, immediately after the word, with something inside it.
    if (!/^\s*\/[^/]+\//.test(after)) bare.push(run)
  }
  return bare
}

/** True when every Thai word in the text carries a reading. */
export function isFullyRomanised(text: string | null | undefined): boolean {
  return bareThaiRuns(text).length === 0
}
