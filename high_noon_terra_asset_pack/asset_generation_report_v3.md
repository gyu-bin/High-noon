# HIGH NOON — V3 Cinematic Pixel Art Validation & Production Report

## Scope and stop point

- Branch: `feat/animated-splash-branding`
- This validation adds **only** Player 01 idle and NPC 01 (Dust Wind) idle.
- Existing V3 Bronze Day and Bronze Night backgrounds were preserved exactly; neither was regenerated or overwritten.
- No game code, UI, manifest, V1/V2 asset, or production batch beyond these two candidates was changed.
- The user approved this V3 visual direction as the final production art style. The original validation assets remain preserved as the style lock.

## References and priority applied

1. `references/high_noon_master_reference.png` — overall High Noon visual language.
2. Existing V3 Bronze Day/Night backgrounds — sunset/moonlight, contrast, central-duel-lane context.
3. Accepted character identity requirements — Player 01 versus NPC 01 silhouette separation.
4. Repository source of truth — `constants/npcs.ts` NPC 01 keywords and `locales/npcI18n.ts` name `Dust Wind` / `먼지바람`.
5. Modern cinematic pixel-art rules — deliberate clusters, hard edges, 2–4 shade steps, no post-generation forced palette reduction.

## Generation method

Built-in image generation was used in two sequential character prompts. The Player prompt locked an upright black-hat, shadow-faced long-coat protagonist with one holstered revolver. The NPC prompt then locked Dust Wind to a worn hat, bandana, torn poncho, dust and a slouched lower-status silhouette while explicitly excluding the Player's long coat and poised stance. Both prompts requested transparent output; the generator returned a baked checkerboard, so only that neutral backdrop was keyed out into true-alpha final PNGs and composited for inspection.

## Generated master candidates

| Candidate | Path | Dimensions | Alpha | Encoded opaque RGB count | Identity / result |
| --- | --- | ---: | --- | ---: | --- |
| Player 01 idle | `output_v3_cinematic_pixel/characters/player/player_01_idle.png` | 256 × 256 | true alpha (0–255 present) | 9,018 | Black wide hat, face in shadow, composed long-coat silhouette, single holstered revolver. |
| NPC 01 idle — Dust Wind | `output_v3_cinematic_pixel/characters/npc/npc_01_idle.png` | 256 × 256 | true alpha (0–255 present) | 11,627 | Worn hat, bandana, torn asymmetric poncho, patched/dusty clothing, rougher and more slouched silhouette, single holstered revolver. |

### Alpha validation

Both master PNGs have an alpha channel; alpha signal values run from 0 to 255. The generated checkerboard was not retained in either final file: a broad neutral-background key was applied only to the generated checkerboard, then the character was verified over both a dark plain field and the V3 duel backgrounds. There is no floor plate, backdrop, or checkerboard in either master. Edge/halo quality should still receive human pixel-level review before production approval.

### Color validation

The V3 brief permits a **visual** 24–64-color palette but explicitly prohibits destructive automatic quantization. No palette quantization or style-conversion resize was used. The actual encoded RGB counts above are intentionally reported because they exceed that visual target; this is a review concern rather than hidden processing. The candidates read as restrained burnt-orange/ochre/deep-brown pixel art, but are not yet strict numeric-palette assets.

## Validation-only previews (not production assets)

| Preview | Path | Purpose |
| --- | --- | --- |
| A. Player 01 solo | `output_v3_cinematic_pixel/previews/player_01_solo.png` | 512 × 512 dark-field silhouette and edge review. |
| B. NPC 01 solo | `output_v3_cinematic_pixel/previews/npc_01_solo.png` | 512 × 512 identity and poncho/bandana review. |
| C. NPC 01, Bronze Day duel lane | `output_v3_cinematic_pixel/previews/npc_01_bronze_day_duel_lane.png` | 768 × 432 central-lane readability and sunset rim-light check. |
| D. NPC 01, Bronze Night duel lane | `output_v3_cinematic_pixel/previews/npc_01_bronze_night_duel_lane.png` | 768 × 432 moonlit contrast and silhouette check. |
| E1. Player gameplay-size | `output_v3_cinematic_pixel/previews/player_01_gameplay_size.png` | 384 × 216 nearest-neighbor display-only size check. |
| E2. NPC gameplay-size | `output_v3_cinematic_pixel/previews/npc_01_gameplay_size.png` | 384 × 216 nearest-neighbor display-only size check. |

