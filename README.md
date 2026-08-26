# Thai

Solo practice to complement lessons: a character trainer for reading Thai
script, and (later) a vocabulary deck fed from lesson worksheets.

Phase 1 — the character trainer — is built. Phases 2 and 3 are planned but not
started.

## Running it locally

No Docker, no Postgres install. `npm run db:dev` starts Postgres compiled to
WASM behind a real TCP socket, so the app connects with the ordinary driver and
none of the application code knows the difference. Data persists in `.pglite/`.

```bash
cp .env.example .env.local     # then fill in the three values
npm install
npm run db:dev                 # terminal 1 — leave running
npm run db:push                # terminal 2 — first run only
npm run dev
```

`SESSION_SECRET` can be generated with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Note that `db:dev` serves one connection at a time, which is fine for the app
but means you can't attach `psql` while the dev server is running.

## Checks

```bash
npm test          # unit + integration (integration runs against in-process Postgres)
npm run lint
npm run build
```

## How the practice is designed

- **You choose what to practise, by IPA group.** Every session starts on
  `/practice`, where you pick phoneme groups (/k/, /kʰ/, /ŋ/, …) and vowel
  groups. There is no gating and no fixed curriculum — the app schedules what
  you chose rather than deciding it for you.
- **Consonants and vowels sit in one pool**, so a session can mix them freely.
- **Both directions, scheduled separately.** Thai → IPA is reading; IPA → Thai
  is production. They are different skills with different difficulty, so each
  gets its own interval, its own due date, and its own lapse count.
- **Shared sounds carry a disambiguator.** Six letters are /tʰ/, so an
  IPA → Thai prompt showing only /tʰ/ has six right answers. Those cards show
  the acrophonic name alongside — which is exactly how Thais specify which of
  the six they mean.
- **Unaspirated stops are anchored to Russian and Spanish.** Thai /k/, /t/, /p/
  are the к, т, п you already produce natively. English-language materials
  cannot use that shortcut; this one does.
- **A missed card returns later in the same session, not immediately.** An
  immediate re-show tests short-term memory rather than retention.
- **A brand-new card gets one reinforcement showing that does not advance its
  schedule.** Otherwise a first-ever card would jump to a two-day interval on
  the strength of a recall from ten seconds earlier.
- **Vocabulary uses the same engine as the letters.** Words are practice items
  in the same pool, with the same two directions (Thai → English and
  English → Thai) and the same scheduling.
- **You write your own mnemonics.** Every card has a field on its back for one,
  and what you write appears above the authored text on later reviews. A
  mnemonic someone else wrote is a description; one you wrote is a hook.
- **Photographed lesson pages are proposals, never entries.** Extraction sorts
  its output least-confident-first and nothing reaches the deck until you have
  edited and approved it.

## Layout

```
src/
  content/characters.ts  the 44 consonants — shapes, names, mnemonics
  content/phonemes.ts    IPA per letter, and the phoneme groups you select by
  content/vowels.ts      vowels with IPA, length, and where they sit
  content/items.ts       one flat pool of everything practisable
  lib/srs.ts             scheduling and session queue; pure, no DB, no React
  lib/practice.ts        selection -> deck, joined to stored progress
  lib/mutations.ts       the single write path
  lib/words.ts           vocabulary and your own mnemonics
  lib/extract.ts         reads vocabulary off a photographed page
  app/practice/          pick this session's sounds
  app/drill/             the cards
  app/progress/          every item, both directions
  app/words/             add and manage vocabulary
  app/capture/           photograph a lesson page, then approve what was found
drizzle/                 generated migrations (checked in; the tests apply them)
```

`review_log` is append-only and never read by the app. It exists so the
retention data is there to analyse later rather than lost.

## Before drilling

`src/content/characters.ts` needs review against a dictionary or your tutor.
The transcriptions, class assignments, and name meanings become pronunciation
you rehearse to automaticity — an error caught now costs a minute, the same
error caught in three months costs a habit.

## Deploying

Vercel for the app, Railway for Postgres. Set `DATABASE_URL`, `APP_PASSPHRASE`,
and `SESSION_SECRET` in the Vercel project, then run `npm run db:push` against
the Railway URL once.
