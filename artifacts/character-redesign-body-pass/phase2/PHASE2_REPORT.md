# HIGH NOON — PHASE 2 integration prep (display scale, posters, silhouette, DEV preview)

2026-10-01 · `dev-2.0`. Live combat mapping is unchanged. No production character asset was overwritten.

## What was added
| File | Purpose |
| --- | --- |
| `constants/characterArtMetadata.ts` | Single metadata source: `REDESIGN_ART_META` (canvasSize, frameGroundY), `artDisplayScale()` = canvasSize / 1254, and the DEV-only `REDESIGN_STAGED_SOURCES` |
| `components/character/ScaledCharacterArt.tsx` | Keeps the layout box at `size` and draws the art at `size × displayScale`, centred, with overflow visible. Default scale 1 (the existing 19 characters are unaffected) |
| `app/capture/character-art.tsx` | DEV-only preview route; release builds redirect to `/`. Params: `char`, `mode=comp\|raw`, `bg=dark\|light`, `view=new\|old\|overlay`, `only=select\|duel` |
| `assets/images/characters/staged/redesign-v2/**` | Staged runtime-shaped files (new paths only) |
| `../stage_phase2.py` | Staging derivation script (copy, uniform downscale, alpha threshold only) |

No existing file was edited. Unchanged: `CharacterSelector`, `NpcWantedCard`, `NpcPortrait`, `NpcFirstPersonDuelArena`, `CharacterSprites`, `clarityCharacterAssets`, `posterCharacterAssets`, `v3UiAssets`. The 4 pre-existing dev-2.0 modifications are unchanged (4 files, 47+/11−).
The staged requires sit behind `__DEV__`. iOS and Android release exports contain **0** of the 15 staged PNGs; the live NPC15 idle in the same bundle is the control.

## Staged paths
```
STAGED_MASTER_PATH=assets/images/characters/staged/redesign-v2/{player/04,npc/09,npc/15,npc/18,npc/19,npc/20,npc/22}/idle.png
STAGED_POSTER_PATH=assets/images/characters/staged/redesign-v2/npc/{09,15,18,19,20,22}/identity_poster.png
STAGED_LOCKED_SILHOUETTE_PATH=assets/images/characters/staged/redesign-v2/hidden/pale_rider_locked_silhouette.png
```
Manifest with hashes: `staged_manifest.json`. Protected production files checked: 166 (all clarity PNGs + the locked silhouette), unchanged.

## Posters / silhouette (no generation)
- **Posters** follow the production convention: 1254² RGBA PNG, true alpha, rendered at display scale 1 in `NpcWantedCard` (256pt, card `overflow: hidden`).
  - Each poster is the normalized master's alpha content fitted into 1254 with a 12px margin. It is a uniform downscale only, with no crop.
  - Resulting body size vs the current poster: NPC09 1.00, NPC15 1.00, NPC18 0.984, NPC19 0.996, NPC20 0.981, NPC22 0.981. Wide cloaks force the extra 2% shrink.
- **NPC22 locked silhouette** follows the existing spec: 256² RGBA, black, binary alpha. It is an alpha threshold (≥128) of the normalized NPC22, bottom-anchored. It shows the exact new outline (hat, horse skull, cape).

## P04 mapping (report only)
`CLARITY_PLAYERS[4]` drives every surface:
- **Character Select:** `CharacterSelector` → `V3_PLAYER_IDENTITIES` = clarity idle, 340pt contain.
- **Pre-duel:** `NpcPreDuelScreen` → `V3_PLAYER_IDENTITIES`.
- **Duel and ranked opponent:** `PlayerCharacterSprite` via `CLARITY_PLAYERS`. The ranked opponent comes in through `opponentCharacterId` in `NpcFirstPersonDuelArena`.
- **Local:** `app/local-setup.tsx` idle.

There is no player poster. Integration therefore swaps all P04 poses together, and each of those render sites needs `ScaledCharacterArt` with scale 1.153.
`PLAYER_SELECT_MAPPING_FOUND=YES`.

