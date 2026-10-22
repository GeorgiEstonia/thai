import Anthropic from '@anthropic-ai/sdk'

import type { ExtractedWord } from './db/schema'
import { bareThaiRuns, isFullyRomanised } from './romanised'
import { recordUsage, tokensFrom } from './usage'

/**
 * Which model does which job, and how hard it is asked to think.
 *
 * Not one model for everything, because the jobs are not alike.
 *
 * Reading a photographed page is the one place an error is expensive and
 * invisible: a misread vowel becomes a card you rehearse daily until something
 * else contradicts it. That stays on Opus.
 *
 * Everything else is ordinary language work on text that has already been
 * read — writing an example sentence, judging whether a line is real Thai,
 * translating. Sonnet does that well at 40% of the price.
 *
 * Effort was measured too, and turned out not to matter much for these jobs:
 * the answers are schema-bound, so low and medium produced near-identical
 * output sizes ($0.00124 vs $0.00122 per item on a batch of 25). Given the
 * cost is the same, they run at medium rather than low — there is no saving to
 * buy by thinking less, so there is no reason to.
 */
/**
 * How many items to describe in one call.
 *
 * Measured, not guessed. The instructions go out again on every call, so a
 * bigger batch spreads that fixed cost over more items — but only on the input
 * side, and the answers dominate the bill, so the curve flattens fast: ten
 * items cost $0.00145 each, twenty-five $0.00122, a 16% saving for 2.5x the
 * batch.
 *
 * Twenty-five is where it stops because the remaining upside is small and the
 * downside is not: a batch is all-or-nothing within one request, so a larger
 * one loses more work when a request is killed and runs longer against the
 * platform's timeout. Sizes above 25 were not measured.
 */
export const DESCRIBE_BATCH = 25

/**
 * The generation of the describe prompt.
 *
 * 1 — the original: an example sentence and a usage note.
 * 2 — the classifier became a required field for nouns, and every Thai word
 *     written anywhere must carry its romanisation.
 * 3 — that romanisation is now written in slashes and checked. Version 2
 *     asked for it "in brackets", and got the English meaning there instead:
 *     notes reading "after เที่ยง (noon)", which obey the instruction and
 *     leave the word just as unsayable. Those are rewritten.
 */
export const DESCRIBE_VERSION = 3

type Job = 'read' | 'describe' | 'phrases' | 'verify'

const MODELS: Record<Job, { model: string; effort: 'low' | 'medium' | 'high' }> = {
  // Reading stays on Opus: a misread vowel becomes a card rehearsed daily.
  // Effort comes down from high, though — transcribing what is printed on a
  // page is recognition, not deliberation, and the thinking was costing real
  // minutes across a long import for no gain in what it read.
  read: { model: 'claude-opus-5', effort: 'medium' },
  describe: { model: 'claude-sonnet-5', effort: 'medium' },
  phrases: { model: 'claude-sonnet-5', effort: 'medium' },
  verify: { model: 'claude-sonnet-5', effort: 'medium' },
}

/**
 * Reads vocabulary off photographed textbook pages.
 *
 * The important behaviour is decomposition: a sentence on the page is kept
 * whole *and* broken into every content word inside it. A page showing
 * "คุณมีคนในครอบครัวกี่คน" should yield the sentence plus มี (to have),
 * ครอบครัว (family), คน (person/classifier) and กี่ (how many) as separate
 * cards — otherwise you can recite the sentence and still not have the words.
 */

