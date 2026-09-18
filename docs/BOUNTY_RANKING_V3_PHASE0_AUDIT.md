# HIGH NOON — Bounty Ranking V3 Integration

## Phase 0: Architecture Audit & Structure Migration Plan

Date: 2026-09-18  
Current source of truth: `feat/animated-splash-branding` at `770450d`  
Feature donor: `feat/async-ranking` at `e4b4672`  
Integration branch: `feat/bounty-ranking-v3` (created from the current V3 source of truth)

## 1. Executive decision

`feat/async-ranking` must not be merged or broadly cherry-picked into V3.

The donor contains useful ranking-domain work, but it also contains an older app shell, older menu and duel presentation, a conflicting orientation policy, 179 binary asset changes, cross-coupled PvE daily missions, and an incomplete database history. The safe path is:

1. Preserve the current V3 branch as the product and visual source of truth.
2. Recover and validate the missing deployed Supabase base schema before implementing ranked play.
3. Manually port only the ranking domain, service contracts, and isolated state.
4. Adapt the ghost duel to use exact recorded round evidence instead of NPC-style random simulation.
5. Rebuild all player-facing ranking screens with the current V3 components, fonts, assets, localization, and portrait-only policy.

No application code was modified during Phase 0.

## 2. Branch and diff evidence

- Merge base: `7e2e9b5af3821531ad9540ea1b2773e59b67c2d3`
- Current-only commits: 3
- Donor-only commits: 12
- Donor diff: 238 files
- Text files changed: 59
- Binary files changed: 179
- Approximate text delta: +8,220 / -91
- Deleted files: none

The largest donor area is `assets/` (179 files). Those assets are not part of the ranking-domain requirement and are rejected.

Direct merge conflicts are expected in at least:

- `app/_layout.tsx`
- `app/menu.tsx`
- `app/game/npc.tsx`
- `app/result/npc.tsx`
- `package.json`
- `package-lock.json`
- `ios/Podfile.lock`

Even files that Git could auto-merge are not automatically product-safe. `components/game/DuelArenaLayout.tsx`, locales, stores, and preload utilities require semantic review.

## 3. Current V3 architecture that must remain authoritative

### Navigation

The current app uses one Expo Router stack with these principal routes:

- `/`
- `/menu`
- `/character-select`
- `/npc-select`
- `/local-setup`
- `/game/npc`
- `/game/local`
- `/result/npc`
- `/stats`
- `/settings`

Ranking must be added to this stack. It must not create a second app shell or bottom-tab system.

### Boot flow

The current root layout owns:

- i18n initialization
- Rye and Nanum Myeongjo font loading
- native and animated splash handoff
- OTA application and toast behavior
- persisted progress/settings hydration
- progress restoration and backup
- audio, image, ads, IAP, and speech warmup
- global error boundary

Ranking initialization must not delay or block this boot path. Ranking profile loading begins only after Bounty Board entry, except for lightweight deep-link parsing.

### Orientation

The actual current policy is portrait-only in two layers:

- `app.json`: `orientation: "portrait"`
- runtime: `OrientationLock.PORTRAIT_UP` is applied from the root layout

The donor calls `unlockAsync()` globally and dynamically renders landscape duel layouts. That behavior is rejected. Ranking must stay portrait and must not alter orientation globally.

### Visual and gameplay source of truth

The current V3 implementation remains authoritative for:

- animated splash and branding
- main menu and meta screens
- Rye + Nanum Myeongjo typography
- Player 01–04 production assets
- NPC 01–22 production assets
- V3 backgrounds and duel VFX
- first-person revolver
- READY → STEADY → BANG presentation
- HIT/DOWN continuity
- local duel and NPC progression
- settings, audio, purchases, stats, backup, and localization

## 4. Donor feature inventory

The donor implements or references:

