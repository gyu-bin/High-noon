# HIGH NOON — Bounty Ranking V3 Remote Reconciliation

Date: 2026-09-27
Branch: `dev-2.0` (uncommitted working tree)
Migration: `supabase/migrations/20260927_reconcile_bounty_ranking_v3.sql`
Status: **pre-deployment review complete — NOT applied to the remote project**

Operational scripts (read-only):
`supabase/ops/20260927_pre_deploy_backup.sql`, `supabase/ops/20260927_post_deploy_verify.sql`

## 1. Why

The core-contract check against project `nyevnntgcyvlileeugal` showed the remote
database is the donor-era schema (`feat/async-ranking`), not the dev-2.0 baseline:

| Area | Remote (donor-era) | dev-2.0 baseline |
|---|---|---|
| `pvp_matches` | missing | immutable assignment + settlement table |
| `profiles.ghost_samples`, `alias_changed_at` | missing | present |
| `device_identities` | `device_key` plaintext (PK) | `device_key_hash` (sha256 hex) |
| `pvp_history`, `pvp_issue_device_key` | missing | present |
| `pvp_submit_match` | same signature, trusts client result, applies rating on every call | server-scored, gated by `status = 'assigned'` |
| `pvp_submit_daily` / `pvp_submit_friend_challenge` | donor bodies (client result trusted) | server recalculation |
| Direct table grants | anon/authenticated keep Supabase defaults | revoked (RPC only) |
| Legacy RPCs | `admin_get_overview`, `analytics_record_match`, `pvp_set_cosmetic_npc` executable | not part of V3 |

Re-running `20260830_bounty_ranking_v3_base.sql` is unsafe: `CREATE TABLE IF NOT
EXISTS` would keep the old `profiles` / `device_identities`, and the new
`pvp_login_device` would then query a missing `device_key_hash` column and break
every login.

## 2. What the migration does

One transaction, additive only. A final contract assertion aborts and rolls back
the whole script if the result is not the V3 baseline.

1. **profiles** — add `ghost_samples integer[]` **NULL, no default** (length-3 check
   when present) and `alias_changed_at`. A human ghost is an actually recorded human
   duel: nothing is synthesized. Donor profiles have no recorded ranked rounds, so they
   start with `NULL`. On databases built from `20260830` the `[520,500,540]` placeholder
   is cleared where the player never completed a ranked match.
2. **device_identities** — add `device_key_hash`, backfill
   `encode(digest(device_key,'sha256'),'hex')`, move the primary key to the hash,
   keep `device_key` (nullable, partial unique index) for legacy lookups.
3. **pvp_matches** — created with the dev-2.0 definition, indexes, RLS.
4. **Identity** — `pvp_resolve_profile`: hash lookup first, plaintext fallback that
   backfills the hash, otherwise create. New installs store the hash only.
   `pvp_issue_device_key` (pgcrypto CSPRNG, SECURITY DEFINER).
5. **Ranked lifecycle** — `pvp_matchmake` returns `match_id`. Human opponents only
   when ghost-eligible (`ghost_samples` present with 3 recorded values); otherwise an
   explicit bot (`opponent_is_bot = true`, no opponent profile). `pvp_submit_match`
   locks the caller's match, scores it from the stored snapshot, and is idempotent:
   a completed match returns its stored settlement with `already_completed: true`;
   an expired or foreign match raises `match_not_found_or_expired`.
   Ghosts update only from recorded rounds; a forfeit never creates or changes one.
   `pvp_forfeit_match` (new, match id only). `pvp_history`, `pvp_leaderboard`.
6. **Daily** — server recalculation; `pvp_get_daily` creates today's row with
   `ON CONFLICT DO NOTHING` then re-reads it; completion insert is conflict-safe.
7. **Friend** — server recalculation; conflict-safe attempt insert.
8. **`pvp_capabilities()`** — reports `ranked_submit_idempotent: true` so clients can
   detect this baseline (see §6).
9. **Privileges** — revoke anon/authenticated table access on all ranking tables
   (including donor `app_settings`, `analytics_match_events`); internal helpers not
   executable by API roles; client RPCs granted explicitly.