const SYSTEM = `You extract Thai vocabulary from photographs of textbook pages.

Return every distinct vocabulary item on the page — this is the whole job.

- Include each content word from any sentence printed on the page. If a page
  shows a sentence meaning "How many people are in your family?", you must
  return the individual words for "to have", "family", "person" and "how many".
- Do NOT return whole sentences, conversations, dialogues or exercises. Only
  individual vocabulary items. Sentences are handled separately.
- Include set expressions that function as single units and would be learned
  as one item (greetings, fixed politeness formulas).

Rules:
- Transcribe ONLY Thai that is actually on the page. Never invent vocabulary.
  Breaking a printed sentence into its words is not inventing.
- Copy Thai script exactly, including tone marks and vowel signs.
- Give each word in its dictionary form, and do not repeat a word.
- Read HANDWRITING as well as print. Lesson pages are annotated by hand, and
  those notes are often the most valuable part. If handwriting is genuinely
  illegible, skip it rather than guessing — but do try.
- If the page already writes pronunciation in some notation, MATCH THAT
  NOTATION rather than imposing your own. Otherwise use IPA with c/cʰ for จ and
  ฉ/ช, ː for long vowels, and tone marks. If you cannot read a word
  confidently, return an empty ipa rather than guessing.
- english: the gloss from the page if given, otherwise the ordinary meaning.
  For grammatical items say what they do, e.g. "classifier for people".
- notes: only genuinely useful context (classifier, register, literal reading).
  Otherwise null.
- confidence: "high" for clean print, "medium" if legible but uncertain, "low"
  if you are partly guessing at the glyphs.
- Skip page furniture: headings, lesson numbers, exercise instructions, page
  numbers, English-only text.`

const PHRASE_SYSTEM = `You write a few short practice sentences for a Thai learner.

You are given the vocabulary just added to their deck. Write a SMALL number of
short, natural sentences that put those words to work — enough to show a few
different patterns, not a drill of every possible combination.

- Use only the given vocabulary plus the minimum grammatical glue a sentence
  needs (pronouns, particles, question words). Do not introduce substantial new
  vocabulary.
- Vary the pattern across the set: a statement, a question, a negation, a
  request — whatever the words naturally support.
- Keep each one short enough to say out loud comfortably.
- These must be natural Thai that a person would actually say. If the
  vocabulary cannot support a natural sentence, return fewer rather than
  forcing one.
- Give IPA in the same notation as the supplied words, and a natural English
  translation.`

const PHRASE_SCHEMA = {
  type: 'object',
  properties: {
    phrases: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          thai: { type: 'string' },
          ipa: { type: 'string' },
          english: { type: 'string' },
          notes: { type: ['string', 'null'] },
        },
        required: ['thai', 'ipa', 'english', 'notes'],
        additionalProperties: false,
      },
    },
  },
  required: ['phrases'],
  additionalProperties: false,
} as const

const DESCRIBE_SYSTEM = `You write the note a good teacher would put next to a
Thai vocabulary item.

For each item you are given, return an example sentence and a context note.

The example sentence:
- Must actually use the item, in a sentence someone would really say.
- Should be short enough to say out loud comfortably.
- Should show the item doing its job. This matters most for the items whose
  English gloss is a label rather than a meaning: for a classifier, show it
  counting something ("Can I have three plates of pad kraphao?"); for a
  particle, show what it does to the sentence; for a preposition or a verb of
  motion, show the frame it lives in.
- Give Thai, IPA, and a natural English translation. Use IPA with c/cʰ for จ
  and ฉ/ช, ː for long vowels, and tone marks — matching the notation already
  used on the item where it has one.

THE CLASSIFIER IS REQUIRED FOR EVERY NOUN. Thai cannot count or point at a
noun without one, so a noun learned without its classifier is a noun that
cannot be used in a real sentence. Return it in the "classifier" field as the
Thai followed by its romanisation in brackets — for example "ตัว (tuːa)". Use
null only when the item is genuinely not a noun, or is a noun that takes no
classifier. When a noun has one, the example sentence should preferably show
it being counted or pointed at, so the classifier is seen doing its job.

The context note is what a learner would otherwise have to ask about. Include
whatever is true and useful, and nothing that isn't:
- what the item is FOR, when the gloss doesn't say (classifiers, particles)
- register: polite, blunt, slang, written-only, who says it to whom
- the male/female speaker difference where there is one
- a literal reading when it makes the word memorable
- a near-synonym it is confused with, and the difference
- false friends for an English speaker

Rules:
- Never invent Thai. If you are not confident the sentence is natural, correct
  Thai, return an empty example rather than a wrong one.
- For an item that is already a full phrase or sentence, the example may show a
  close variation or a reply it would get, rather than repeating it.
- Keep the context note to one or two sentences. It is read on the back of a
  flashcard, not in a dictionary.
- Write the note in English.
- EVERY piece of Thai script you write anywhere must be followed immediately
  by its reading BETWEEN SLASHES: สุนัข /sù.nák/, ครับ /kʰráp/, เที่ยง /thîaŋ/.
  Slashes, not brackets. A bracket after a Thai word is read as its meaning —
  "เที่ยง (noon)" — and a meaning leaves the word just as unsayable as before.
  Put the reading in slashes first; add a meaning in brackets after it if it
  helps: เที่ยง /thîaŋ/ (noon).
  This is not decoration. The reader cannot yet read Thai script, so a word
  written in script alone tells them nothing at all. It applies to every
  mention, including the second and third time a word appears in the note.
  (The exampleThai field is the one exception: it has its own IPA field.)
- Return null for context only when there is genuinely nothing worth saying.`

