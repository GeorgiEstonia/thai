/**
 * Names shared by the server, which reads these, and the toggles, which write
 * them. Kept apart from preferences.ts because that one imports next/headers,
 * which a client component may not pull in.
 */
export const CHARACTERS_COOKIE = 'thai_characters'