The day/night composite keeps Dust Wind centered in the duel lane and leaves the lower-right foreground free. The gameplay-size previews use nearest-neighbor only for preview scaling; the 256 × 256 masters remain unchanged.

## Quality evaluation

- **Silhouette separation:** Pass for a validation candidate. Player reads as upright long-coat protagonist; Dust Wind reads as lower-status, asymmetric poncho-and-bandana opponent.
- **Gameplay-size readability:** Pass at the supplied 384 × 216 preview scale. Hat, holster hand, long coat versus poncho, and bandana remain distinguishable.
- **Cinematic fit:** Pass for contrast, central-lane staging, dark face treatment, and burnt-orange rim light. Night retains readable NPC separation, though the warm rim light is intentionally stronger than a purely blue moonlit treatment.
- **Pixel-cluster quality:** Directionally strong, but requires reviewer approval at 100% scale. The generated masters contain more encoded colors than the intended visual palette range, so they should not yet be signed off as final production pixel masters.

## V1 / V2 / V3 comparison

| Version | Character master | Look | Result |
| --- | --- | --- | --- |
| V1 | Earlier mixed production experiments | Initial western direction, inconsistent validation constraints | Preserved; not used as the V3 source. |
| V2 Strict NES | 128 × 128 | Deliberately restricted NES/Famicom simplicity and forced small palette | Structure validated, final art quality rejected. |
| V2 High-quality Pixel | 256 × 256 | Higher-detail 16-bit-inspired iteration | Preserved reference point; less tightly staged against the V3 cinematic duel backgrounds. |
| V3 Cinematic Pixel | 256 × 256 | Stronger High Noon sunset/night integration, deeper shadow, clearer player/NPC role split | **Most faithful candidate so far to the V3 cinematic brief**, pending human review of palette density and edge cleanup. |

## Human review checklist

1. Confirm the Player 01 identity is the desired anonymous protagonist rather than too close to a generic long-coat gunslinger.
2. Confirm Dust Wind's slouch, torn poncho, bandana, and poorer silhouette are sufficiently distinct from Player 01.
3. Inspect both transparent edges at 100% for keyed-edge remnants or unwanted transparent holes.
4. Decide whether the visual 24–64-color direction is sufficient, or request a manual palette-cleanup pass before approving this style for the remaining batches.
5. Confirm the warm NPC rim light remains acceptable in the Bronze Night composition.

## Production Batch A — Backgrounds (completed; stop point)

The locked V3 style was applied only to the first production background batch. Bronze Day/Night remain untouched. The existing 138-item `asset_manifest.json` has four generic `duel_town_*` backgrounds but no Silver/Gold tier paths, so `asset_manifest_v3_cinematic_pixel.json` records the four new V3 production IDs and paths without changing legacy inventory paths or any CSV, README, V1, or V2 material.

Built-in image generation was used once per accepted asset. The first Silver Night attempt introduced town architecture and was rejected before any workspace output was written; the accepted retry was constrained to Silver Day's canyon geometry. The concise accepted prompt metadata is retained in `asset_manifest_v3_cinematic_pixel.json`.