const DESCRIBE_SCHEMA = {
  type: 'object',
  properties: {
    described: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          thai: { type: 'string' },
          exampleThai: { type: 'string' },
          exampleIpa: { type: 'string' },
          exampleEnglish: { type: 'string' },
          classifier: { type: ['string', 'null'] },
          context: { type: ['string', 'null'] },
        },
        required: [
          'thai',
          'exampleThai',
          'exampleIpa',
          'exampleEnglish',
          'classifier',
          'context',
        ],
        additionalProperties: false,
      },
    },
  },
  required: ['described'],
  additionalProperties: false,
} as const

export interface DescribeInput {
  thai: string
  ipa: string
  english: string
  kind: 'word' | 'phrase'
  notes?: string | null
}

export interface Described {
  thai: string
  exampleThai: string
  exampleIpa: string
  exampleEnglish: string
  /** For a noun: the classifier it takes, Thai plus romanisation. */
  classifier: string | null
  context: string | null
}

async function describeOnce(
  items: DescribeInput[],
  correcting: Described[] = [],
): Promise<Described[]> {
  if (items.length === 0) return []

  const client = new Anthropic()
  const stream = client.messages.stream({
    model: MODELS.describe.model,
    max_tokens: 16000,
    system: DESCRIBE_SYSTEM,
    output_config: {
      effort: MODELS.describe.effort,
      format: { type: 'json_schema', schema: DESCRIBE_SCHEMA },
    },
    messages: [
      {
        role: 'user',
        content: JSON.stringify(
          correcting.length > 0
            ? {
                items,
                // Quoted back so the second attempt is about these words
                // specifically, not a vaguer request to try harder.
                fixThese: correcting.flatMap((entry) => [
                  ...bareThaiRuns(entry.context),
                  ...bareThaiRuns(entry.classifier),
                ]),
                reminder:
                  'Those Thai words were written without a reading. Every Thai word needs its reading in slashes straight after it, like เที่ยง /thîaŋ/.',
              }
            : { items },
        ),
      },
    ],
  })

  const response = await stream.finalMessage()
  await recordUsage('write examples', MODELS.describe.model, tokensFrom(response.usage))
  if (response.stop_reason === 'refusal') return []

  const text = response.content.find((block) => block.type === 'text')
  if (!text || text.type !== 'text') return []

  const parsed = JSON.parse(text.text) as { described: Described[] }
  return parsed.described.filter((entry) => entry.exampleThai.trim() !== '')
}

/** Fields a reader has to read, where bare Thai script is a defect. */
function unreadable(entry: Described): boolean {
  return !isFullyRomanised(entry.context) || !isFullyRomanised(entry.classifier)
}

/**
 * Writes an example sentence and a usage note for each item.
 *
 * A gloss tells you what a word means. It does not tell you how to say
 * anything with it — and the gap is widest exactly where Thai is hardest for
 * an English speaker: classifiers, particles, politeness.
 *
 * The output is checked, not trusted. Asked for a reading "in brackets" the
 * model obligingly wrote the English there instead — "after เที่ยง (noon)" —
 * which obeys the instruction and defeats its purpose. Anything still carrying
 * bare Thai is asked for again, once, with the specific words quoted back; if
 * it comes back bare a second time the note is dropped rather than shipped,
 * because a note that cannot be read is worse than no note at all.
 */