- anonymous device-key profile bootstrap
- Western alias generation and reroll
- ranked matchmaking RPC
- asynchronous ghost duel client engine
- three stored opponent reaction samples
- best-of-three / first-to-two presentation
- ranked result submission
- rating, tier, wins, and losses returned by the server
- leaderboard
- daily duel with local fallback
- friend challenge creation, lookup, submission, expiry, code and deep link
- result text sharing
- rendered WANTED-poster image sharing
- local best reaction, daily streak, and locally tracked season peaks
- NPC-based profile cosmetics
- PvE-linked daily missions
- general analytics and an admin dashboard

## 5. Material findings and blockers

### 5.1 The base ranking schema is missing from Git

The donor calls the following server objects, but their definitions are not present in any committed SQL migration:

- `public.profiles`
- `public.device_identities`
- `public.pvp_login_device` base version
- `public.pvp_matchmake`
- `public.pvp_submit_match`
- `public.pvp_leaderboard`
- `public.rating_to_rank_tier`
- the ranked match/history tables used by those RPCs
- the rating calculation and matchmaking implementation

The checked-in migrations only extend an already-existing remote database. Therefore a fresh Supabase environment cannot be reproduced from the repository.

**Phase 1 blocker:** export the deployed schema and RPC definitions, or author a complete new baseline migration and validate it against production data before client integration.

### 5.2 Rating and matchmaking cannot yet be audited

The client defines display thresholds:

- Bronze: below 1000
- Silver: 1000–1199
- Gold: 1200–1399
- Platinum: 1400–1599
- Diamond: 1600+

The server creates a new profile at rating 1000, which maps to Silver under the client thresholds. The actual server rating formula, K-factor, placement behavior, opponent range expansion, duplicate prevention, bot fallback, and rematch policy are absent from Git.

No new rating formula should be invented until the deployed RPCs are recovered. The initial tier mismatch must also be resolved explicitly.

The donor has tiers only, not divisions such as `Gold II`. V3 UI must display `Gold` until divisions become a real server-backed domain concept.

### 5.3 The current ghost is not a faithful record replay

The server/client contract exposes only `sample_ms: [number, number, number]`. In the duel screen the donor averages those samples and then calls `simulateTargetReactionMs`, adding random jitter each round. This makes the opponent an NPC-like simulation around an average, not a replay of another player's recorded rounds.

The target implementation must use the assigned round record directly:

- round 1 uses ghost round 1
- round 2 uses ghost round 2
- round 3 uses ghost round 3
- no `npcAI` jitter

The donor API also loses the distinction between early input, timeout, and a normal missing value when submitting arrays of nullable milliseconds. A stable ghost contract must preserve these states explicitly.

### 5.4 Match completion semantics need correction

The donor uses first-to-two wins, but the `PVP_MAX_ROUNDS` check counts non-draw rounds. Repeated draws can extend a nominal three-round duel beyond three presented rounds.

Before implementation, product rules must be encoded consistently on client and server. Recommended V3 rule:

- at most 3 rounds
- first to 2 wins ends immediately
- a tied score after round 3 is a draw
- early input and timeout are valid round outcomes, not fabricated reaction numbers

### 5.5 Server-authority and validation gaps

The checked-in daily and friend RPCs trust client-submitted score and result values. They validate reaction values for average calculation but do not recompute the winner from assigned ghost data. The missing ranked RPC cannot be evaluated.

Target server flow:

1. server creates a match assignment and immutable ghost snapshot
2. client plays that assignment
3. client submits per-round evidence
4. server validates early/timeout/shot states against the assignment
5. server derives round winners and final match result
6. server updates rating, wins, losses, rank, and history transactionally
7. server returns settlement data

The client must never be authoritative for rating delta, new rating, rank, or cumulative record.

### 5.6 Anonymous identity needs hardening

The donor correctly separates the public profile UUID from a locally generated installation key. However:

- `device_identities` appears to store the raw bearer key for equality lookup
- the random generator falls back to `Math.random()` if secure randomness is unavailable
- the public anon role can execute security-definer identity RPCs
- no rotation/recovery/rate-limit policy is documented

Required changes:

- require cryptographically secure generation for ranking identity
- store a server-side hash of the installation secret where feasible
- never expose the installation secret in public profile responses
- add request throttling/abuse controls at the RPC or edge layer
- document reinstall behavior and account recovery limitations

### 5.7 Alias cooldown is client-only

The donor UI throttles rerolls for 1.2 seconds, but the server RPC has no authoritative cooldown. The server should store and enforce `alias_changed_at` or an equivalent limit.

### 5.8 Admin authentication is unsafe for a shipping client

The donor suggests an `EXPO_PUBLIC_ADMIN_PIN`. Public Expo environment values are bundled into the client, so this is not a secret. The admin RPC is granted to anon/authenticated roles and uses that PIN as its only gate.

The admin screen, public PIN, and admin RPC exposure are rejected from the player build. Operational analytics must use a separately authenticated administrative surface if introduced later.

### 5.9 Cosmetic NPC replacement conflicts with V3 identity

The donor can replace a ranked player presentation with an unlocked NPC sprite. That conflicts with the product rule that ranked opponents are Player 01–04 gunslingers and also couples PvE progression to competitive identity.

NPC-model replacement is rejected. If cosmetic rewards are revisited later, they may decorate a profile frame or badge but must not replace the ranked duel character.

### 5.10 Daily mission coupling is rejected

The donor daily mission store sends users back into `/game/npc`, adds `fromDaily` behavior to PvE, and modifies NPC result handling. This violates the requirement that Daily Duel remain ranking-side and not alter PvE progression.

The isolated Daily Duel concept may be adapted in Phase 3. The PvE mission bridge is rejected.

## 6. Target domain contract

Names below are conceptual; final file naming should follow existing project conventions.

```ts
type RankingTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

type GhostRound =
  | { outcome: 'shot'; reactionMs: number }
  | { outcome: 'early'; reactionMs: null }
  | { outcome: 'timeout'; reactionMs: null };

type GhostDuelSnapshot = {
  matchId: string;
  assignmentToken: string;
  mode: 'ranked' | 'daily' | 'friend';
  opponent: {
    profileId: string;
    alias: string;
    characterId: 1 | 2 | 3 | 4;
    rating: number;
    rankingTier: RankingTier;
  };
  rounds: [GhostRound, GhostRound, GhostRound];
  createdAt: string;
  expiresAt: string;
};
```

The client result evidence should use the same round union instead of encoding early input and timeout as indistinguishable `null` values.

NPC and ghost opponent sources remain separate:

```ts
type DuelOpponentSource =
  | { kind: 'npc'; npcId: number }
  | { kind: 'ghost'; snapshot: GhostDuelSnapshot };
```

This does not require forcing both modes into one state machine. Existing NPC gameplay can remain intact while shared V3 presentation accepts a Player opponent descriptor.

## 7. Target repository structure

The repository currently uses top-level `types`, `constants`, `lib`, `hooks`, `store`, and `utils`. Introducing a new `features/` convention only for ranking would be unnecessary. Recommended structure:

```text
app/
  ranking/
    _layout.tsx
    index.tsx
    duel.tsx
    result.tsx
    challenge.tsx
    profile.tsx

components/
  ranking/
    BountyBoardHeader.tsx
    MyWantedCard.tsx
    TopGunslingers.tsx
    RankingSettlement.tsx
    FriendChallengeCard.tsx
    RankingStatusNotice.tsx

types/
  ranking.ts

constants/
  ranking.ts

lib/
  supabase/
    client.ts
    rankingRepository.ts
  ranking/
    rankingService.ts

hooks/
  useGhostDuelEngine.ts

store/
  rankingStore.ts
  rankingStatsStore.ts

utils/
  challengeLink.ts
  rankingReaction.ts
  rankingShare.ts
```

The repository layer owns RPC calls and wire-format normalization. The service layer owns product operations and domain conversion. Screens consume service functions and state; they do not issue raw Supabase queries.

## 8. Target route and navigation plan

The smallest clean route set is:

