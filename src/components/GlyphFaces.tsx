/**
 * The same glyph across the typefaces you'll actually meet.
 *
 * Letter identity has to generalise across faces. The looped forms are what
 * you learn from; the loopless one is what half the signage in Bangkok uses,
 * and it drops the head entirely — so a letter you only ever saw looped can be
 * genuinely unrecognisable there.
 */

const FACES = [
  { className: 'thai', label: 'looped' },
  { className: 'thai-serif', label: 'print' },
  { className: 'thai-hand', label: 'handwritten' },
  { className: 'thai-loopless', label: 'signage' },
] as const

export default function GlyphFaces({ glyph, size = 'text-4xl' }: { glyph: string; size?: string }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {FACES.map((face) => (
        <div key={face.label} className="flex flex-col items-center gap-1">
          <span className={`${face.className} ${size} leading-none`}>{glyph}</span>
          <span className="text-[10px] uppercase tracking-wide text-muted">{face.label}</span>
        </div>
      ))}
    </div>
  )
}