export async function describeWords(items: DescribeInput[]): Promise<Described[]> {
  if (items.length === 0) return []

  const first = await describeOnce(items)
  const bad = first.filter(unreadable)
  if (bad.length === 0) return first

  const byThai = new Map(first.map((entry) => [entry.thai.trim(), entry]))
  const retry = items.filter((item) =>
    bad.some((entry) => entry.thai.trim() === item.thai.trim()),
  )

  try {
    const second = await describeOnce(retry, bad)
    for (const entry of second) {
      if (!unreadable(entry)) byThai.set(entry.thai.trim(), entry)
    }
  } catch {
    // Fall through: the note is dropped below rather than shipped unreadable.
  }

  return [...byThai.values()].map((entry) =>
    unreadable(entry)
      ? {
          ...entry,
          context: isFullyRomanised(entry.context) ? entry.context : null,
          classifier: isFullyRomanised(entry.classifier) ? entry.classifier : null,
        }
      : entry,
  )
}

const TOPIC_SYSTEM = `You name the topic of a page of Thai lesson vocabulary.

Given the words that were read off one lesson, return a short label for what
the lesson is about — the kind of thing that would be the chapter title.

- Two or three words, in English, capitalised like a title: "Family", "At the
  market", "Numbers and counting", "Getting around".
- Name what the words have in common, not the grammar they happen to use.
- If the words genuinely have nothing in common — a mixed review page, a
  grab-bag — return null rather than inventing a theme. A wrong label is worse
  than none, because it is what the deck will be organised by.`

const TOPIC_SCHEMA = {
  type: 'object',
  properties: { topic: { type: ['string', 'null'] } },
  required: ['topic'],
  additionalProperties: false,
} as const

/**
 * Names the topic of a batch of imported vocabulary.
 *
 * Imports were landing ungrouped unless a pack was typed in by hand, which in
 * practice meant nearly all of them: of 352 items, 270 had no pack at all. A
 * deck you cannot pick a topic out of is a deck you can only practise whole.
 * The words have just been read, so the thing that read them can say what they
 * were about for a fraction of a cent.
 */
export async function classifyTopic(words: { thai: string; english: string }[]): Promise<string | null> {
  if (words.length === 0) return null

  const client = new Anthropic()
  const stream = client.messages.stream({
    model: MODELS.describe.model,
    max_tokens: 2000,
    system: TOPIC_SYSTEM,
    output_config: {
      effort: MODELS.describe.effort,
      format: { type: 'json_schema', schema: TOPIC_SCHEMA },
    },
    messages: [
      {
        role: 'user',
        content: JSON.stringify({
          words: words.slice(0, 60).map((word) => word.english),
        }),
      },
    ],
  })

  const response = await stream.finalMessage()
  await recordUsage('name the topic', MODELS.describe.model, tokensFrom(response.usage))
  if (response.stop_reason === 'refusal') return null

  const text = response.content.find((block) => block.type === 'text')
  if (!text || text.type !== 'text') return null

  const parsed = JSON.parse(text.text) as { topic: string | null }
  const topic = parsed.topic?.trim()
  return topic ? topic.slice(0, 60) : null
}

const TOPIC_LIST_SYSTEM = `You choose the topics for a pile of Thai vocabulary.

You are given the English meanings of words and phrases that were imported
without being grouped. Return a list of topic names that between them cover
the pile.

- Two or three words each, capitalised like a title: "Food and eating",
  "Family", "Numbers", "Getting around", "Everyday verbs".
- Aim for topics that would hold roughly ten to forty of these items. Ten to
  fifteen topics for a few hundred items is about right.
- Name what the words are ABOUT. "Verbs" is only a topic when the verbs have
  nothing else in common.
- Include "General" last, for the ones that fit nowhere.
- Return the names only. Nothing is being assigned yet.`

const TOPIC_LIST_SCHEMA = {
  type: 'object',
  properties: { packs: { type: 'array', items: { type: 'string' } } },
  required: ['packs'],
  additionalProperties: false,
} as const

const SORT_SYSTEM = `You file Thai vocabulary under topics that already exist.

You are given a list of topic names and a list of items. Put every item under
one of those topics.

- Use ONLY the topic names you were given, spelled exactly as given. Do not
  invent a new one; anything that fits nowhere goes under "General".
- Sort by what the word is about, not by its part of speech.
- Keep a phrase with the topic of the words inside it.
- Return every item you were given, and return its Thai EXACTLY as given —
  unchanged, with nothing added. It is what the result is matched against, so
  an altered one is an item that silently keeps no topic at all.`

