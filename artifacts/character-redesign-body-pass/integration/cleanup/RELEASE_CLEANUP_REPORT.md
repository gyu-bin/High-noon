# HIGH NOON — release cleanup / hardening (2026-10-02, dev-2.0)

## 1. P04 muzzle
P04 uses `MuzzleFlashOverlay` (anchor x 0.22, y 0.38), so the flash sat on the chest while the barrels are at the top-left of the box. Fix:
- `PLAYER_MUZZLE_ANCHOR[4] = { x: -0.02, y: 0.12 }` in `constants/characterArtMetadata.ts`.
- New optional `anchorY` prop on `MuzzleFlashOverlay`.
- `NpcCharacterSprite` (local duel) now reads `NPC_MUZZLE_ANCHOR` too.
Verified on the simulator: `P04_muzzle_frames.png` shows the flash at the barrel tips. Characters without an entry keep the legacy anchor. No asset was changed.

## 2. Staged assets
- **References** (searched outside node_modules/.git/artifacts):
  - `app/`, `components/`, `constants/`, `utils/`, `lib/`, `hooks/`, `store/`, `scripts/`, `tests/`, capture routes: 0.
  - The only mentions are QA scripts/reports under `artifacts/`.
- **Duplicates:** all 54 staged files had a byte-identical production copy (md5).
- **Deleted:** `assets/images/characters/staged/` (54 files, 100 MB). List: `staged_files_before_delete.txt`. The folder was tracked in git, so it is recoverable from history.
- **Kept:** production v2 assets, old production folders (rollback), `artifacts/`.

## 3. PNG optimization
Lossless oxipng (level 4) on the 53 redesign PNGs (`clarity/{player/04,npc/*}-v2`, `combat/npc/{09,15,18,19,20,22}`).
- Each file verified against git HEAD: same dimensions, RGBA, pixel-identical.
- Same filenames/paths, no mapping change.
- 103.9 MB → 100.6 MB (−3.3 MB, 3.2%). Details: `png_optimization.json`.
- `pale_rider_locked_silhouette_v2.png` was skipped: the optimizer would change its colour mode.
- Lossless WebP (≈30% smaller, pixel-identical in a sample) is recorded as a post-release backlog item; not done.

## 4. Old-asset fallback found and fixed
`POSTER_PLAYER_IDENTITIES[4]` (`RankingPortrait`: MY WANTED / ranking) still pointed at the old P04 poster.
- Derived `clarity/player/04-v2/identity_poster.png` from the v2 idle (1254² RGBA, uniform fit, no crop, no generation).
- Remapped `POSTER_PLAYER_IDENTITIES[4]` to it.
- After the fix, 0 retired old files are in either release bundle.

## 5. Backgrounds
- `duel_twilight_town.png`, `duel_dusty_canyon.png`, `duel_moonlit_frontier.png`: 1920×1080 each.
- Selection: `pickDuelBackground()` runs at match start (NPC), on a new matchId (Ranked), and at start/rematch (Local). There is no per-round call. `scripts/test_duel_background_selection.cjs` passes (equal thirds).
- Legacy backgrounds are still on disk and registered for rollback.
- Static dim/vignette renders only when no approved background id is passed. The arena has no static dim.

## 6. Dead / duplicate asset audit (nothing else deleted)
| Class | Items |
| --- | --- |
| SAFE_TO_DELETE | `~/Downloads/high-noon/` ChatGPT exports + reference copy (94 MB, all copied into `artifacts/.../intake`). The session scratchpad |
| KEEP_FOR_ROLLBACK | `clarity/player/04`, `clarity/npc/{09,15,18,19,20,22}` (old poses + posters, 46 MB, unreferenced). `hidden/pale_rider_locked_silhouette.png`. Legacy duel backgrounds |
| KEEP_FOR_QA | `artifacts/character-redesign-body-pass/` (828 MB: intake originals, retired idles, intake-backup, normalized, reviews, live recordings). `artifacts/character-redesign-batch-ab`. `artifacts/character-identity-audit` |
| UNKNOWN | `assets/images/characters/clarity/player/player-01-02-identity-compare.png`, `characters/cinematic`, `characters/enemy`, SVG NPC files — not part of this redesign; not examined |

Note: `artifacts/` is not git-ignored (817 tracked files). The 828 MB redesign folder should not be committed as is.

## 7. Sizes
| | Before | After |
| --- | --- | --- |
| assets/ | 502 MB | 400 MB |
| assets/images/characters | 407 MB | 307 MB |
| assets/images/backgrounds | 7.4 MB | 7.4 MB |
| iOS export | 276 MB (last recorded, before the 3 backgrounds were added) | 282 MB |
| Android export | 276 MB (same) | 282 MB |

Staged deletion does not affect the bundle (it was never bundled). The worktree shrinks by ≈100 MB (staged) + 3.3 MB (PNG optimization).

## 8. Regression
```
TYPECHECK=PASS  LINT=PASS
TESTS=4/4 runnable PASS (3 pglite-dependent tests not runnable here)
IOS_BUNDLE=PASS  ANDROID_BUNDLE=PASS
registry require targets: all exist; v2 + background files present in both bundles (45/45); retired old files in bundles: 0
```

## 9. Device status
IPHONE_PORTRAIT=PASS · IPHONE_LANDSCAPE=NOT_VERIFIED · ANDROID_PORTRAIT=NOT_VERIFIED · ANDROID_LANDSCAPE=NOT_VERIFIED
