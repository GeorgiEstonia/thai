import { describe, expect, it } from 'vitest'

import { type WordRecord, cardKey } from '@/content/items'

import type { SrsState } from './srs'
import { chooseTopic, topicsFor } from './topics'

/**
 * A sitting is about one topic, because practising "left" beside "right" and
 * "turn left" is a different exercise from practising it between an aunt and a
 * plate. These cover what gets counted as waiting, and which topic the app
 * opens on when you do not choose.
 */

const NOW = new Date('2026-10-26T00:00:00.000Z')
const EARLIER = new Date('2026-10-01T00:00:00.000Z')
const LATER = new Date('2026-10-25T00:00:00.000Z')

function word(
  id: string,
  thai: string,
  pack: string | null,
  extra: Partial<WordRecord> = {},
): WordRecord {
  return {
    id,
    thai,
    ipa: 'x',
    english: 'x',
    kind: 'word',
    pack,
    notes: null,
    createdAt: EARLIER,
    ...extra,
  }
}

function due(intervalDays = 2): SrsState {
  return { intervalDays, dueAt: new Date(NOW.getTime() - 1000), reps: 3, lapses: 0 }
}

function notDue(): SrsState {
  return {
    intervalDays: 10,
    dueAt: new Date(NOW.getTime() + 86_400_000),
    reps: 3,
    lapses: 0,
  }
}

/** Both directions of a word scheduled the same way. */
function scheduled(id: string, state: SrsState): [string, SrsState][] {
  return [
    [cardKey('word', id, 'recognise'), state],
    [cardKey('word', id, 'produce'), state],
  ]
}

describe('topicsFor', () => {
  it('groups the deck by its topics', () => {
    const topics = topicsFor(
      [word('1', 'ซ้าย', 'Directions'), word('2', 'ขวา', 'Directions'), word('3', 'แม่', 'Family')],
      new Map(),
      NOW,
    )

    expect(topics.map((t) => t.label).sort()).toEqual(['Directions', 'Family'])
  })

  it('counts an unseen word as waiting, in both directions', () => {
    const [topic] = topicsFor([word('1', 'ซ้าย', 'Directions')], new Map(), NOW)
    expect(topic.wordsWaiting).toBe(2)
    expect(topic.wordsInProgress).toBe(0)
  })

  it('does not count a word that is scheduled and not yet due', () => {
    const topics = topicsFor(
      [word('1', 'ซ้าย', 'Directions')],
      new Map(scheduled('1', notDue())),
      NOW,
    )
    expect(topics).toEqual([])
  })

  it('counts a scheduled word again once it falls due', () => {
    const [topic] = topicsFor(
      [word('1', 'ซ้าย', 'Directions')],
      new Map(scheduled('1', due())),
      NOW,
    )
    expect(topic.wordsWaiting).toBe(2)
    expect(topic.wordsInProgress).toBe(2)
  })

  /**
   * A sentence you could not read is not waiting for you, it is waiting for
   * its words. Counting it would advertise a session that cannot happen.
   */
  it('ignores a sentence whose words are still unknown', () => {
    const deck = [
      word('1', 'ซ้าย', 'Directions'),
      word('2', 'ขวา', 'Directions'),
      word('3', 'เลี้ยว', 'Directions'),
      word('p', 'เลี้ยวซ้ายแล้วขวา', 'Directions', { kind: 'phrase' }),
    ]
    const [topic] = topicsFor(deck, new Map(), NOW)
    expect(topic.totalPhrases).toBe(1)
    expect(topic.phrasesWaiting).toBe(0)
  })

  it('counts that sentence once its words are known', () => {
    const deck = [
      word('1', 'ซ้าย', 'Directions'),
      word('2', 'ขวา', 'Directions'),
      word('3', 'เลี้ยว', 'Directions'),
      word('p', 'เลี้ยวซ้ายแล้วขวา', 'Directions', { kind: 'phrase' }),
    ]
    const progress = new Map([...scheduled('1', due()), ...scheduled('2', due()), ...scheduled('3', due())])
    const [topic] = topicsFor(deck, progress, NOW)
    expect(topic.phrasesWaiting).toBe(2)
  })

  it('leaves out a topic with nothing waiting', () => {
    const progress = new Map(scheduled('1', notDue()))
    const topics = topicsFor(
      [word('1', 'ซ้าย', 'Directions'), word('2', 'แม่', 'Family')],
      progress,
      NOW,
    )
    expect(topics.map((t) => t.label)).toEqual(['Family'])
  })

  it('names the unsorted pile rather than leaving it blank', () => {
    const [topic] = topicsFor([word('1', 'ซ้าย', null)], new Map(), NOW)
    expect(topic.label).toBe('Unsorted')
  })

  it('shows a few words with their readings, so a topic is recognisable', () => {
    const [topic] = topicsFor(
      [word('1', 'ซ้าย', 'Directions'), word('2', 'ขวา', 'Directions')],
      new Map(),
      NOW,
    )
    expect(topic.preview.length).toBe(2)
    expect(topic.preview[0].ipa).not.toBe('')
  })
})

describe('chooseTopic', () => {
  it('has nothing to open on when nothing is waiting', () => {
    expect(chooseTopic([])).toBeNull()
  })

  /**
   * Review debt first: the topic you have put work into and now owe reviews
   * on is the one where skipping today actually costs you something.
   */
  it('prefers a topic already begun over an untouched one', () => {
    const deck = [
      word('1', 'ซ้าย', 'Directions'),
      word('2', 'แม่', 'Family', { createdAt: LATER }),
    ]
    const topics = topicsFor(deck, new Map(scheduled('1', due())), NOW)
    expect(chooseTopic(topics)?.topic.label).toBe('Directions')
  })

  it('takes the largest backlog among the topics already begun', () => {
    const deck = [
      word('1', 'ซ้าย', 'Directions'),
      word('2', 'แม่', 'Family'),
      word('3', 'พ่อ', 'Family'),
    ]
    const progress = new Map([
      ...scheduled('1', due()),
      ...scheduled('2', due()),
      ...scheduled('3', due()),
    ])
    expect(chooseTopic(topicsFor(deck, progress, NOW))?.topic.label).toBe('Family')
  })

  it('starts the newest topic when nothing is owed anywhere', () => {
    const deck = [
      word('1', 'ซ้าย', 'Directions', { createdAt: EARLIER }),
      word('2', 'แม่', 'Family', { createdAt: LATER }),
    ]
    const choice = chooseTopic(topicsFor(deck, new Map(), NOW))
    expect(choice?.topic.label).toBe('Family')
    expect(choice?.reason).toBe('fresh')
  })

  it('is not random, so the same deck opens on the same topic twice', () => {
    const deck = [word('1', 'ซ้าย', 'Directions'), word('2', 'แม่', 'Family', { createdAt: LATER })]
    const topics = topicsFor(deck, new Map(), NOW)
    expect(chooseTopic(topics)?.topic.id).toBe(chooseTopic(topics)?.topic.id)
  })
})
