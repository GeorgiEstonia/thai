import type { NewWord } from './words'

/**
 * Reading vocabulary out of pasted text.
 *
 * The photo pipeline is the slow path by nature: upload, then a vision call
 * per page, then verification. When the words have already been read —
 * transcribed in a chat, copied off a worksheet, typed out by a teacher —
 * none of that work needs doing again, and making you go back through the
 * camera to get them in is the app wasting your time.
 *
 * Deliberately forgiving about format, because the whole point is that you
 * paste and it works. Anything that looks like JSON is read as JSON;
 * otherwise each line is split on the first separator it finds.
 */

/** Separators people actually produce: pipes from a table, tabs from a sheet. */
const SEPARATORS = ['|', '\t', ';']

export interface ParsedPaste {
  words: NewWord[]
  /** Lines that could not be read, with their line number, so they can be shown. */
  skipped: { line: number; text: string }[]
}

function clean(value: string | undefined): string {
  return (value ?? '').trim()
}

/** Strips a trailing bracketed reading: "หมา (mǎː)" is a word plus its sound. */
function splitReading(value: string): { thai: string; ipa: string } {
  const match = value.match(/^(.*?)\s*\(([^)]*)\)\s*$/)
  if (!match) return { thai: value.trim(), ipa: '' }
  return { thai: match[1].trim(), ipa: match[2].trim() }
}

function isPhrase(thai: string, kind: string): boolean {
  if (kind === 'phrase' || kind === 'sentence') return true
  // A space in Thai text is a clause break, so it is a phrase, not a word.
  return thai.includes(' ')
}

function fromObject(row: Record<string, unknown>): NewWord | null {
  const thai = clean(String(row.thai ?? ''))
  const english = clean(String(row.english ?? ''))
  if (!thai || !english) return null

  const kindValue = clean(String(row.kind ?? ''))
  return {
    thai,
    ipa: clean(String(row.ipa ?? '')),
    english,
    kind: isPhrase(thai, kindValue) ? 'phrase' : 'word',
    notes: clean(String(row.notes ?? '')) || null,
    source: 'manual',
  }
}

function fromLine(line: string): NewWord | null {
  const separator = SEPARATORS.find((candidate) => line.includes(candidate))
  if (!separator) return null

  // A markdown table row is bracketed by separators, so its first and last
  // cells are empty padding. A plain line is not — and there a trailing
  // separator means a real column that happens to be empty, which is a row
  // missing its English rather than a two-column row.
  const isTableRow = line.startsWith(separator)
  let cells = line.split(separator)
  if (isTableRow) {
    cells = cells.slice(1)
    if (clean(cells[cells.length - 1]) === '') cells = cells.slice(0, -1)
  }

  const [first, ...rest] = cells.map(clean)
  if (!first) return null

  // Two columns means the reading is either missing or bracketed onto the Thai.
  const { thai, ipa: bracketed } = splitReading(first)
  if (!thai) return null

  const ipa = rest.length >= 2 ? rest[0] : bracketed
  const english = rest.length >= 2 ? rest[1] : rest[0]
  if (!clean(english)) return null

  const kind = rest.length >= 3 ? rest[2] : ''
  const notes = rest.length >= 4 ? rest[3] : ''

  return {
    thai,
    ipa: clean(ipa),
    english: clean(english),
    kind: isPhrase(thai, clean(kind).toLowerCase()) ? 'phrase' : 'word',
    notes: clean(notes) || null,
    source: 'manual',
  }
}

export function parsePaste(text: string): ParsedPaste {
  const trimmed = text.trim()
  if (!trimmed) return { words: [], skipped: [] }

  // JSON first: it survives commas and quotes inside a gloss, which the line
  // format cannot, so anything machine-generated should arrive this way.
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      const rows = Array.isArray(parsed)
        ? parsed
        : ((parsed as { words?: unknown[] }).words ?? [])

      const words: NewWord[] = []
      const skipped: { line: number; text: string }[] = []

      rows.forEach((row, index) => {
        const word = row && typeof row === 'object' ? fromObject(row as Record<string, unknown>) : null
        if (word) words.push(word)
        else skipped.push({ line: index + 1, text: JSON.stringify(row).slice(0, 80) })
      })

      return { words, skipped }
    } catch {
      // Not valid JSON after all; fall through and read it as lines.
    }
  }

  const words: NewWord[] = []
  const skipped: { line: number; text: string }[] = []

  trimmed.split('\n').forEach((raw, index) => {
    const line = raw.trim()
    if (!line) return
    // A markdown table separator, or a header row someone copied along.
    if (/^[|\s:-]+$/.test(line)) return

    const word = fromLine(line)
    if (word) words.push(word)
    else skipped.push({ line: index + 1, text: line.slice(0, 80) })
  })

  return { words, skipped }
}