| Asset | Exact output path | Dimensions | Alpha | Automated validation | Visual result |
| --- | --- | ---: | --- | --- | --- |
| Silver Day | `output_v3_cinematic_pixel/backgrounds/silver_day.png` | 768 × 432 | opaque | Exists, decodes, correct dimensions, unique SHA-256 | Giant warm sun; layered red canyon mesas; empty central desert lane. |
| Silver Night | `output_v3_cinematic_pixel/backgrounds/silver_night.png` | 768 × 432 | opaque | Exists, decodes, correct dimensions, unique SHA-256 | Giant moon; cold-dark canyon masses; restrained orange horizon accents; empty lane. |
| Gold Day | `output_v3_cinematic_pixel/backgrounds/gold_day.png` | 768 × 432 | opaque | Exists, decodes, correct dimensions, unique SHA-256 | Burnt-gold sunset; mine headframe, water tower and carts held at edges; empty lane. |
| Gold Night | `output_v3_cinematic_pixel/backgrounds/gold_night.png` | 768 × 432 | opaque | Exists, decodes, correct dimensions, unique SHA-256 | Moonlit mine settlement; dark structures and sparse lamps at edges; empty lane. |

### Batch A visual validation

- **V3 similarity:** Pass. All four keep the approved giant celestial body, burnt-orange/brown/near-black hierarchy, strong shadow masses, high-contrast pixel clusters, and broad center lane.
- **Gameplay readability:** Pass. The central lane remains vacant for runtime NPC placement; architecture, carts, rocks and cacti remain to the edges.
- **Palette observation:** No automatic palette quantization was applied. The images are visually constrained to the locked Western orange/brown/near-black palette, with night blue and lamp gold restricted to support accents.
- **Warnings:** Background generation is visually reviewed, but no automated text-recognition or pixel-art color-count gate exists. Silver Day/Night share canyon geometry and Gold Day/Night share mining-town motifs; exact structural identity across day/night is stylistic rather than a frame-perfect transform.

### Contact sheet (non-production)

`output_v3_cinematic_pixel/previews/phase_a_backgrounds_contact_sheet.png` — order: Silver Day, Silver Night, Gold Day, Gold Night (left-to-right, top-to-bottom).

**Stop:** Do not proceed to Platinum backgrounds, Player 02+, NPC 02+, VFX, UI, or game-code changes without the next user approval.

## Production Batch B — Remaining backgrounds (completed; stop point)

| Tier | Paths | Dimensions / alpha | Environment differentiation |
| --- | --- | --- | --- |
| Platinum | `output_v3_cinematic_pixel/backgrounds/platinum_day.png`, `platinum_night.png` | 768 × 432, opaque | Western railroad station plaza; locomotive, station and tracks stay at edges. |
| Diamond | `output_v3_cinematic_pixel/backgrounds/diamond_day.png`, `diamond_night.png` | 768 × 432, opaque | Endless open plains; the night uses distant lightning and restrained blue only at storm accents. |
| Master | `output_v3_cinematic_pixel/backgrounds/master_day.png`, `master_night.png` | 768 × 432, opaque | Abandoned prison courtyard; iron and walls frame its clear central floor. |
| Legend | `output_v3_cinematic_pixel/backgrounds/legend_day.png`, `legend_night.png` | 768 × 432, opaque | Grounded western frontier sanctuary; weathered stone/adobe forms rather than fantasy-RPG architecture. |
| Hidden | `output_v3_cinematic_pixel/backgrounds/hidden_pale_rider.png` | 768 × 432, opaque | Near-black void/wasteland with a minimal deep-red horizon; no stars, moon or normal bright landscape. |

### Batch B automated and visual validation

- All nine output files exist, decode without FFmpeg errors, are 768 × 432 opaque PNGs, and have distinct SHA-256 hashes.
- Visual inspection found no characters, weapons, UI or baked gameplay text. The lower-right is kept comparatively quiet across normal backgrounds for the later first-person weapon layer.
- Normal environments remain legible as railroad station, plains, prison, and western sanctuary while preserving V3 pixel density, orange/brown/near-black hierarchy and central duel readability.
- The first Hidden attempt retained overly legible side architecture; it was not accepted. The final saved Hidden asset removes that visual weight in favor of void-like negative space.
- No automatic palette quantization was used. Human review should assess how similar the repeated sun/moon silhouette treatment feels at real device scale, and whether the very sparse Hidden ground detail leaves enough gameplay orientation.