10. **Legacy RPCs** — `admin_get_overview`, `analytics_record_match`,
    `pvp_set_cosmetic_npc` lose client EXECUTE; functions are not dropped.

Not in scope (Step 2A): one-match ghost snapshot, shot/early/timeout model,
unplayed-profile exclusion, reaction lower bound, rate limits, analytics limits.

## 3. Data preservation

| Data | Effect |
|---|---|
| profiles id / alias / rating / rank_tier / wins / losses / character | unchanged (verified byte-equal in tests) |
| device_identities rows | kept; plaintext kept; hash added |
| daily_challenges / daily_completions / friend_* / analytics rows | unchanged |
| RLS policies on `profiles` (3) | left in place; inert once table grants are revoked |

No `DROP TABLE`, `TRUNCATE`, `DELETE`, or rating reset anywhere in the file.
`rank_tier` is not recomputed; it refreshes on each player's next settlement.

## 4. Legacy client compatibility

Recommended: **A, temporary dual compatibility, with a sunset.**

- dev-2.0 / `main` clients already read `payload.match_id` and send it — they use
  the new contract as soon as the server has it.
- The server tells the two apart: if a `pvp_matches` row with that id exists it is a
  match id (and must belong to the caller). Otherwise it is treated as a donor-era
  opponent **profile** id and accepted **only when the caller has exactly one live
  assigned match against that opponent**. Two or more raise `legacy_match_ambiguous`
  and nothing is finalized; zero raise `match_not_found_or_expired`.
- The match is still server-issued and server-scored, so this does not weaken integrity.
  `pvp_forfeit_match` does not accept the legacy form.
- The store baseline (`hotfix/ota-1.4.2-iap-next`) ships no ranking and is unaffected.
- `main`-based builds without Step 1 still send float reaction ms and will keep
  failing until the Step 1 client ships. Order: server migration first (safe for all
  clients), then the Step 1 client release.
- Sunset: remove the profile-id fallback once the minimum supported app version
  includes Step 1 (target Step 2A).

## 5. Forfeit (`pvp_forfeit_match`)

- Ownership: the match must belong to the caller's device (hash-resolved profile).
- Only an `assigned`, unexpired match is finalized, as a 0–2 loss with server Elo.
- Idempotent: a completed match returns its stored settlement (`already_completed`).
- Expired: `match_not_found_or_expired`, no rating change; the match stays `assigned`
  for the Step 2A abandonment policy.
- The Step 1 client keeps its null-round submit until Step 2A switches it over; both
  paths produce the same server result.

## 6. Security changes

- Installation secrets for new installs are stored hashed only.
- API roles can no longer read or write ranking tables directly (all access via
  SECURITY DEFINER RPCs with explicit `search_path`).
- PIN-gated `admin_get_overview` is no longer callable by anon.
- `pvp_set_cosmetic_npc` (NPC model replacement, rejected for V3) is no longer callable.
- Every client RPC is SECURITY DEFINER with a pinned `search_path` (except
  `pvp_capabilities`, which reads no data); inputs validated (device key 32–256 chars,
  character 1–4, limits clamped, rounds trimmed to 3, display stats clamped to 80–2500);
  ownership enforced through `pvp_resolve_profile` / `pvp_lock_match`; no dynamic SQL in
  any RPC (only in migration DO blocks over constant lists).
- Exactly 17 RPCs are client-executable (verified by test and by the verify script).
- `profiles` RLS policies (3, bodies unconfirmed) are not dropped or altered. Revoking
  direct table privileges makes them inert for anon/authenticated.
- Remaining known gaps for Step 2A: plaintext `device_key` column still holds donor-era
  secrets (drop after confirming all active rows have hashes); no rate limiting.

## 7. Client temporary safety (already in the working tree)

- `pvpCapabilities()` → `isRankedRetrySafe()` in `utils/rankingSubmission.ts`.
- Donor-era server (no `pvp_capabilities`): a failed ranked submission is stored,
  but neither automatic nor manual retry re-sends it. The result screen shows
  SYNC PENDING without a retry button (`ranking.syncAwaitServer`).