## QA (iPhone 17 simulator, debug build, `phase2/simulator/`)
| ID | COMP_FACTOR | RAW_PREVIEW | COMP_PREVIEW | CLIPPING | SIZE_MATCH | SELECT / DUEL READ |
| --- | --- | --- | --- | --- | --- | --- |
| P04 | 1.153 | body ≈13% smaller | boots on ground line, body matches old P04 | none (screen-width lane) | PASS | ghost / ghost |
| NPC09 | 1.234 | ≈19% smaller | matches | none | PASS | golden skull / golden skull |
| NPC15 | 1.294 | ≈23% smaller | matches; hunched head lower by design | none | PASS | shadow / shadow (dark bg weakest, as before) |
| NPC18 | 1.362 | ≈27% smaller | matches; halo inside | none | PASS | oracle / oracle |
| NPC19 | 1.319 | ≈24% smaller | matches; fragments inside | none | PASS | void / void |
| NPC20 | 1.365 | ≈27% smaller | matches; aimed barrel inside the 402pt lane | none | PASS (≈3% smaller, no upscale) | echo / echo |
| NPC22 | 1.309 | ≈24% smaller | matches | none | PASS | pale rider / pale rider |

- **Select posters (scale 1):** all 6 fit inside the paper card with no edge clipping.
- **Silhouette:** `LOCKED_SILHOUETTE_READY=YES`.
- **Clipping note for PHASE 4 integration:** the compensated duel art extends `(scale−1)/2 × box` beyond the lane box on each side, which is about 12–18% of the box. `npcLane` has no overflow hidden, so nothing is cut. The art does overlap neighbouring HUD z-order the same way large cloaks already do; check this in combat QA.

```
DISPLAY_SCALE_INFRASTRUCTURE=READY (metadata + ScaledCharacterArt, opt-in per render site, default 1)
METADATA_LOCATION=constants/characterArtMetadata.ts
POSTERS_READY=6/6 (staged)
NPC22_LOCKED_SILHOUETTE_READY=YES (staged)
DEV_PREVIEW_READY=YES (/capture/character-art, __DEV__ only)
LIVE_COMBAT_MAPPING_CHANGED=NO
PRODUCTION_CHARACTER_ASSETS_CHANGED=NO (7/7 idle + 166 protected PNGs identical)
DATABASE_CHANGED=NO
TYPECHECK=PASS (tsc --noEmit)
LINT=PASS (expo lint exit 0; new files clean)
TESTS=3/3 runnable PASS (combat-reaction, local-duel-regression, ranking-submission-regression); 3 SKIPPED (friend-challenge-v3, ghost-snapshot-v2, ranking-reconcile-migration need PGLITE_DIR / @electric-sql/pglite, not installed; unrelated to this change)
IOS_BUNDLE=PASS (expo export ios, release; staged assets excluded)
ANDROID_BUNDLE=PASS (expo export android, release; staged assets excluded)
```
Web: the `expo start --web` dev bundle fails with a pre-existing `import.meta` error unrelated to this change, so QA used the native simulator.
Simulator housekeeping: the temporary `RCT_jsLocation` default was removed and the Metro on port 8094 was stopped. The Metro on port 8081 (another project) was not touched.

## PHASE 3 plan — combat poses for the 7 (not started)
1. **Runtime states to cover:**
   - Clarity set: `idle`, `draw` (aim), `fire` (shoot), `hit`, `down`. The clarity `down` frame is used as KNEEL.
   - Dedicated reaction frames from `NPC_COMBAT_POSES`: `fall`, `down` (NpcReactionStage hit/stagger/recover/kneel/fall/down).
   - **Per NPC: IDLE, DRAW, FIRE, HIT, KNEEL, FALL, DOWN.** P04 also needs the player-side set used by `PlayerCharacterSprite` (impact/recover → hit/idle; final → kneel/fall/down).
   - READY / STEADY / BANG get no character art.
2. **Canvas rule:** every pose for a character uses the same expanded canvas (`canvasSize`) and the same `frameGroundY` as its normalized idle. One `displayScale` then applies to all poses. The 1254 rule in the `combatPoses.ts` header becomes "same canvas as that character's idle".
3. **Weapon identity locks:**
   - P04: 2 in hand, empty holster. NPC15: 1 + 1 holstered. NPC19: 1, low.
   - NPC20: 2. NPC09: 2. NPC18: 1, raised. NPC22: 1 long-barrel.
   - DRAW must not pull a third gun.
4. **Identity marks in every pose:** void face (P04, NPC19), shadow mass (NPC15), echoes trail the motion (NPC20), skull and gold (NPC09), eyes and halo (NPC18), horse skull and pale body (NPC22).
5. **Integration order:** pose review → swap all poses + poster + silhouette in one change, wiring `ScaledCharacterArt` into `CharacterSprites`, `NpcFirstPersonDuelArena` (main and afterImage), `CharacterSelector`, `NpcPreDuelScreen` and `local-setup` → simulator QA → bump `SPRITE_CACHE_REVISION`.

STOP.