### Batch B contact sheets (non-production)

- `output_v3_cinematic_pixel/previews/platinum_to_legend_contact_sheet.png`: Platinum Day/Night, Diamond Day/Night, Master Day/Night, Legend Day/Night (left-to-right then next row).
- `output_v3_cinematic_pixel/previews/all_normal_backgrounds_contact_sheet.png`: day row Bronze → Legend; night row Bronze → Legend.
- `output_v3_cinematic_pixel/previews/hidden_pale_rider_preview.png`: standalone Hidden Boss review.

**Stop:** All production backgrounds requested through Hidden are complete. Do not create player/NPC identities or poses, weapons, VFX, UI, or alter game code without the next user approval.

## Character Production Batch 01 — Identity masters (completed; stop point)

| Asset | Repository identity | Output path | Validation |
| --- | --- | --- | --- |
| Player 02 | ID 2, `lastStand` unlock path | `output_v3_cinematic_pixel/characters/player/player_02_idle.png` | 256 × 256, true alpha; iron-sheriff silhouette. |
| Player 03 | ID 3, `headshot` unlock path | `output_v3_cinematic_pixel/characters/player/player_03_idle.png` | 256 × 256, true alpha; adult red-bandana dual-holster silhouette. |
| Player 04 | ID 4, `revive` / hidden unlock path | `output_v3_cinematic_pixel/characters/player/player_04_idle.png` | 256 × 256, true alpha; readable black ghost-gunslinger silhouette. |
| NPC 02 | Rusty Barrel, Bronze | `output_v3_cinematic_pixel/characters/npc/npc_02_idle.png` | 256 × 256, true alpha; broken hat brim and patchy vest. |
| NPC 03 | Wasteland Crow, Bronze boss | `output_v3_cinematic_pixel/characters/npc/npc_03_idle.png` | 256 × 256, true alpha; feathered cloak/crow-hat motif. |
| NPC 04 | Desert Fox, Silver | `output_v3_cinematic_pixel/characters/npc/npc_04_idle.png` | 256 × 256, true alpha; lean fur-trimmed coat. |
| NPC 05 | Iron Mask, Silver | `output_v3_cinematic_pixel/characters/npc/npc_05_idle.png` | 256 × 256, true alpha; restrained jaw half-mask and military coat. |
| NPC 06 | Coldblood Rachel, Silver boss | `output_v3_cinematic_pixel/characters/npc/npc_06_idle.png` | 256 × 256, true alpha; calm leather-duster dual-holster silhouette. |

### Character Batch 01 validation

- Player 01 and NPC 01 remained unchanged as template anchors. The new masters preserve their canvas, full-body framing, ground alignment, dark silhouette mass and orange rim-light language.
- The first gameplay composites exposed opaque black backgrounds in the newly generated NPC files. Original generator images were preserved; production PNGs were safely re-extracted with a conservative black-background key and re-tested over Bronze/Silver backgrounds. The black rectangles are absent in final composites.
- At master and 96-pixel gameplay scales, hat/head, coat/poncho, holster, and signature features remain distinguishable. NPC 03 uses silhouette rather than VFX for boss presence; NPC 06 limits blue to eye accent.
- Human review warning: all character masters were generated from separate identity prompts. Before later poses, confirm Player 02 and Player 04 have enough silhouette separation from Player 01 at gameplay size; do not derive states until identity review is accepted.

### Character Batch 01 previews (non-production)

- `previews/player_01_to_04_contact_sheet.png` — Player 01 through 04, left-to-right.
- `previews/npc_01_to_06_contact_sheet.png` — NPC 01 through 06, left-to-right then second row.
- `previews/character_batch_01_combined_contact_sheet.png` — combined 10-character review; top row P01–P04/NPC01, bottom row NPC02–06.
- `previews/character_batch_01_gameplay_size_sheet.png` — same order at 96-pixel gameplay approximation.
- `previews/npc_02_bronze_day_gameplay.png`, `npc_03_bronze_day_gameplay.png`, `npc_04_silver_day_gameplay.png`, `npc_05_silver_day_gameplay.png`, `npc_06_silver_day_gameplay.png`, and `npc_06_silver_night_gameplay.png` — runtime-layering checks.