const SORT_SCHEMA = {
  type: 'object',
  properties: {
    sorted: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          thai: { type: 'string' },
          pack: { type: 'string' },
        },
        required: ['thai', 'pack'],
        additionalProperties: false,
      },
    },
  },
  required: ['sorted'],
  additionalProperties: false,
} as const

/** Items assigned per call. Small enough to be quick, large enough that the
 *  model can still see the shape of what it is filing. */
const SORT_BATCH = 60

export interface SortableWord {
  thai: string
  english: string
  kind: string
}

async function chooseTopics(words: SortableWord[]): Promise<string[]> {
  const client = new Anthropic()
  const stream = client.messages.stream({
    model: MODELS.describe.model,
    max_tokens: 4000,
    system: TOPIC_LIST_SYSTEM,
    output_config: {
      effort: MODELS.describe.effort,
      format: { type: 'json_schema', schema: TOPIC_LIST_SCHEMA },
    },
    messages: [
      { role: 'user', content: JSON.stringify({ meanings: words.map((w) => w.english) }) },
    ],
  })

  const response = await stream.finalMessage()
  await recordUsage('choose topics', MODELS.describe.model, tokensFrom(response.usage))
  if (response.stop_reason === 'refusal') return []

  const text = response.content.find((block) => block.type === 'text')
  if (!text || text.type !== 'text') return []

  const parsed = JSON.parse(text.text) as { packs: string[] }
  const packs = parsed.packs.map((pack) => pack.trim()).filter(Boolean)
  return packs.includes('General') ? packs : [...packs, 'General']
}

async function fileBatch(
  words: SortableWord[],
  packs: string[],
): Promise<{ thai: string; pack: string }[]> {
  const client = new Anthropic()
  const stream = client.messages.stream({
    model: MODELS.describe.model,
    max_tokens: 16000,
    system: SORT_SYSTEM,
    output_config: {
      effort: MODELS.describe.effort,
      format: { type: 'json_schema', schema: SORT_SCHEMA },
    },
    messages: [{ role: 'user', content: JSON.stringify({ packs, items: words }) }],
  })

  const response = await stream.finalMessage()
  await recordUsage('sort into topics', MODELS.describe.model, tokensFrom(response.usage))
  if (response.stop_reason === 'refusal') return []

  const text = response.content.find((block) => block.type === 'text')
  if (!text || text.type !== 'text') return []

  const parsed = JSON.parse(text.text) as { sorted: { thai: string; pack: string }[] }
  return parsed.sorted.filter((entry) => entry.thai?.trim() && entry.pack?.trim())
}

/**
 * Sorts loose vocabulary into topics, in two passes.
 *
 * The topics are chosen once, from the meanings of the whole pile, and the
 * items are then filed against that fixed list in batches that run together.
 *
 * One call over everything was the obvious shape and the wrong one: a few
 * hundred items in a single request ran for over ten minutes, far past the
 * ceiling a serverless function gets, so in production it would simply have
 * been killed. Splitting the filing is what makes it fast; fixing the topic
 * list first is what stops each batch inventing its own near-duplicate labels.
 */
export async function sortIntoPacks(
  words: SortableWord[],
): Promise<{ thai: string; pack: string }[]> {
  if (words.length === 0) return []

  const packs = await chooseTopics(words)
  if (packs.length === 0) return []

  const batches: SortableWord[][] = []
  for (let start = 0; start < words.length; start += SORT_BATCH) {
    batches.push(words.slice(start, start + SORT_BATCH))
  }

  const results = await Promise.all(
    batches.map(async (batch) => {
      try {
        return await fileBatch(batch, packs)
      } catch {
        // One batch failing leaves its words unsorted, not the whole run.
        return []
      }
    }),
  )

  return results.flat()
}

