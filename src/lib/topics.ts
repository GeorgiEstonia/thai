import { DIRECTIONS, type WordRecord, cardKey, packGroupId } from '@/content/items'

import { type SrsState, isDue } from './srs'
import { partitionPhrases } from './unlock'

/**
 * A sitting is about one topic.
 *
 * Practising ซ้าย /sáːj/ "left" next to ขวา /kʰwǎː/ "right" and เลี้ยวซ้าย
 * /líaw sáːj/ "turn left" is not the same exercise as practising it between a
 * word for an aunt and a word for a plate. The deck has topics already —
 * everything imported gets sorted into one — but practice ignored them except
 * as a filter you had to go and set yourself.
 *
 * So the unit of practice is the topic: its words first, then the sentences
 * built out of those words, in one sitting that does not wander.
 */

export interface Topic {
  /** The group id a selection uses, e.g. "pack:Directions". */
  id: string
  label: string
  /** Word cards due or never seen. */
  wordsWaiting: number
  /** Sentence cards whose words are known enough to be worth showing. */
  phrasesWaiting: number
  /** Word cards with a schedule already — how much standing is at stake here. */
  wordsInProgress: number
  totalWords: number
  totalPhrases: number
  /** A few words, with readings, so the topic is recognisable at a glance. */
  preview: { thai: string; ipa: string }[]
  /** Newest item in the topic, so the most recent lesson can be preferred. */
  newest: number
}

export interface TopicChoice {
  topic: Topic
  /** Why this one, in words the screen can show. */
  reason: 'due' | 'continue' | 'fresh'
}

/** Topics in one sitting. Enough to interleave, few enough to stay coherent. */
export const TOPICS_PER_SESSION = 3

const PREVIEW_WORDS = 4

/**
 * Every topic worth practising, with what is waiting in each.
 *
 * Sentences are counted only once their words are known enough to pass the
 * gate; a topic is not "ready" on the strength of sentences you would not be
 * able to read.
 */
export function topicsFor(
  words: WordRecord[],
  progress: Map<string, SrsState>,
  now: Date = new Date(),
): Topic[] {
  const { ready } = partitionPhrases(words, progress)
  const readyPhrases = new Set(ready.map((phrase) => phrase.id))

  const topics = new Map<string, Topic>()

  for (const word of words) {
    const id = packGroupId(word.pack)
    const topic = topics.get(id) ?? {
      id,
      label: word.pack ?? 'Unsorted',
      wordsWaiting: 0,
      phrasesWaiting: 0,
      wordsInProgress: 0,
      totalWords: 0,
      totalPhrases: 0,
      preview: [],
      newest: 0,
    }

    const isPhrase = word.kind === 'phrase'
    if (isPhrase) topic.totalPhrases++
    else topic.totalWords++

    // A sentence whose words you have not met is not waiting for you — it is
    // waiting for the words, and counting it would promise a session that
    // cannot happen.
    if (!isPhrase || readyPhrases.has(word.id)) {
      for (const direction of DIRECTIONS) {
        const state = progress.get(cardKey('word', word.id, direction))
        if (!state) {
          if (isPhrase) topic.phrasesWaiting++
          else topic.wordsWaiting++
        } else {
          if (!isPhrase) topic.wordsInProgress++
          if (isDue(state, now)) {
            if (isPhrase) topic.phrasesWaiting++
            else topic.wordsWaiting++
          }
        }
      }
    }

    if (!isPhrase && topic.preview.length < PREVIEW_WORDS) {
      topic.preview.push({ thai: word.thai, ipa: word.ipa })
    }

    const added = word.createdAt ? new Date(word.createdAt).getTime() : 0
    if (added > topic.newest) topic.newest = added

    topics.set(id, topic)
  }

  return [...topics.values()].filter(
    (topic) => topic.wordsWaiting + topic.phrasesWaiting > 0,
  )
}

/**
 * The topic to open on when you press Practice without choosing.
 *
 * Review debt first: a topic you have already put work into and now owe
 * reviews on is the one where not practising costs you something. Only when
 * nothing is owed does it start a topic you have not begun, newest first,
 * because the newest topic is the lesson you just had.
 *
 * Deliberately not random. Random is fair to the topics and no use to you.
 */
export function chooseTopic(topics: Topic[]): TopicChoice | null {
  if (topics.length === 0) return null

  const started = topics.filter((topic) => topic.wordsInProgress > 0)

  // Something already begun and now due.
  const owed = started.filter((topic) => topic.wordsWaiting + topic.phrasesWaiting > 0)
  if (owed.length > 0) {
    const best = [...owed].sort(
      (a, b) =>
        b.wordsWaiting + b.phrasesWaiting - (a.wordsWaiting + a.phrasesWaiting) ||
        b.newest - a.newest,
    )[0]
    // "Continue" when most of what is waiting has never been seen, "due" when
    // it is genuinely revision — the screen says different things about each.
    const unseen = best.wordsWaiting + best.phrasesWaiting - countDueOnly(best)
    return { topic: best, reason: unseen > countDueOnly(best) ? 'continue' : 'due' }
  }

  const fresh = [...topics].sort((a, b) => b.newest - a.newest)[0]
  return { topic: fresh, reason: 'fresh' }
}

/**
 * Rough split of waiting cards into revision versus never-seen.
 *
 * Approximate on purpose: the exact number only decides a word on a button.
 */
function countDueOnly(topic: Topic): number {
  return Math.min(topic.wordsInProgress, topic.wordsWaiting)
}

/**
 * The topics for today's practice.
 *
 * More than one, because practising a single topic to the end feels like
 * progress and is remembered worse — the answer never leaves your head
 * between cards, so nothing is actually recalled. A few topics alternating
 * forces the retrieval each time. One topic at a time is still there when you
 * want it; you just tap the topic instead.
 *
 * Which few changes with the day rather than with every page load. A set that
 * reshuffles while you are looking at it is not a plan for today, and
 * returning to the screen should not quietly change what you were about to do.
 */
export function chooseTopics(
  topics: Topic[],
  now: Date = new Date(),
  limit: number = TOPICS_PER_SESSION,
): Topic[] {
  if (topics.length === 0) return []

  const owed = topics.filter((topic) => topic.wordsInProgress > 0)
  const fresh = topics.filter((topic) => topic.wordsInProgress === 0)

  // What you already owe comes first: a topic you have put work into is where
  // skipping today actually costs you something.
  const byBacklog = [...owed].sort(
    (a, b) =>
      b.wordsWaiting + b.phrasesWaiting - (a.wordsWaiting + a.phrasesWaiting) || b.newest - a.newest,
  )

  // Newest first among the untouched, since the newest topic is the lesson
  // you have just had.
  const byAge = [...fresh].sort((a, b) => b.newest - a.newest)

  const picked = [...byBacklog, ...byAge].slice(0, limit)

  // Rotated by the day, so the same deck does not open on the same topic every
  // morning while still being stable for the whole of one day.
  const offset = dayNumber(now) % Math.max(picked.length, 1)
  return [...picked.slice(offset), ...picked.slice(0, offset)]
}

/** Days since the epoch in local time, so the set turns over at midnight. */
function dayNumber(now: Date): number {
  const local = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.floor(local.getTime() / 86_400_000)
}