**Stop:** Character Batch 01 ends here. Do not generate NPC 07+, states, first-person weapons, VFX, UI, or game-code changes without explicit approval.

## NPC Production Batch 02 — Identity masters 07–12 (completed; stop point)

All six outputs are 256 × 256 true-alpha PNGs: `characters/npc/npc_07_idle.png` through `npc_12_idle.png`. Repository identities are Cactus Jack (Gold), Twin Fang (Gold), Golden Skull (Gold boss), Steel Eagle (Platinum), Silent Locomotive (Platinum), and Black Iron (Platinum boss).

- NPC 07: spined hat, muted-green coat accent, spiked gloves and lean stance.
- NPC 08: red vest, open upper body and dual-holster profile.
- NPC 09: broader gilded dark boss silhouette, skull-face treatment without a fantasy aura.
- NPC 10: asymmetric steel shoulder and tiny frontier mechanical-eye detail.
- NPC 11: deliberately broad heavy engineer build and goggle silhouette.
- NPC 12: near-black reinforced western armored mass with obscured face and obsidian revolver.

Validation: master contact, 01–12 combined contact, black silhouette sheet, Gold Day and Platinum Night runtime composites were created. All outputs have alpha channels; background composites show no retained checkerboard/opaque rectangular backdrop. No automatic palette quantization or game-code change was made.

Previews: `previews/npc_07_to_12_contact_sheet.png`, `previews/npc_01_to_12_contact_sheet.png`, `previews/npc_01_to_12_silhouette_sheet.png`, `previews/npc_09_gold_day_gameplay.png`, and `previews/npc_12_platinum_night_gameplay.png`.

Human-review warning: NPC 07, 08 and 10 share a broadly hat-and-duster-based western language, but their hat/glove, dual-holster/vest and asymmetric-shoulder details separate them at master size. Confirm this remains sufficient at the game's final device scale before deriving poses.

**Stop:** Do not generate NPC 13+, states, weapons, VFX, UI, or alter game code without explicit approval.

## NPC 01 — Dust Wind pose-pipeline validation (completed; awaiting human approval)

Only the approved V3 Dust Wind identity was used for this pass. `identity.png` and `idle.png` are preserved copies of `output_v3_cinematic_pixel/characters/npc/npc_01_idle.png`; they were not redrawn. `draw.png`, `fire.png`, `hit.png`, and `down.png` were generated sequentially from that identity reference, with the same worn hat, mouth-covering bandana, torn tan poncho, slouched build, dark holster, boots, orange rim light, and outline/pixel-density language. No Player 02+, NPC 02+ pose, gameplay, UI, or game-code work was performed.

| Pose | Exact output path | Source / semantic validation | Dimensions / alpha | Regeneration |
| --- | --- | --- | --- | --- |
| Identity | `assets/images/characters/enemy/01/identity.png` | Preserved approved V3 Dust Wind master. | 256 x 256, true alpha | None. |
| Idle | `assets/images/characters/enemy/01/idle.png` | Preserved approved V3 Dust Wind master. | 256 x 256, true alpha | None. |
| Draw | `assets/images/characters/enemy/01/draw.png` | Revolver has left the holster but arm remains bent/low; Dust Wind is not posed like Player 01. | 256 x 256, true alpha | None. |
| Fire | `assets/images/characters/enemy/01/fire.png` | Low, single-hand western quick-draw toward opponent. No baked flash, smoke, bullet trail, or two-hand/raised-gun stance. | 256 x 256, true alpha | None. |
| Hit | `assets/images/characters/enemy/01/hit.png` | Immediate rearward torso/shoulder recoil; gun arm loses control and balance begins to break. | 256 x 256, true alpha | None. |
| Down | `assets/images/characters/enemy/01/down.png` | Low knee-collapse defeat pose that follows Hit; not a corpse, no blood/gore. | 256 x 256, true alpha | None. |