- `/ranking` — Bounty Board, My Wanted summary, Find a Duel, Today's Duel, Top Gunslingers preview
- `/ranking/duel` — portrait V3 record duel
- `/ranking/result` — V3 result plus ranking settlement
- `/ranking/challenge` — challenge lookup and acceptance
- `/ranking/profile` — full gunslinger record and recent history

A separate leaderboard route is unnecessary initially because the board can expand in-place or paginate inside `/ranking`. A separate history route is also unnecessary while recent matches fit in the profile. These routes can be added later if data volume or UX requires them.

Target flow:

```text
Main Menu
  -> Bounty Board
       -> Find a Duel -> Record Duel -> Ranked Result
       -> Today's Duel -> Record Duel -> Daily Result
       -> Friend Challenge -> Record Duel -> Friend Result
       -> My Wanted Profile
```

Friend challenge is explicitly unranked. The donor friend submission does not change rating, which matches the target behavior.

## 9. File classification matrix

| Source file or group | Category | Reason | Target | Risk |
|---|---|---|---|---|
| `lib/supabase/client.ts` | ADAPT | Useful lazy configured client; auth storage is more than current device-key RPC model needs | `lib/supabase/client.ts` | Medium |
| `lib/supabase/deviceKey.ts` | ADAPT | Correct installation/public-profile separation, but insecure random fallback and raw-key model need hardening | ranking identity service | High |
| `lib/supabase/pvpApi.ts` | ADAPT | Useful RPC inventory and normalization; raw RPC layer needs repository boundary and stronger contracts | `lib/supabase/rankingRepository.ts` | High |
| `types/pvp.ts` | ADAPT | Good inventory, but names are wire-oriented and ghost rounds lose early/timeout semantics | `types/ranking.ts` | High |
| `constants/pvpRanks.ts` | ADAPT | Best-of and tier helpers are useful; thresholds must match recovered server schema | `constants/ranking.ts` | High |
| `hooks/useGhostDuelEngine.ts` | ADAPT | Timer/pause cleanup is reusable; must consume exact round records and fixed three-round semantics | `hooks/useGhostDuelEngine.ts` | High |
| `store/pvpStore.ts` | ADAPT | Isolated transient match state is appropriate; split server profile, assignment, and settlement clearly | `store/rankingStore.ts` | Medium |
| `store/pvpStatsStore.ts` | PORT/ADAPT | Isolated persisted best/streak data is useful; server/local authority must be stated | `store/rankingStatsStore.ts` | Medium |
| `store/rankingRewardStore.ts` | ADAPT | Season peak is useful, but local calendar month is not a server season and NPC cosmetic is rejected | ranking stats/profile state | Medium |
| `store/dailyMissionStore.ts` | REJECT | Couples ranking to PvE boss progression | none | High |
| `utils/dailyMissions.ts` | REJECT | Same PvE coupling | none | High |
| `utils/dailyChallenge.ts` | ADAPT, Phase 3 | Local fallback is useful, but mode and authority need isolation | ranking daily service | Medium |
| `utils/challengeLink.ts` | PORT/ADAPT | Code normalization and deep-link parsing are useful; public web host must be deployment-configured | challenge utility | Medium |
| `utils/reactionStats.ts` | PORT | Pure result aggregation | ranking utility | Low |
| `utils/pvpShareText.ts` | ADAPT, Phase 2 | Functional sharing logic is useful; copy and localization require V3 rewrite | ranking share utility | Low |
| `utils/shareWantedPoster.ts` | ADAPT, Phase 2 | Capture/share pipeline is useful; error handling and cleanup need verification | ranking share service | Medium |
| `utils/pvpRewards.ts` | REJECT | Promotes NPC replacement as ranked identity | none | Medium |
| `utils/npcAI.ts` donor addition | REJECT | Ghost records must not be randomized through NPC AI | none | High |
| `app/ranking/duel.tsx` | ADAPT | Flow reference only; visual implementation and ghost behavior cannot be reused as-is | new V3 ranking duel screen | High |
| `app/ranking/index.tsx` | REBUILD UI | Behavior inventory is useful; old dashboard/card UI is not V3 target | new Bounty Board | Medium |
| `app/ranking/result.tsx` | REBUILD UI / ADAPT behavior | Submission/share behavior useful; presentation must extend current V3 result language | new ranking result | High |
| `app/ranking/challenge.tsx` | REBUILD UI / PORT behavior | Lookup/accept flow useful; generic form UI rejected | new telegram-style challenge | Medium |
| `app/ranking/profile.tsx` | REBUILD UI | Current screen is a cosmetic picker; target is a gunslinger record | new ranking profile | Medium |
| `app/ranking/_layout.tsx` | ADAPT | Nested error boundary/stack may be useful | minimal ranking stack | Low |
| `components/ranking/*` | REBUILD UI | Existing components use generic panels and NPC cosmetics | new V3 ranking components | Medium |
| `components/result/PvpShareCard.tsx` | REBUILD UI | Data layout useful as reference; visual style must match V3 result | ranking result component | Low |
| `components/result/WantedPosterCard.tsx` | REBUILD UI, Phase 2 | Do not reuse old poster design | new V3 share poster | Medium |
| `components/game/DuelArenaLayout.tsx` donor props | ADAPT | Opponent Player 01–04 and configurable win target are valid seams; preserve current visual code | minimal additive props | High |
| `app/_layout.tsx` donor changes | ADAPT minimally | Only challenge deep-link routing and ranking route registration are relevant | current root layout | Critical |
| `app/menu.tsx` donor changes | REBUILD seam only | Add one V3 primary mode; never replace current menu | current menu | Critical |
| `app/game/npc.tsx` donor changes | REJECT | Daily/analytics changes invade approved PvE and donor also regresses visuals/orientation | none | Critical |
| `app/result/npc.tsx` donor changes | REJECT | Daily/analytics return flow invades approved PvE result | none | Critical |
| `store/progressStore.ts` donor changes | REJECT | NPC cosmetic state is not part of ranked identity; avoid progress migration | none | Critical |
| `store/settingsStore.ts` donor changes | REJECT | `pvpCosmeticNpcId` is no longer required | none | Medium |
| `utils/progressBackup.ts` donor changes | REJECT | Only supports rejected NPC cosmetics | none | Medium |
| `utils/preloadDuelSprites.ts` | ADAPT minimally | Ranking needs Player-vs-Player prefetch, but current asset resolver remains authoritative | current preload utility | Medium |
| `constants/sprites.ts` and binary sprites | REJECT | Current V3/clarity production assets remain source of truth | none | Critical |
| `locales/{ko,en,ja}.json` donor strings | ADAPT | Behavior coverage useful; rewrite terminology as Bounty Board / Record Duel / Alias | current locale files | Medium |
| `.env.example` | ADAPT | Add only Supabase URL/anon key; reject public admin PIN | current env example | Low |
| `docs/challenge.html` | ADAPT, Phase 2 | Useful install/deep-link landing concept; must use actual production host and V3 branding | public challenge landing | Medium |
| `supabase/migrations/20260831_daily_and_profile.sql` | AUDIT/ADAPT | Depends on missing base schema; trusts client result | new ordered migrations | Critical |
| `supabase/migrations/20260907_analytics_events_and_friend_challenge.sql` | SPLIT/ADAPT | Friend challenge useful; general analytics separate; validation insufficient | new challenge migration | Critical |
| `supabase/pvp_reroll_display_name.sql` | ADAPT | Alias generator useful; depends on missing schema and lacks server cooldown | new alias migration | High |
| `supabase/pvp_set_cosmetic_npc.sql` | REJECT | NPC model replacement rejected and unlock is not server validated | none | High |
| `supabase/analytics_admin.sql` and `app/admin/*` | REJECT | Public client PIN is not an acceptable admin boundary | none | Critical |
| `package.json` | ADAPT | Add dependencies individually using SDK-compatible resolution | current package | High |
| `package-lock.json`, `ios/Podfile.lock` | REGENERATE | Never copy donor locks over newer V3 locks | generated from current branch | High |
| 179 modified assets | REJECT | Not required for ranking and conflict with approved V3 art | none | Critical |

