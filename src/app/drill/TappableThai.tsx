'use client'

import type { Segment } from '@/lib/segment'

export interface Picked {
  /** Which block on the card the word was tapped in. */
  block: string
  /** Position included, so the same word twice in a sentence picks separately. */
  key: string
  segment: Segment
}

/**
 * Thai text whose words can be tapped.
 *
 * Renders exactly the string it was given — the segments always join back to
 * the original — with the words that can be explained wrapped in a button. A
 * sentence that could not be split exactly never reaches here, so nothing is
 * tappable unless the split accounted for every character of it.
 *
 * Only ever rendered on the revealed side of a card. The unrevealed card is
 * itself one big button, and a button inside a button is the hydration bug
 * that once took the whole page's interactivity with it.
 */
export default function TappableThai({
  block,
  segments,
  picked,
  onPick,
  className,
}: {
  block: string
  segments: Segment[]
  picked: Picked | null
  onPick: (picked: Picked | null) => void
  className?: string
}) {
  return (
    <p className={className}>
      {segments.map((segment, index) => {
        if (!segment.gloss) {
          return <span key={`${index}-${segment.text}`}>{segment.text}</span>
        }

        const key = `${index}:${segment.text}`
        const on = picked?.block === block && picked.key === key

        return (
          <button
            key={`${index}-${segment.text}`}
            type="button"
            onClick={() => onPick(on ? null : { block, key, segment })}
            aria-pressed={on}
            // Underlined rather than boxed: a sentence of boxes stops looking
            // like a sentence, and this has to stay readable first.
            className={`underline decoration-dotted underline-offset-[6px] ${
              on ? 'text-class-high decoration-class-high' : 'decoration-muted/40'
            }`}
          >
            {segment.text}
          </button>
        )
      })}
    </p>
  )
}
