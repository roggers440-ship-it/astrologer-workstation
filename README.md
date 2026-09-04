# Astrologer Diagnostic Workstation

A single-screen Next.js 14 workspace for a practising Vedic astrologer: chart on the
left, pattern indicators in the middle, twenty client topics on the right.

## What is here

| Path | What it does |
| --- | --- |
| `types/astrology.ts` | Domain types. Extends the spec's interfaces with `longitude`, `lordOfHouse` and varga fields the maths needs. |
| `lib/vedic-constants.ts` | Signs, lordships, exaltation and debilitation tables, Vedic aspects, nakshatras, house-group helpers. |
| `lib/dasha.ts` | Vimshottari mahadasha and antardasha tree, plus `findActive()` for the live progress bar. |
| `lib/astro-api.ts` | `AstroProvider` interface with two implementations: a remote ephemeris and a local mean-elements fallback. D9 and D10 derived from D1 longitudes. |
| `lib/rule-engine.ts` | ~130 lines. Rules are data; this file only evaluates them. |
| `lib/rules/index.ts` | Starter corpus of ~40 rules across all four tab groups. Edit freely. |
| `lib/topics.ts` | The twenty topics with their houses, karakas and handling notes. |
| `lib/timeline.ts` | Ten-year verification timeline from dasha changes and Saturn transits. |
| `components/NorthIndianChart.tsx` | SVG diamond chart with per-planet dignity tooltips and the mahadasha ring. |
| `components/CheatSheetTooltip.tsx` | The two-register tooltip, plus a shared glossary so terms read the same everywhere. |
| `components/panels/*` | The three panels. |
| `components/ConsultationNoteComposer.tsx` | Session write-up, with the client-confirmation field kept separate from the summary. |
| `app/api/*` | Server routes. The ephemeris key stays server-side. |
| `supabase/schema.sql` | Tables, indexes and row level security. |

## Setup

```bash
npx create-next-app@latest --typescript --tailwind --app .
npx shadcn@latest add tabs dialog card tooltip sheet badge scroll-area button
npm i zustand @supabase/supabase-js lucide-react
psql "$DATABASE_URL" -f supabase/schema.sql
```

`.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
EPHEMERIS_BASE_URL=      # optional; omit to use the local fallback
EPHEMERIS_API_KEY=
```

## Things to know before this goes in front of a client

**The local ephemeris is approximate.** It uses mean orbital elements, so positions
drift up to about a degree and there is no true retrograde detection. That is fine for
house placement and unusable for anything degree-sensitive. Charts computed this way
are flagged `isApproximate` and the UI shows a badge. Point `EPHEMERIS_BASE_URL` at a
Swiss Ephemeris service before real consultations.

**Topic 10 was missing from the spec.** The brief numbers topics 1–20 but only names
nineteen; slot 10 is never assigned. It is filled here as *Property & Vehicles* (4th
house). Rename it in `lib/topics.ts` if the practice meant something else.

**Three topics carry handling notes.** Medical (#8), longevity (#9) and mental health
(#20) are wired differently from the rest, and deliberately:

- Longevity is collapsed behind an explicit reveal, so it is never on screen if the
  client can see the laptop. Its rules are marked `confidential` and its guideline text
  is written for the practitioner rather than for reading aloud.
- Medical rules stay at the level of "worth a routine check-up" and name body regions
  rather than conditions. A chart cannot diagnose anything, and a client who hears
  otherwise may delay seeing a doctor.
- Mental health rules describe stress load and coping style. If a client describes real
  distress in session, the chart stops being the useful tool in the room.

These are not legal disclaimers bolted on; the guideline copy itself is written that way,
so anything you add to the corpus should match.

**The timeline is a question, not a claim.** Every marker is phrased to be read back and
checked. Confirmation from the client is what tells you the chart is calibrated — and the
`client_confirmed` column exists so that record survives past the session.

## Extending the rule corpus

```ts
{
  id: 'life.5lord.11',
  topicIds: [2, 5],
  category: 'Psychological',
  when: [{ lordOfHouse: 5, house: 11 }],
  title: '5th lord in the 11th',
  interpretiveGuideline: 'Creative work turns into income...',
  cheatSheetNote: 'Trine lord in the labha bhava...',
  strength: 'Moderate',
}
```

Conditions inside `when` are ANDed. Write two rules for an OR. `lordOfHouse` resolves
against the ascendant at evaluation time, so one rule covers all twelve lagnas.

## Still to build

- Pratyantardasha as a third level in the dasha tree.
- Combustion, neechabhanga and shadbala, all of which the rule engine can express but the local provider does not compute.
- Auth. Every route currently trusts the service-role client; wire Supabase Auth before deploying.