### QA outcome

- **Identity consistency:** Pass. Hat, bandana, torn poncho construction, slouched silhouette, belt/holster/boots, orange rim light, and rendering density are maintained across all six assets. Dust Wind remains visually separate from Player 01: rougher poncho/bandana layering and a poorer, more hunched profile.
- **Pose readability:** Pass at the 80-pixel gameplay approximation. Idle, Draw, Fire, Hit, and Down read as distinct silhouettes; Fire has a fully extended low weapon while Draw remains a partial departure from the holster.
- **Continuity:** Pass. Fire is followed by a visibly displaced Hit, then a lowered, kneeling Down. The sequence avoids a sudden death-corpse frame.
- **Alpha / composition:** Pass. All six production PNGs decode as 256 x 256 with alpha. The Bronze Day composite has no opaque keyed rectangle or checkerboard residue.
- **Muzzle-flash test:** `assets/images/vfx/qa/muzzle_flash_test.png` is a temporary 64 x 64 true-alpha QA-only test asset. It was composited only over the Fire preview; it is separate from Dust Wind's Fire sprite and is not integrated into the game.
- **Regenerations:** None. The accepted poses meet the requested semantic checks; no approved identity/idle frame was touched.

### QA previews (non-production)

- `assets/images/characters/enemy/01/previews/npc_01_fullsize_contact_sheet.png` — Identity, Idle, Draw, Fire, Hit, Down.
- `assets/images/characters/enemy/01/previews/npc_01_motion_strip.png` — Idle → Draw → Fire → Hit → Down, common 256-pixel baseline.
- `assets/images/characters/enemy/01/previews/npc_01_gameplay_size_strip.png` — 80-pixel gameplay-size state comparison.
- `assets/images/characters/enemy/01/previews/player_01_vs_npc_01_pose_comparison.png` — common-canvas player/NPC pose-semantic comparison.
- `assets/images/characters/enemy/01/previews/npc_01_bronze_day_pose_sequence.png` — Bronze Day runtime-layering sequence; temporary muzzle flash only on Fire.

**Stop:** NPC 01 pose-pipeline validation is the sole completed work in this pass. Await human approval before producing NPC 02 poses, any Player 02+ pose, VFX/UI production work, integration, or game-code changes.

## Full character pose production — resumed checkpoint

Audited against files on disk before resuming. Player 02–04 and NPC 02–03 existed as complete six-frame QA sets but had no prior manifest/report acceptance entry; dimensions and alpha were revalidated and their existing contact sheets were visually checked. They were retained without regeneration. NPC 04 was the first incomplete sequence; only its missing Hit and Down poses were generated, then its six-frame contact sheet was created and validated.

| Accepted character sequences | Production poses | Result |
| --- | ---: | --- |
| Player 02–04 | 15 | All 256 x 256 true-alpha; Player 04's intentional translucency retained. |
| NPC 02–04 | 15 | All 256 x 256 true-alpha; distinct Draw/Fire and Hit/Down reads. |

- Existing/reused accepted poses: 28 (Player 02–04 and NPC 02–03: identity masters are preserved separately; 25 production poses plus the approved directory content audited).
- Newly generated in this resumed segment: 2 (NPC 04 Hit, Down).
- Regenerated/rejected poses: 0.
- Alpha failures / identity failures / unresolved issues: 0.
- QA contact sheets: `previews/pose_batches/player_02_to_04_pose_contact_sheet.png`, `assets/images/characters/enemy/02/previews/npc_02_contact_sheet.png`, `assets/images/characters/enemy/03/previews/npc_03_contact_sheet.png`, `assets/images/characters/enemy/04/previews/npc_04_contact_sheet.png`.

