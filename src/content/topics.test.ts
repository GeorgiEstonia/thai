import { describe, expect, it } from 'vitest'

import { TOPICS, TOPIC_RENAMES, canonicalTopic, topicList } from './topics'

/**
 * The deck reached twenty-nine topics for thirteen subjects because each
 * import named its own without being shown what existed. These pin the fold
 * back onto the list — and in particular that the names actually in the deck
 * all land somewhere.
 */

/** Every topic name the live deck had when this list was drawn up. */
const IN_THE_DECK = [
  'Hotel and travel plans',
  'Family and numbers',
  'Health',
  'Directions',
  'Everyday extras',
  'Shopping',
  'Feelings',
  'Home and furniture',
  'Market',
  'General',
  'Telling time',
  'Hotel and staying',
  'Example sentences: food and ordering',
  'Family members',
  'Example sentences: daily life and plans',
  'Animals and pets',
  'Food and dishes',
  'Flavors and seasonings',
  'Hotel reservations and plans',
  'Days and dates',
  'Example sentences: family',
  'Yesterday and Tomorrow',
  'Places around town',
  'Jobs and professions',
  'Restaurant and ordering',
  'Hobbies and leisure',
  'Daily routines',
  'Hotel reservations & plans',
]

describe('the topic list', () => {
  it('is short enough to be a list you choose from', () => {
    expect(TOPICS.length).toBeLessThanOrEqual(15)
  })

  it('has no duplicates', () => {
    expect(new Set(TOPICS).size).toBe(TOPICS.length)
  })

  it('names every topic currently in the deck', () => {
    const unmapped = IN_THE_DECK.filter((pack) => !canonicalTopic(pack))
    expect(unmapped).toEqual([])
  })

  /** Twenty-nine to thirteen is the point; the folding has to actually fold. */
  it('folds the deck down to the list', () => {
    const after = new Set(IN_THE_DECK.map((pack) => canonicalTopic(pack)))
    expect(after.size).toBeLessThanOrEqual(TOPICS.length)
    expect(after.size).toBeLessThan(IN_THE_DECK.length / 2)
  })

  it('puts all four hotel topics in one place', () => {
    const hotels = IN_THE_DECK.filter((p) => p.toLowerCase().includes('hotel'))
    expect(hotels.length).toBe(4)
    expect(new Set(hotels.map(canonicalTopic))).toEqual(new Set(['Hotels and travel']))
  })

  it('puts every food topic in one place', () => {
    const food = [
      'Food and dishes',
      'Flavors and seasonings',
      'Restaurant and ordering',
      'Example sentences: food and ordering',
    ]
    expect(new Set(food.map(canonicalTopic))).toEqual(new Set(['Food and eating']))
  })

  it('every rename points at a topic that exists', () => {
    const strays = Object.entries(TOPIC_RENAMES)
      .filter(([, topic]) => !TOPICS.includes(topic))
      .map(([from]) => from)
    expect(strays).toEqual([])
  })

  it('is case- and ampersand-tolerant, since both spellings arrived', () => {
    expect(canonicalTopic('hotel reservations & plans')).toBe('Hotels and travel')
    expect(canonicalTopic('HOTEL AND STAYING')).toBe('Hotels and travel')
  })

  it('leaves a canonical name alone', () => {
    for (const topic of TOPICS) expect(canonicalTopic(topic)).toBe(topic)
  })

  /**
   * Refusing an unknown name is what stops the sprawl coming back: a model
   * returning "Hotels & travel" must not quietly become a new topic.
   */
  it('refuses a name that is not on the list', () => {
    expect(canonicalTopic('Hotels & travelling')).toBeNull()
    expect(canonicalTopic('Chapter 7')).toBeNull()
    expect(canonicalTopic(null)).toBeNull()
    expect(canonicalTopic('  ')).toBeNull()
  })

  it('offers the list in a form a prompt can use', () => {
    const list = topicList()
    for (const topic of TOPICS) expect(list).toContain(topic)
  })

  it('has no topic that is just a drawer', () => {
    const drawers = TOPICS.filter((t) => /^(general|misc|other|extras)$/i.test(t))
    expect(drawers).toEqual([])
  })
})
