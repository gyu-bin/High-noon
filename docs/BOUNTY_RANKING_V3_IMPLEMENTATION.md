# HIGH NOON — Bounty Ranking V3 Implementation

Date: 2026-09-18  
Branch: `feat/bounty-ranking-v3`  
Base: `feat/animated-splash-branding`

## Outcome

The asynchronous ranking feature was manually integrated without merging the
donor branch. Existing splash, menus, PvE, local duel, progress, settings,
assets, and portrait orientation remain authoritative.

## Product flow

```text
Main Menu
  -> Bounty Board
       -> Find a Duel -> Record Duel -> Ranked Result
       -> Today's Duel -> Record Duel -> Daily Result
       -> Friend Challenge -> Record Duel -> Friend Result
       -> Gunslinger Record
```

Ranked opponents use Player 01–04 production assets. NPC 01–22 remain exclusive
to PvE and cannot be selected as ranked cosmetics.

## Client implementation

- Secure installation identity generated with `expo-crypto` and stored with
  `expo-secure-store`.
- Supabase calls are isolated under `lib/supabase`.
- Ranking state is isolated from existing game progress and settings.
- Matchmaking returns an immutable match assignment id and three recorded
  opponent reaction samples.
- Ranked duel is portrait, best-of-three, first-to-two, and reuses the V3
  first-person duel presentation, Player sprites, muzzle flash, smoke,
  HIT/DOWN continuity, sound, haptics, pause behavior, and reduced motion.
- Result settlement, text share, WANTED poster image share, Daily Duel,
  unranked friend challenges, deep links, local best/streak rewards, profile,
  recent history, and Korean/English/Japanese copy are implemented.
- Missing Supabase configuration disables only online ranking; cold launch and
  offline modes remain available.

## Database implementation

Apply migrations in this order:

1. `20260830_bounty_ranking_v3_base.sql`
2. `20260831_daily_and_profile.sql`
3. `20260907_analytics_events_and_friend_challenge.sql`

The migrations provide hashed installation linkage, profiles, immutable match
assignments, server-side Elo settlement, leaderboard/history, daily duels,
friend challenges, analytics events, RLS, indexes, explicit RPC grants, and
revoked direct table access.

Ranked, daily, and friend results are recalculated from server-stored opponent
samples. Client-provided score/result fields are retained only for wire
compatibility and are not used as settlement authority.

The migrations are prepared locally and are not automatically applied to a
remote Supabase project.

## Verification

- TypeScript: passed
- ESLint with zero warnings: passed
- Locale JSON parsing: passed
- Diff whitespace validation: passed
- Expo dependency compatibility check: passed
- iOS Expo export: passed
- Android Expo export: passed
- CocoaPods install: passed
- iOS Simulator native Xcode build: passed

The web static export remains outside the delivery target. Its existing
`react-native-worklets` JS-worklet static-render failure is unrelated to the
ranking integration.