## 10. Dependency decision

| Dependency | Decision | Phase | Notes |
|---|---|---|---|
| `@supabase/supabase-js` | Add | 1 | Required for repository RPC calls |
| `expo-crypto` | Add using Expo-compatible version | 1 | Required for a secure installation secret; do not copy donor `^57.0.2` blindly |
| `expo-file-system` | Defer | 2 | Needed only for rendered poster sharing |
| `expo-sharing` | Defer | 2 | Needed only for image share sheet |
| `react-native-view-shot` | Defer | 2 | Native dependency needed only for poster capture |
| `expo-secure-store` | Reuse existing | 1 | Already installed |
| `expo-linking` | Reuse existing | 2 | Already installed |

Current Expo and Expo Updates patch versions are newer than the donor's. Keep current versions and install only required packages with Expo's compatibility resolver. Regenerate npm and CocoaPods locks from the V3 branch.

## 11. Database migration plan

No migration should be applied during Phase 0.

Required order:

1. **Recover baseline**
   - export the deployed schema, functions, grants, indexes, constraints, and RLS policies
   - identify every object used by `pvp_login_device`, `pvp_matchmake`, `pvp_submit_match`, and `pvp_leaderboard`
2. **Canonical base migration**
   - extensions
   - public profile table
   - hashed installation-identity linkage
   - immutable match assignment and ghost-round tables
   - match result/history tables
