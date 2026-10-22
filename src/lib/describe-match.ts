/**
 * Matching a described item back to the word it was written for.
 *
 * The describe prompt requires every Thai word it writes to carry its
 * romanisation, and the model applied that to the echoed identifier as well —
 * returning "หมา (mǎː)" where "หมา" was sent. Matching on the raw string then
 * found nothing, so a batch would report success and save not one item.
 *
 * So the key is the written form with any trailing bracketed reading removed.
 * Brackets never appear in a real Thai headword, which is what makes this safe
 * rather than merely convenient.
 */
export function describeKey(thai: string): string {
  return thai.replace(/\s*\([^)]*\)\s*$/, '').trim()
}
