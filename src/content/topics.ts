/**
 * The topics a word can be filed under.
 *
 * A fixed list, because the alternative was tried and it does not work: each
 * import named its own topic without being shown the ones that already
 * existed, so the same subject arrived under a new name every time. The deck
 * ended up with "Hotel and travel plans", "Hotel and staying", "Hotel
 * reservations and plans" and "Hotel reservations & plans" — four topics, one
 * subject — alongside three for family and five for food, out of twenty-nine
 * in total.
 *
 * Twenty-nine topics is not a finer organisation than thirteen. It is the
 * same deck with the boundaries in arbitrary places, and it makes the one
 * thing topics are for — picking what to practise — harder rather than
 * easier.
 *
 * So: this list, chosen from rather than extended, and extended only when a
 * lesson genuinely is about something not here.
 */

export const TOPICS = [
  'Food and eating',
  'Shopping and money',
  'Family and people',
  'Numbers and counting',
  'Health and the body',
  'Getting around',
  'Home and living',
  'Hotels and travel',
  'Time and dates',
  'Feelings and states',
  'Free time',
  'Animals and nature',
  'Core words and particles',
] as const

export type Topic = (typeof TOPICS)[number]

/**
 * Where the names that have accumulated should land.
 *
 * Keyed in lower case, since the same topic has arrived capitalised both ways
 * and with "and" written as an ampersand.
 *
 * "Core words and particles" is deliberately not called "General" or
 * "Everyday extras". Those are names for a drawer you cannot describe the
 * contents of, and a drawer is not a topic — you would never choose to
 * practise it. Particles, pronouns and the handful of verbs that hold every
 * sentence together are a real subject, and arguably the most useful one.
 */
export const TOPIC_RENAMES: Record<string, Topic> = {
  // Food
  'food and dishes': 'Food and eating',
  'flavors and seasonings': 'Food and eating',
  'flavours and seasonings': 'Food and eating',
  'restaurant and ordering': 'Food and eating',
  'example sentences: food and ordering': 'Food and eating',
  'food and ordering': 'Food and eating',

  // Shopping
  shopping: 'Shopping and money',
  market: 'Shopping and money',
  'at the market': 'Shopping and money',

  // People
  'family members': 'Family and people',
  'example sentences: family': 'Family and people',
  family: 'Family and people',
  'jobs and professions': 'Family and people',

  // Numbers — split out of "Family and numbers", which was two topics in one
  'family and numbers': 'Family and people',
  numbers: 'Numbers and counting',
  'numbers and counting': 'Numbers and counting',
  classifiers: 'Numbers and counting',

  // Health
  health: 'Health and the body',
  'health and the body': 'Health and the body',
  'body parts': 'Health and the body',

  // Movement
  directions: 'Getting around',
  'places around town': 'Getting around',
  transport: 'Getting around',
  'getting around': 'Getting around',

  // Home
  'home and furniture': 'Home and living',
  'home and living': 'Home and living',
  household: 'Home and living',

  // Travel
  'hotel and travel plans': 'Hotels and travel',
  'hotel and staying': 'Hotels and travel',
  'hotel reservations and plans': 'Hotels and travel',
  'hotel reservations & plans': 'Hotels and travel',
  'hotels and travel': 'Hotels and travel',

  // Time
  'telling time': 'Time and dates',
  'days and dates': 'Time and dates',
  'yesterday and tomorrow': 'Time and dates',
  'time and dates': 'Time and dates',

  // Feelings
  feelings: 'Feelings and states',
  'feelings and states': 'Feelings and states',

  // Leisure
  'hobbies and leisure': 'Free time',
  'daily routines': 'Free time',
  'example sentences: daily life and plans': 'Free time',
  'daily life and plans': 'Free time',
  'free time': 'Free time',

  // Animals and the outdoors
  'animals and pets': 'Animals and nature',
  'animals and nature': 'Animals and nature',

  // The drawers
  general: 'Core words and particles',
  'everyday extras': 'Core words and particles',
  'everyday words': 'Core words and particles',
  'core words and particles': 'Core words and particles',
}

/** The canonical name for a pack, or null when it is not one we know. */
export function canonicalTopic(pack: string | null | undefined): Topic | null {
  if (!pack) return null
  const key = pack.trim().toLowerCase()
  if (!key) return null

  const renamed = TOPIC_RENAMES[key]
  if (renamed) return renamed

  // Already canonical, just differently cased.
  const exact = TOPICS.find((topic) => topic.toLowerCase() === key)
  return exact ?? null
}

/** The list as a prompt gives it, one per line. */
export function topicList(): string {
  return TOPICS.map((topic) => `- ${topic}`).join('\n')
}