NEXT_RESUME_CHARACTER=NONE

NEXT_RESUME_POSE=NONE

COMPLETED_POSES=120

REMAINING_POSES=0

NEW_POSES_THIS_RUN=63

FAILED_POSES_THIS_RUN=0

REGENERATED_POSES_THIS_RUN=0

**Resume rule:** Production complete. Preserve all accepted assets; do not proceed to VFX/UI/integration without human approval.

## Final character matrix QA

- FINAL_EXPECTED_POSES=130
- FINAL_PRESENT_POSES=130
- MISSING_POSES=0
- FAILED_QA_POSES=0
- ALPHA_FAILURES=0
- IDENTITY_FAILURES=0
- FIRE_FAILURES=0
- HIT_DOWN_CONTINUITY_FAILURES=0
- REGENERATED_POSES=0
- UNRESOLVED_POSES=0

Final QA verified every Player 01–04 and NPC 01–22 state in the Idle → Draw → Fire → Hit → Down matrix. Each required production PNG is 256 × 256 with alpha. NPC 22 remains only in assets/images/hidden; its validation sheet is development-only.

Final development-only QA sheets:

- output_v3_cinematic_pixel/qa/final_pose_sheets/player_01_to_04.png
- output_v3_cinematic_pixel/qa/final_pose_sheets/npc_01_to_06.png
- output_v3_cinematic_pixel/qa/final_pose_sheets/npc_07_to_12.png
- output_v3_cinematic_pixel/qa/final_pose_sheets/npc_13_to_18.png
- output_v3_cinematic_pixel/qa/final_pose_sheets/npc_19_to_22.png
- output_v3_cinematic_pixel/qa/final_pose_sheets/gameplay_size_master_pose_sheet.png

## First-person Player 01 revolver QA

- Production PNGs: `assets/images/weapons/player_fp/player_fp_revolver_idle.png`, `player_fp_revolver_draw.png`, `player_fp_revolver_fire.png`
- Production dimensions / alpha: 512 × 512, true alpha for all three states.
- Revolver consistency: passed. Barrel, cylinder, metal finish, wood grip and one-hand western grip are preserved across Idle → Draw → Fire.
- Hand anatomy: passed. One right hand grips one revolver in each state; fingers, trigger guard and wrist read cleanly with no duplication or fused anatomy.
- FIRE: passed. Low lower-right western quick-draw, directed toward the opponent without a center-screen FPS stance; its production PNG contains no muzzle flash, smoke, projectile, sparks or VFX.
- Portrait validation: `output_v3_cinematic_pixel/qa/first_person_revolver/portrait_idle.png`, `portrait_draw.png`, `portrait_fire.png`.
- Landscape validation: `output_v3_cinematic_pixel/qa/first_person_revolver/landscape_idle.png`, `landscape_draw.png`, `landscape_fire.png`.
- Muzzle alignment: passed in development-only `output_v3_cinematic_pixel/qa/first_person_revolver/landscape_fire_muzzle_alignment.png`; the separate `muzzle_flash_test.png` originates at the FIRE barrel tip and is not baked into production art.
- Recommended runtime placement, portrait: bottom-right anchor; scale 0.66–0.78 relative to a 432 × 768 viewport; canvas origin at x 0.30–0.36W, y 0.56–0.62H.
- Recommended runtime placement, landscape: bottom-right anchor; scale 0.54–0.64 relative to a 768 × 432 viewport; canvas origin at x 0.50–0.56W, y 0.28–0.34H.
- UI safe area: keep the central 40% of the viewport unobstructed for the distant NPC and future READY / STEADY / BANG signal.
- No game code, UI, audio, orientation logic or gameplay integration was modified.

## Duel VFX and ability-presentation production