- After the migration the server reports `ranked_submit_idempotent: true`, stored
  entries retry automatically on the next Bounty Board visit. No app release needed.
- Daily and friend retries stay enabled (idempotent on both server versions).

## 8. Validation

| Suite | Scope | Result |
|---|---|---|
| `tests/ranking-reconcile-migration.cjs` | real PostgreSQL 17 (PGlite + pgcrypto): donor fixture → migration → contract; ghost eligibility; legacy ambiguity; forfeit; security allowlist; backup/verify scripts; rollback; repo baseline → migration; Step 1 client modules against the migrated DB | 34/34 |
| `tests/ranking-submission-regression.cjs` | client submission logic vs fake V3 / donor server | 15/15 |
| `tests/local-duel-regression.cjs` | unchanged local engine | 11/11 |

`tests/fixtures/donor-era-remote.sql` reconstructs the remote from the audited CSV
plus the donor SQL files copied verbatim. Donor base functions that were never
committed (`pvp_matchmake`, `pvp_submit_match`, `pvp_leaderboard`) are stubs with the
remote signatures and the donor behaviour that matters (client-trusted, non-idempotent).

Run: `npm i --no-save @electric-sql/pglite@0.3 && node tests/ranking-reconcile-migration.cjs`

Not covered locally: true concurrent sessions (PGlite is single-connection). The
row lock + status gate and `ON CONFLICT` paths are standard PostgreSQL semantics.

## 9. Deployment checklist (human-run)

Before:

1. Supabase Dashboard → Database → Backups: confirm a recent backup / PITR point.
2. SQL Editor: run `supabase/ops/20260927_pre_deploy_backup.sql` (read-only) and
   download the CSV. It holds the donor function bodies (not in git), policies,
   grants, schema and the profiles fingerprint. Required for rollback.
3. expo.dev → Project → Environment variables → **production** contains
   `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (presence only; never
   paste values into docs, tickets or logs). `.env` is gitignored and not uploaded to
   EAS cloud builds; local OTA uploads read the local `.env`.

Apply:

4. SQL Editor → paste all of `supabase/migrations/20260927_reconcile_bounty_ranking_v3.sql`
   → Run once. Any error rolls the whole transaction back.
5. Run `supabase/ops/20260927_post_deploy_verify.sql`. Expect no FAIL / WARN rows and a
   `profiles` fingerprint identical to step 2.
6. Smoke test from a dev build: existing device keeps rating, Bounty Board, one ranked
   duel (expect a bot until human ghosts exist), profile history, daily, friend.

## 10. Rollback / recovery

**Migration fails while running** — nothing to do. The file is one transaction
(`begin … commit`); any error, including the final contract assertion, rolls back
every statement. Tested: a pre-existing wrong `pvp_matches` aborts with
`reconcile contract check failed` and leaves no new column behind.

**Migration succeeded but the app regresses** — restore behaviour, not data:

1. Re-create the donor function bodies saved in step 2 (`function_def` rows) and
   restore their ACLs (`function_acl` rows). This is why the backup is mandatory:
   those bodies exist nowhere else.
2. New columns, `pvp_matches`, the hash column and the moved primary key can stay;
   donor functions ignore them. Re-grant table privileges only if a donor-era client
   read tables directly (none does in this repository).
3. Caveat: installs created after the migration have no plaintext `device_key`, so the
   donor `pvp_login_device` would give them a new profile. Keep the rollback window
   short, or restore the database backup instead.

**Data loss exposure** — none from the migration itself (additive; verified by the
profiles fingerprint).

## 11. Remote confirmation still pending

- Bodies of the 3 `profiles` RLS policies (captured by the backup script; not changed).
- Any public function outside the known set that anon can execute: the verify script
  lists it as FAIL (ranking-named) or WARN (other).

## 12. Product impact to expect

Existing players have no recorded ghost, so right after deployment ranked matches use
the explicit bot until players complete full three-round ranked duels. That is the
intended consequence of not fabricating human records.