const VERIFY_SYSTEM = `You are checking material before it is added to a Thai
learner's deck unseen.

Items of kind "word" were read off a photographed lesson page. Items of kind
"phrase" were composed from those words as practice sentences — judge those on
whether they are natural, correct Thai, not on whether they appeared on a page.

For each item decide whether it is safe to add:
- Is the Thai a real, well-formed Thai word or phrase? Reject OCR damage,
  broken glyph sequences, and stray characters.
- Does the gloss plausibly match the Thai?
- Is the pronunciation consistent with the Thai spelling?

Set verified true only if you would be comfortable with the learner drilling it
without ever checking it. Otherwise set verified false and put one short plain
sentence in issue saying what is wrong.

You may correct obvious small errors in ipa, english or notes while verifying;
do not change thai, and do not add or remove items. Return every item you were
given, in the same order.`

const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          thai: { type: 'string' },
          ipa: { type: 'string' },
          english: { type: 'string' },
          kind: { type: 'string', enum: ['word', 'phrase'] },
          notes: { type: ['string', 'null'] },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          verified: { type: 'boolean' },
          issue: { type: ['string', 'null'] },
        },
        required: [
          'thai', 'ipa', 'english', 'kind', 'notes', 'confidence', 'verified', 'issue',
        ],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
} as const

const SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          thai: { type: 'string' },
          ipa: { type: 'string' },
          english: { type: 'string' },
          notes: { type: ['string', 'null'] },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['thai', 'ipa', 'english', 'notes', 'confidence'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
} as const

/** Splits a data URL into the media type and raw base64 the API expects. */
export function parseDataUrl(dataUrl: string): { mediaType: string; data: string } {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl)
  if (!match) throw new Error('Expected a base64 data URL')
  return { mediaType: match[1], data: match[2] }
}

/**
 * Least-certain first — those need your eyes — and within that, words before
 * phrases, since the words are the part you actually have to learn.
 */
export function sortForReview(items: ExtractedWord[]): ExtractedWord[] {
  const byConfidence = { low: 0, medium: 1, high: 2 }
  const byKind = { word: 0, phrase: 1 }
  return [...items].sort(
    (a, b) =>
      byConfidence[a.confidence] - byConfidence[b.confidence] ||
      byKind[a.kind] - byKind[b.kind],
  )
}

/** Drops repeats of the same Thai string and kind, keeping the surest one. */
export function dedupe(items: ExtractedWord[]): ExtractedWord[] {
  const rank = { low: 0, medium: 1, high: 2 }
  const best = new Map<string, ExtractedWord>()

  for (const item of items) {
    const key = `${item.kind}:${item.thai.trim()}`
    const seen = best.get(key)
    if (!seen || rank[item.confidence] > rank[seen.confidence]) best.set(key, item)
  }

  return [...best.values()]
}

/**
 * Reads ONE page.
 *
 * Deliberately one page per call: a whole chapter in a single request runs
 * past the serverless function timeout and is killed with no error recorded,
 * which is exactly how batches were getting stuck.
 */
export async function extractWords(imageDataUrls: string[]): Promise<ExtractedWord[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set — add it to .env.local')
  }
  if (imageDataUrls.length === 0) return []

  const client = new Anthropic()

  // Streamed because the SDK refuses a non-streaming request whose max_tokens
  // could outrun the HTTP timeout, and a chapter needs a large budget.
  const stream = client.messages.stream({
    model: MODELS.read.model,
    // These models think before answering and max_tokens caps thinking plus
    // output together — a whole textbook chapter needs real headroom here.
    max_tokens: 32000,
    system: SYSTEM,
    output_config: {
      effort: MODELS.read.effort,
      format: { type: 'json_schema', schema: SCHEMA },
    },
    messages: [
      {
        role: 'user',
        content: [
          ...imageDataUrls.map((dataUrl) => {
            const { mediaType, data } = parseDataUrl(dataUrl)
            return {
              type: 'image' as const,
              source: {
                type: 'base64' as const,
                media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp',
                data,
              },
            }
          }),
          {
            type: 'text' as const,
            text: `Extract the Thai vocabulary from ${
              imageDataUrls.length === 1 ? 'this page' : `these ${imageDataUrls.length} pages`
            }. Remember to break every sentence into its individual words as well.`,
          },
        ],
      },
    ],
  })

  const response = await stream.finalMessage()
  await recordUsage('read page', MODELS.read.model, tokensFrom(response.usage))

  if (response.stop_reason === 'refusal') throw new Error('The request was declined.')

  const text = response.content.find((block) => block.type === 'text')
  if (!text || text.type !== 'text') throw new Error('No content returned')

  const parsed = JSON.parse(text.text) as { items: Omit<ExtractedWord, 'kind'>[] }
  return sortForReview(dedupe(parsed.items.map((item) => ({ ...item, kind: 'word' as const }))))
}

