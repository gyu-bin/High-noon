# HIGH NOON — character redesign integration (2026-10-01, dev-2.0)

## What changed
**Assets (new files only; every old production file is untouched — 7 old idle hashes re-verified):**
- `assets/images/characters/clarity/player/04-v2/` and `clarity/npc/{09,15,18,19,20,22}-v2/`: idle, draw, fire, hit, down (KNEEL); the NPC folders also have `identity_poster.png`.
- `assets/images/combat/npc/{09,15,18,19,20,22}/{fall,down}.png`.
- `assets/images/hidden/pale_rider_locked_silhouette_v2.png`.
- Posters for NPC09 / NPC19 / NPC20 were re-derived from the latest idle (IDLE_V2 / mirrored): 1254² RGBA, uniform fit, no crop.
- The file list with SHA-256 is in `production_assets_v2.json` (54 files).

**Code:**
- `constants/clarityCharacterAssets.ts`, `posterCharacterAssets.ts`: the 7 characters point at the `-v2` folders.
- `constants/combatPoses.ts`: fall/down registered for the 6 NPCs.
- `constants/v3UiAssets.ts`: locked silhouette → `_v2`.
- `constants/characterArtMetadata.ts`: `characterArtDisplayScale(kind, id)` and `scaledArtStyle()`. The staged requires were removed; the preview now reads the production registries.
- Render sites now apply the scale: `CharacterSprites` (all sprite layers), `NpcFirstPersonDuelArena` (NPC image and afterimage), `CharacterSelector`, `NpcPreDuelScreen`, `app/local-setup.tsx` (the large stage art only; the small roster/slot thumbnails stay unscaled so they do not overflow their cells).
- `constants/sprites.ts`: `SPRITE_CACHE_REVISION` 10 → 11.
- `app/capture/redesign-duel.tsx`: DEV-only fixed-frame duel QA route.
- Non-redesign characters get scale 1 (style unchanged).

## QA (iPhone 17 simulator, debug build; `simulator/`)
`SHEET_duel_all.png`: every pose of the 6 NPCs in the real duel arena, plus P04 as the ranked opponent, as fixed frames.
`SHEET_misc.png`: the NPC20 echo comparison and the UI screens. `UI_character_select_P04.png`: P04 in Character Select.

| | LIVE_MAPPING | POSE_CONTINUITY | DISPLAY_SCALE | CLIPPING | SELECT_QA | DUEL_QA | DARK_BG |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P04 | v2 | PASS | 1.372 | none | PASS (Character Select, real screen) | PASS (ranked-opponent slot) | PASS |
| NPC09 | v2 | PASS | 1.234 | none | poster via preview | PASS | PASS |
| NPC15 | v2 | PASS | 1.295 | none | poster via preview | PASS | low contrast (known) |
| NPC18 | v2 | PASS | 1.389 | none | poster via preview | PASS | PASS |
| NPC19 | v2 | PASS | 1.341 | none | Local setup real screen PASS | PASS | PASS |
| NPC20 | v2 | PASS | 1.418 | none | poster via preview | PASS | PASS |
| NPC22 | v2 | PASS | 1.343 | none | poster + silhouette via preview | PASS (night bg) | PASS |

- **Bug found and fixed during QA:** the first `scaledArtStyle` used only left/top negative margins, which pushed the Character Select info panel down by ≈68 px for P04. It now uses symmetric margins; re-verified on the real screen.
- **NPC20_ECHO_READY_DECISION = A (keep the current runtime afterimage).** With the baked echoes, the 0.24-opacity blue afterimage is barely distinguishable from the art's own echoes (`NPC20_echoA_on` vs `NPC20_echoC_off`). It is not excessive, so no code change. B (reduced opacity) was not needed.
- **NPC22_LOCKED_SILHOUETTE_DECISION = KEEP (provisional).** At the card's art size the new silhouette reads as a rider + horse shape. It is not a blob and reveals no costume detail. It was checked in the preview's card mock, not on the real locked card (see below).

## Not verified
- **NPC Select real cards** for the 6 NPCs and the **real locked NPC22 card**: these need swiping to each card / a locked save state. The posters and the silhouette were checked in the DEV preview's card mock at the same art size.
- **Result screen** and **live animated transitions**: duel QA used fixed frames per stage (0 / 450 / 760 / 1100 ms), not a played match. Timing-dependent motion (topple rotation, crossfades) was not watched live.
- **Muzzle-flash alignment:** most FIRE poses aim at shoulder height, but the runtime flash box sits at hip–chest height. Not tuned.
- **Android device rendering:** the bundle exports, but nothing was run on an Android device.
- **Landscape layouts.**

## Regression
```
TYPECHECK=PASS  LINT=PASS
TESTS=3/3 runnable PASS (combat-reaction, local-duel-regression, ranking-submission-regression); 3 need @electric-sql/pglite (not installed)
IOS_BUNDLE=PASS (export 276 MB)  ANDROID_BUNDLE=PASS (276 MB)
OLD_PRODUCTION_FILES=unchanged (7/7 idle hashes; old folders left in place for rollback)
DATABASE_CHANGED=NO
```
Notes:
- The new art adds ≈80 MB of PNGs to the clarity folder (canvases 1548–1778 px). Consider lossless optimisation before release.
- `assets/images/characters/staged/` (113 MB) is now an unreferenced duplicate and can be deleted.
- The old `clarity/{player/04, npc/09…22}` folders are no longer referenced.

```
CHARACTER_REDESIGN_INTEGRATION=INTEGRATED_ON_DEV — fixed-frame duel QA passed; real NPC Select cards, Result screen, live animation and muzzle alignment still to be checked by a human playthrough
```