3. **Identity and alias RPCs**
   - login/bootstrap
   - server-enforced alias cooldown
4. **Ranked RPCs**
   - matchmaking
   - assignment fetch
   - server-validated submission/finalization
   - leaderboard and nearby-current-user window
5. **Friend challenge migration, Phase 2**
   - unranked challenge, expiry, one attempt per challenger
   - server-derived result
6. **Daily duel migration, Phase 3**
   - isolated from PvE progression
   - server-derived result and streak policy
7. **Analytics, separate decision**
   - no client-shipped admin secret
   - no player-facing admin route

All security-definer functions must set an explicit safe `search_path`, validate every input, and expose only the minimum grants. Concurrency and idempotency must be tested for login, daily creation, match finalization, and duplicate challenge submission.

## 12. Product and UI structure

### Main Menu

Add one third primary V3 mode:

- `VS NPC`
- `LOCAL DUEL`
- `BOUNTY RANKING`

The CTA uses the current `WesternButton` language. A compact status may show tier and rank only after cached profile data exists. If configuration or network is unavailable, only the ranking CTA becomes unavailable; the rest of the app remains functional.

### Bounty Board

Avoid a six-card dashboard. Use one vertical story:

1. `BOUNTY BOARD` title
2. compact `MY WANTED` identity strip
3. dominant `FIND A DUEL` action
4. secondary `TODAY'S DUEL`
5. `TOP GUNSLINGERS` preview
6. bottom actions: `CHALLENGE`, `HISTORY`/profile

Visual language:

- dark leather/wood board base
- restrained parchment only for wanted identity and telegram challenge
- brass/ochre borders and sheriff-badge accents
- Rye for short Western display words
- Nanum Myeongjo Bold for Korean/Japanese display names and headings
- current body font for dense stats
- current V3 Player asset, never NPC replacement

### Ranked Duel

Reuse the current portrait V3 duel presentation:

- approved V3 background
- opponent Player 01–04 full-body asset
- READY / STEADY / BANG
- first-person revolver
- muzzle flash and smoke
- opponent FIRE/HIT/DOWN poses
- current sound, haptic, pause, accessibility and reduced-motion behavior

Add only restrained labels:

- `RECORD DUEL`
- opponent alias
- ranking tier
- two-heart first-to-two HUD

Do not claim `LIVE` or real-time PvP.

### Ranked Result

Extend the current V3 result composition with a ledger settlement layer:

- WIN / LOSS / DRAW
- score
- three round rows with shot/early/timeout and reaction values
- average and best draw
- rating before/after/delta
- current ranking tier
- promotion stamp when server confirms a tier change

The rating delta should appear as a Western ledger stamp, not a floating generic `+24` animation.

### Friend Challenge

Present a physical Western telegram/duel invitation:

- 6-character code
- challenger alias and Player character
- average/best draw
- expiry
- explicit `UNRANKED`
- `ACCEPT DUEL`

### Gunslinger Record

The profile is a dark record-book/newspaper page, not an avatar editor:

- V3 Player portrait
- alias and `NEW ALIAS`
- tier, rank, rating
- wins/losses
- best draw
- daily streak
- server-defined season best when available
- recent ranked duels

## 13. Offline and failure policy

Ranking is optional online functionality.

- Missing Supabase configuration: Bounty Ranking shows `UNAVAILABLE`; app boot continues.
- Network failure: show cached profile/leaderboard if available and a retry action.
- Server submission uncertainty: do not invent a local rating delta. Preserve the pending match identifier and offer retry/status reconciliation.
- Deep link received during an active duel: queue or ignore until safe; never pull the user out of gameplay.
- Supabase/profile hydration must not join the cold-launch blocking promise.

## 14. State and migration policy

Keep ranking state additive and isolated:

- `rankingStore`: transient profile, board, assignment, match, settlement, network state
- `rankingStatsStore`: optional cached best/streak/last sync with explicit version

Do not add ranking state to `progressStore` or reset existing stores. Existing progress, selected character, settings, purchases, match history, NPC unlocks, and backups must remain byte-for-byte compatible unless a separately reviewed migration is required.

## 15. Delivery phases

### Phase 1 — Ranked core

- recover and validate complete database schema
- add secure anonymous installation identity
- add ranking repository/service/types
- add exact recorded-round ghost engine
- add Bounty Board, matchmaking, duel, result, leaderboard, and profile record
- add menu entry and offline state

### Phase 2 — Friend and sharing

- friend challenge RPCs and server validation
- deep-link handling
- V3 telegram challenge UI
- text sharing
- V3 WANTED poster and image sharing dependencies

### Phase 3 — Daily and retention

- isolated Today's Duel
- authoritative streak/season policy
- no PvE mission integration

### Separate optional track

- privacy-reviewed analytics
- authenticated operations dashboard outside the player app

## 16. Phase 1 entry gates

Implementation must not start until these are resolved:

1. Complete deployed Supabase base schema/RPC export is available.
2. Exact server rating formula and initial rating/tier are documented.
3. Matchmaking and bot fallback rules are documented.
4. Ghost snapshot stores explicit shot/early/timeout per round.
5. Server result validation and idempotent finalization design is accepted.
6. Three-round draw semantics are accepted.
7. Production challenge web-link host is selected for Phase 2.

## 17. Acceptance criteria for later implementation

- App remains portrait-only on iOS and Android.
- Native/animated splash behavior and cold-launch time do not regress.
- VS NPC and Local Duel are unchanged.
- Existing user progress/settings/backups survive upgrade.
- Ranking disabled/offline state never blocks app boot or offline modes.
- Ranked opponent always uses Player 01–04 V3 assets.
- Ghost rounds replay assigned records without NPC randomization.
- Early input and timeout remain explicit through client, API, database, and result UI.
- Rating, tier, rank, wins and losses are server-authoritative.
- Friend challenges are unranked.
- Korean, English and Japanese UI use the current typography rules.
- No donor binary asset is introduced.
- No public admin secret or player-facing admin route ships.

## 18. Phase 0 outcome

- Safe integration branch created from V3: `feat/bounty-ranking-v3`
- Direct merge rejected
- Donor feature inventory completed
- File-level migration classification completed
- Current portrait and navigation policies documented
- Target domain, route, repository, state, migration, UX and delivery structure defined
- Critical database-history gap identified
- No app code, assets, stores, lockfiles, or migrations changed