/**
 * How many practice sentences a batch is worth.
 *
 * A textbook chapter yields dozens of words; transcribing every sentence in it
 * buries the vocabulary under material you will never say. A handful of
 * sentences showing a few different patterns is the useful part.
 */
export function phraseCount(wordCount: number): number {
  if (wordCount < 4) return 0
  return Math.min(6, Math.max(3, Math.round(wordCount / 6)))
}

/** Writes a few short sentences that put the new words to work. */
export async function composePhrases(words: ExtractedWord[]): Promise<ExtractedWord[]> {
  const count = phraseCount(words.length)
  if (count === 0) return []

  const client = new Anthropic()
  const stream = client.messages.stream({
    model: MODELS.phrases.model,
    max_tokens: 8000,
    system: PHRASE_SYSTEM,
    output_config: {
      effort: MODELS.phrases.effort,
      format: { type: 'json_schema', schema: PHRASE_SCHEMA },
    },
    messages: [
      {
        role: 'user',
        content: JSON.stringify({
          howMany: count,
          vocabulary: words.map((word) => ({
            thai: word.thai,
            ipa: word.ipa,
            english: word.english,
          })),
        }),
      },
    ],
  })

  const response = await stream.finalMessage()
  await recordUsage('write phrases', MODELS.phrases.model, tokensFrom(response.usage))
  if (response.stop_reason === 'refusal') return []

  const text = response.content.find((block) => block.type === 'text')
  if (!text || text.type !== 'text') return []

  const parsed = JSON.parse(text.text) as {
    phrases: { thai: string; ipa: string; english: string; notes: string | null }[]
  }

  return parsed.phrases.slice(0, count).map((phrase) => ({
    ...phrase,
    kind: 'phrase' as const,
    confidence: 'high' as const,
  }))
}

/**
 * Second pass: a fresh look at the extracted list, so obviously-broken OCR
 * never reaches the deck.
 *
 * This is what makes unattended importing reasonable — you asked not to have to
 * check every page by hand, so something has to do that job. Items it is happy
 * with are filed automatically; the rest are held for you.
 */
export async function verifyItems(items: ExtractedWord[]): Promise<ExtractedWord[]> {
  if (items.length === 0) return []

  const client = new Anthropic()
  const stream = client.messages.stream({
    model: MODELS.verify.model,
    max_tokens: 32000,
    system: VERIFY_SYSTEM,
    output_config: {
      effort: MODELS.verify.effort,
      format: { type: 'json_schema', schema: VERIFY_SCHEMA },
    },
    messages: [
      {
        role: 'user',
        content: JSON.stringify({
          items: items.map(({ thai, ipa, english, kind, notes, confidence }) => ({
            thai,
            ipa,
            english,
            kind,
            notes,
            confidence,
          })),
        }),
      },
    ],
  })

  const response = await stream.finalMessage()
  await recordUsage('verify', MODELS.verify.model, tokensFrom(response.usage))
  if (response.stop_reason === 'refusal') throw new Error('The check was declined.')

  const text = response.content.find((block) => block.type === 'text')
  if (!text || text.type !== 'text') throw new Error('No content returned')

  const checked = (JSON.parse(text.text) as { items: ExtractedWord[] }).items

  // Never trust the pass to have returned everything — fall back to holding
  // anything it dropped rather than silently losing it.
  return items.map((original) => {
    const match = checked.find((item) => item.thai.trim() === original.thai.trim())
    if (!match) return { ...original, verified: false, issue: 'Not checked' }
    return { ...original, ...match, thai: original.thai }
  })
}

/** Safe to file without you looking at it. */
export function isSafeToAdd(item: ExtractedWord): boolean {
  return item.verified === true && item.confidence !== 'low'
}
