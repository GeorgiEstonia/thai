import { readFileSync } from 'node:fs'
const env = Object.fromEntries(
  [...readFileSync('.env.local', 'utf8').matchAll(/^(\w+)=(.*)$/gm)].map((m) => [m[1], m[2]]),
)
process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY

const { sortIntoPacks } = await import('./src/lib/extract.ts')
const { LESSON_SETS } = await import('./src/content/lessons.ts')

const pile = LESSON_SETS.flatMap((s) =>
  s.items.map((i) => ({ thai: i.thai, english: i.english, kind: i.kind ?? 'word' })),
)
console.log(`sorting ${pile.length} items…`)

const started = Date.now()
const sorted = await sortIntoPacks(pile)
console.log(`took ${((Date.now() - started) / 1000).toFixed(0)}s, returned ${sorted.length}\n`)

const byPack = new Map<string, string[]>()
for (const s of sorted) byPack.set(s.pack, [...(byPack.get(s.pack) ?? []), s.thai])

const given = new Set(pile.map((p) => p.thai))
const returned = new Set(sorted.map((s) => s.thai.replace(/\s*\([^)]*\)\s*$/, '').trim()))
const missing = [...given].filter((t) => !returned.has(t))

for (const [pack, items] of [...byPack].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${String(items.length).padStart(3)}  ${pack}`)
}
console.log(`\npacks: ${byPack.size}   unreturned: ${missing.length}`)
if (missing.length) console.log('missing sample:', missing.slice(0, 10).join(' '))