- Repository audit: NPC ability rules are already implemented in `app/game/npc.tsx`, `utils/npcDuelParams.ts`, `components/game/DuelSignalBoard.tsx`, and the NPC definitions/types. No gameplay behavior, timing, touch regions, audio, or screen code was changed.
- New transparent 256 × 256 image VFX: muzzle flash, gun smoke, bullet impact, fall dust, Thunderbolt lightning, Red Eye flash, Void crack. Echo is a compact transparent SVG; it also has a QA-only PNG preview.
- VFX contact sheet: `output_v3_cinematic_pixel/qa/vfx_validation/vfx_contact_sheet.png`.
- QA composites: normal muzzle, Thunderbolt, Shadow Hunter, Red Eye, Void, Echo and Pale Rider in `output_v3_cinematic_pixel/qa/vfx_validation/`.
- All image VFX alpha/dimension checks passed. Existing screen-shake, signal hiding, echo, blackout and audio behavior remain runtime/existing-code responsibilities.

## V3 UI design system and common UI asset production

### Audit and protection outcome

- Branch verified: `feat/animated-splash-branding`.
- Reused and retained: `WesternHomeBackground`, `ShimmerTitle`, `MetaScreenShell`, `WoodButton`, `MenuBackButton`, `CharacterSelectCard`, `NpcSelectCard`, `MaskedLegendCard`, `DuelSignalBoard`, `DuelArenaLayout`, `LocalDuelArenaLayout`, `HeartStrip`, existing result components and the current orientation hint asset.
- No title/menu/selection/duel/result/settings screen was rewritten. No gameplay logic, NPC AI, ability behavior, reaction timing, `progressStore` data model, audio asset, unlock rule or touch behavior changed.
- `constants/theme.ts` gained non-consuming `uiV3Colors` tokens only. Existing `colors` were intentionally kept unchanged so this design phase cannot silently restyle live screens.

### New production UI assets

- Textures (512 × 512 opaque): `assets/images/ui/western/ui_wanted_paper.png`, `ui_leather_texture.png`, `ui_wood_texture.png`. Generated with the built-in image generator, then inspected and resized with nearest-neighbor only for their target tile dimensions.
- SVG frames: `frames/ui_frame_primary.svg`, `ui_frame_portrait.svg`, `ui_divider.svg`.
- SVG status icons: `icons/ui_heart_full.svg`, `ui_heart_empty.svg`, `ui_skull_boss.svg`, `ui_lock.svg`.
- SVG tiers: `tiers/tier_bronze.svg`, `tier_silver.svg`, `tier_gold.svg`, `tier_platinum.svg`, `tier_diamond.svg`, `tier_master.svg`, `tier_legend.svg`.
- SVG ability icons: Mirror, Thunderbolt, Blind Bang, Screen Shake, Inverted Signals, Echo Ready, Chaos Random and Pale Silence.

All new SVGs are XML-valid. The three texture files decode as 512 × 512 PNGs. No localized or gameplay text is baked into production assets.

### Skipped / preserved assets

- `assets/images/ui/landscape_rotate_hint.svg` already covers the orientation-hint need and was not regenerated.
- Existing title artwork, approved V3 backgrounds, 130 pose images, first-person revolver, duel VFX, and all current UI components were used only as source/reference material and were not changed.

### Design validation board

Development-only board, built with actual approved production images and the new common assets:

- `output_v3_cinematic_pixel/qa/ui_validation/ui_validation_board.svg`
- `output_v3_cinematic_pixel/qa/ui_validation/ui_validation_board.png`

The board validates: Main Menu (portrait/landscape), Character Select (portrait), NPC Select (portrait), NPC Duel (portrait/landscape), Local Duel (portrait/landscape), and Result. Its local-duel portrait explicitly renders a 180° rotated P2 top half and normal P1 bottom half. Its NPC-duel frames preserve the minimal HUD, centered cue lane, approved NPC art and lower-right first-person weapon layer. The board is a composition validation artifact, not a runtime screen or implementation substitute.

### Required next approval

UI design-system, common asset production and validation mockups are complete. Wait for human approval before implementing any actual screen or changing existing UI behavior.
