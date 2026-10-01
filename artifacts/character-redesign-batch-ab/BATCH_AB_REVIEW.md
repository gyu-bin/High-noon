# HIGH NOON — Character Identity Redesign Batch A+B: new master candidate review

2026-09-30 · `dev-2.0` · review only. No production replacement, pose generation or VFX work.

## 0. Local state check

- The previous session left only the audit (`artifacts/character-identity-audit/`) and the Batch A briefs
  (`artifacts/character-redesign-batch-a/`, `artifacts/p04-redesign-prep/`). There were no Batch A+B review materials. They were created in this folder.
- The existing modified code (`NpcFirstPersonDuelArena.tsx`, `combatPoses.ts`, `v3DuelAssets.ts`, `combatReaction.ts`,
  `app/capture/combat-v3.tsx`) is prior NPC01 Combat prototype work, so it was **left untouched per §1 and §23**.
- The 7 production idle SHA-256 hashes match `production_sha_before.txt` (matching the audit/Batch A records).

## 1. Production source (SOURCE OF TRUTH = `constants/clarityCharacterAssets.ts`)

| ID | CURRENT_RUNTIME_PATH = CURRENT_HIGH_RES_SOURCE | SOURCE_RESOLUTION |
| --- | --- | --- |
| P04 망령 사수 | `assets/images/characters/clarity/player/04/idle.png` | 1254×1254 RGBA |
| NPC15 그림자 사냥꾼 | `assets/images/characters/clarity/npc/15/idle.png` | 1254×1254 RGBA |
| NPC19 보이드 워커 | `assets/images/characters/clarity/npc/19/idle.png` | 1254×1254 RGBA |
| NPC20 에코 팬텀 | `assets/images/characters/clarity/npc/20/idle.png` | 1254×1254 RGBA |
| NPC09 황금 해골 | `assets/images/characters/clarity/npc/09/idle.png` | 1254×1254 RGBA |
| NPC18 레드 아이 오라클 | `assets/images/characters/clarity/npc/18/idle.png` | 1254×1254 RGBA |
| NPC22 창백한 기수 | `assets/images/characters/clarity/npc/22/idle.png` | 1254×1254 RGBA |

NPC Select actually shows each character's `identity_poster.png` (`POSTER_NPC_IDENTITIES`). The small-size test therefore renders the new candidates on their original canvas at the NPC Select card size (256) and the approximate Duel size (241), plus a 160px stress size.

## 2. Candidate mapping — ⚠ does not match the message order

The message lists uploads 1–4 as P04/NPC15/NPC19/NPC20. **The images themselves read as shadow / void / echo / echo.**
Per §3 ("identify by visual features first; do not arbitrarily apply to another character"), they were mapped by visual features:

| Upload | Stated in message | Visual read | Mapping in this review |
| --- | --- | --- | --- |
| #1 | P04 | near-black shadow wisps, white eyes, achromatic | **NPC15** |
| #2 | NPC15 | starfield/black-hole body, violet | **NPC19** |
| #3 | NPC19 | blue-white spectral dissolve + two afterimage hats | **P04** (the only spectral-blue candidate) |
| #4 | NPC20 | three afterimage figures aiming guns + horizontal streaks | **NPC20** |
| #5 | NPC09 | golden skull | NPC09 |
| #6 | NPC18 | multiple red eyes, talisman banners | NPC18 |
| #7 | NPC22 | crows, lanterns, crosses | NPC22 |

```
P04_CANDIDATE=upload#3 (message said NPC19)
NPC15_CANDIDATE=upload#1 (message said P04)
NPC19_CANDIDATE=upload#2 (message said NPC15)
NPC20_CANDIDATE=upload#4
NPC09_CANDIDATE=upload#5
NPC18_CANDIDATE=upload#6
NPC22_CANDIDATE=upload#7
```

If the message order was actually intended, then P04=shadow, NPC15=void and NPC19=echo. In that case NPC15, NPC19 and NPC20 all automatically REJECT for core-fantasy mismatch. **Human confirmation is needed.**

## 3. Most important finding — shared body template

All 7 candidates use **the same base body**: the same hat mold, the same diamond-quilted material across coat, pants and gloves, the same walking pose (left foot forward, spur), the same belt, bullet loops and right-thigh holster, and the same low-hanging revolver grip. The differences come mostly from **surrounding effects and props**.

- `C_body_core_overlay.png`: aligning the solid cores (α>235) by hat top and boot shows a large shared dark central area. Pairwise IoU is **0.54–0.74** (`silhouette_core_iou.json`). The core includes the baked effects, so the similarity of the body alone is higher.
- Consequence: moving the effects into runtime VFX per §15 would collapse all 7 back into "the same cowboy." **This batch cannot split out much effect.** The identity lives in the baked effects.
- This also raises §12's "same cowboy + different colored glow = FAIL" risk. NPC09 (skull face and ribs) and NPC18 (eyes on the body and crimson cloth) have their identity partly inside the body, so they are safer. P04, NPC15, NPC19 and NPC20 depend on effects.

## 4. Per-character verdicts

### P04 — upload#3
```
DECISION=REJECT (as P04)
IDENTITY_MATCH=partial — spectral dissolve and cold blue-white accent satisfy P04 requirements
FANTASY_READ=ghost + ECHO. Two semi-transparent afterimage hats and figures on both sides read immediately as "afterimage"
SILHOUETTE=width reads as a spray of effect; body core is the shared template
COLOR=charcoal + cold blue-white (meets P04 requirement)
WEAPON=DUAL in hand + 1 holstered (3 guns total)
SMALL_SIZE=at 241 and 160 nearly identical to NPC20 (both blue-white with afterimages). FAIL
ALPHA=true alpha, 1254², no edge contact, white fringe 3.6% (highest of the 7; semi-transparent white afterimage), lossy WebP
NORMALIZATION_REQUIRED=matching body height needs 1.004 (≈1.0). When centered on the hat, the left effect exceeds the canvas → effect crop or x-offset review needed
RUNTIME_VFX_RECOMMENDATION=cannot decide yet (regenerate first)
```
Reason: the P04 brief explicitly excluded "double afterimage," and the result collides with NPC20. The direction itself (spectral dissolve, void face, twin revolvers) is good, so **regenerate with the afterimage figures removed** is recommended.

### NPC15 — upload#1
```
DECISION=APPROVE_WITH_NORMALIZATION
IDENTITY_MATCH=YES — near-black, the body and cloak actually dissolve into shadow wisps
FANTASY_READ=SHADOW read immediately. Achromatic, clearly separate from P04 (blue)
SILHOUETTE=asymmetric black wisps flow to the left. Differentiated by outer-edge erosion
COLOR=soot black + small pale eyes (limited)
WEAPON=SINGLE in hand + 1 holstered (the only single configuration among the 7)
SMALL_SIZE=PASS — shadow still reads at 160 on dark backgrounds. On dark backgrounds, body/background contrast is low (verify in the duel scene)
ALPHA=true alpha, 1254², no edge contact, no fringe issues, lossy WebP
NORMALIZATION_REQUIRED=uniform 0.973 downscale + translation (+112, −12). The wisp's right end slightly exceeds the canvas → shift x slightly left
RUNTIME_VFX_RECOMMENDATION=BAKED_EFFECT_KEEP for the main wisps (the core identity). Only a light shadow-smoke flow at the edges as runtime
```

### NPC19 — upload#2
```
DECISION=APPROVE_WITH_NORMALIZATION
IDENTITY_MATCH=YES — starfield and black hole inside the torso and cloak, void face under the hat
FANTASY_READ=VOID/COSMIC read immediately. Floating rocks and a cosmic tear (the hole at upper left)
SILHOUETTE=scattered rocks and holes around the body give some separation. Body core is the shared template
COLOR=void black + violet (with actual stars). Slightly strong, but no general glow
WEAPON=DUAL in hand + 1 holstered (3 total)
SMALL_SIZE=PASS — the violet void still reads at 160
ALPHA=true alpha, 1254², no fringe issues, lossy WebP
NORMALIZATION_REQUIRED=uniform 0.983 + translation (+72, −2); fits inside the canvas
RUNTIME_VFX_RECOMMENDATION=BAKED keeps the body interior's void; runtime for the floating rocks and a subtle distortion
```

### NPC20 — upload#4
```
DECISION=APPROVE_WITH_NORMALIZATION (conditional: P04 must be regenerated for this approval to hold)
IDENTITY_MATCH=YES — clear main body + 3 afterimages with a time offset (hats, arms, guns duplicated)
FANTASY_READ=ECHO read immediately. The afterimages are semi-transparent blue-gray, so they do not overpower the main body
SILHOUETTE=afterimage arms extend horizontally → the widest silhouette of the 7
COLOR=dark brown + ghost blue-gray + dark red scarf
WEAPON=DUAL in hand + 1 holstered; afterimages hold duplicated guns (no extra physical guns)
SMALL_SIZE=PASS on its own, but only on the condition that P04 (#3) is not used
ALPHA=true alpha, 1125² (smaller than production), partial alpha 33% (the afterimages, intended), lossy WebP
NORMALIZATION_REQUIRED=matching production body height needs ×1.116 upscale → **forbidden**. Either use it at 1.0 (8–10% smaller than other characters) or re-export natively at ≥1254
RUNTIME_VFX_RECOMMENDATION=RUNTIME_VFX_RECOMMENDED — splitting the afterimages into runtime echo is most effective (but then the base body goes back to the shared template, so a unique mark is needed on the body too)
```

### NPC09 — upload#5
```
DECISION=APPROVE_WITH_NORMALIZATION
IDENTITY_MATCH=YES — golden skull face, gold ribs, skull ornaments on the shoulders, belt and holster
FANTASY_READ=GOLDEN SKULL + boss read immediately. Gold flame skulls around
SILHOUETTE=gold flames widen it; the body core is the shared template
COLOR=black + worn gold (meets requirement). The red_orange fringe 15% is the gold/amber palette itself, not contamination
WEAPON=DUAL in hand + 1 holstered (3 total)
SMALL_SIZE=gold reads even at 160; the skull face shrinks and becomes weak. PASS
ALPHA=true alpha, 1254², no edge contact, lossy WebP
NORMALIZATION_REQUIRED=uniform 0.997 + translation (+18, −7); fits inside the canvas
RUNTIME_VFX_RECOMMENDATION=BAKED keeps the skull face and ribs; the flame skulls around could partly go to runtime gold embers
```
Undead overlap: NPC18 has no skull; NPC22 has no skull → OK.

### NPC18 — upload#6
```
DECISION=APPROVE_WITH_NORMALIZATION
IDENTITY_MATCH=YES — many red eyes on the face, scarf and cloak + floating eyes, halo, talismans
FANTASY_READ=RED EYE / ORACLE / PROPHET read immediately. Not a skull character
SILHOUETTE=halo + a triangular silhouette spread by the banners → the most distinct of the 7
COLOR=black + dark crimson + parchment (talismans). Red eyes are the focal point
WEAPON=DUAL in hand + 1 holstered (3 total)
SMALL_SIZE=PASS — red dots and the halo read even at 160
ALPHA=true alpha, 1254², **halo spike touches the top edge (y=0, 3px)** → crop issue, lossy WebP
NORMALIZATION_REQUIRED=uniform 0.986 + translation (−78, +1). The left banner exceeds the canvas → effect crop or position review
RUNTIME_VFX_RECOMMENDATION=BAKED keeps the eyes on the body; runtime eye pulse and subtle ritual particles
```
Minor: the crosses/cross-shaped talismans on the chains overlap slightly with NPC22's cross motif.

### NPC22 — upload#7
```
DECISION=REJECT
IDENTITY_MATCH=NO — no pale/ash/bone visual language. Brown-black is the same palette as the regular cast
FANTASY_READ=gravedigger/undertaker (crows, crosses, lanterns). No "rider" or death read
SILHOUETTE=crosses and lanterns behind are scene props (a character master should not have background structures)
COLOR=brown/black + lantern orange; only the tip of the gray hair is pale
WEAPON=DUAL in hand + 1 holstered + belt lantern
SMALL_SIZE=at 160 and 241 reads as a "brown cowboy with props"; the final boss is not read. FAIL
ALPHA=true alpha, 1136×1385 non-square canvas, bbox 3px from the left, lossy WebP
NORMALIZATION_REQUIRED=0.895 downscale (possible), but meaningless due to identity failure
RUNTIME_VFX_RECOMMENDATION=—
```
Regeneration direction: bleached ash-white coat and hat, bone-gray skin/mask, silence; no background props; remove crosses (overlap with NPC18); a tatter or mist silhouette that suggests a "rider"; the palette must be clearly lighter than everyone else.

## 5. Cross-character differentiation

| Pair | Verdict |
| --- | --- |
| P04 vs NPC15 | Distinct (blue-white spectral vs achromatic shadow) |
| NPC15 vs NPC20 | Distinct (shadow wisps vs afterimage figures) |
| **P04 vs NPC20** | **TOO SIMILAR** — both blue-white + afterimage hats and figures + horizontal streaks. Nearly identical at 160 and 241 |
| NPC09 vs NPC18 | Distinct (gold skull vs crimson eyes and halo) |
| NPC09 vs NPC22 | Distinct (but NPC22 itself fails identity) |
| NPC18 vs NPC22 | Mild overlap in the cross motif |

- Separation from **color, effects and props: mostly PASS** (except P04~NPC20).
- **Body alone: FAIL** — all 7 share the same template (§3).

```
SILHOUETTE_DIFFERENTIATION=FAIL (body core) / PARTIAL (including effects: NPC18, NPC22 distinct; P04·NPC15·NPC20·NPC09 are round, spread-out blobs)
TOO_SIMILAR_PAIRS=P04~NPC20 (critical), all 7 body cores (template), NPC18~NPC22 (cross motif, minor)
```

## 6. Weapon policy record

| ID | Configuration |
| --- | --- |
| NPC15 | SINGLE in hand + 1 holstered |
| P04, NPC19, NPC20, NPC09, NPC18, NPC22 | DUAL in hand + 1 holstered (3 guns total) |

The "2 in hand + 1 holstered" pattern repeats across 6 characters (template artifact). Twin revolvers were officially allowed for P04. However, a later DRAW pose drawing from the holster contradicts both hands already being full. **Before generating poses, decide per character whether to remove the holstered gun or change DRAW to "raise."**

## 7. File quality (all)

- All are RGBA true alpha, background alpha=0, no black matte or white background contamination.
- **Lossy WebP** — the core alpha peaks around 252 (not 255), with compression artifacts. Production should use lossless PNG originals. Request PNG exports.
- Canvases: 1254² ×5, **1125² (NPC20)**, **1136×1385 (NPC22)**.
- Crop/edges: NPC18 halo touches the top edge. When aligned to the production body, P04, NPC15 and NPC18 effects exceed the 1254 canvas.
- The red/orange rim numbers for NPC09 and NPC18 come from their intended palette, not contamination. The white fringe on P04 is the afterimage glow.
- The body measurements in `candidate_review.json` (hat top and boot) are automatic estimates. P04 may include the afterimage hats; confirm manually during the PHASE 1 overlay.

## 8. Decision summary

```
P04=REJECT (collides with NPC20 through the echo figures; regenerate without afterimages)
NPC15=APPROVE_WITH_NORMALIZATION
NPC19=APPROVE_WITH_NORMALIZATION
NPC20=APPROVE_WITH_NORMALIZATION (on the condition that P04 is regenerated; ×1.116 upscale forbidden → re-export at ≥1254 recommended)
NPC09=APPROVE_WITH_NORMALIZATION
NPC18=APPROVE_WITH_NORMALIZATION (halo crop check)
NPC22=REJECT (no pale/ash/death language, background props)

CROSS_CHARACTER_DIFFERENTIATION=PARTIAL — separated by effects and color, but the body template is shared across all 7
TOO_SIMILAR_PAIRS=P04~NPC20, all-7 body core, NPC18~NPC22(minor)
APPROVED=NPC15, NPC19, NPC20, NPC09, NPC18 (all conditional on normalization)
NEEDS_REVISION=— (see caveats: a common body-template revision is recommended)
REJECTED=P04, NPC22
MAPPING_CONFIRMATION_REQUIRED=YES (uploads #1–#3 differ from the message order)

CONTACT_SHEETS=A_current_vs_new_{dark,light}.png, B_new_lineup_{dark,light}.png
SILHOUETTE_SHEET=C_new_silhouette.png, C_body_core_overlay.png, silhouette_core_iou.json
SMALL_SIZE_SHEETS=D_small_npc_select256_{dark,light}.png, E_small_duel241_{dark,light}.png, E_small_stress160_{dark,light}.png

PRODUCTION_ASSETS_CHANGED=NO
CODE_CHANGED=NO
DATABASE_CHANGED=NO
```

Caveat: even the approved 5 share a body template, so the more effects move to runtime, the weaker the differences become. Before LOCK, the human should choose one of the two below.
1. **Accept as-is**: identity = baked effects. Runtime VFX is only a light supplement.
2. **Body revision**: request that the 5 approved characters get character-specific body changes (hat shape, coat structure, gun type, pose). Pose generation would then start from the new masters.

## 9. Next step plan (not started yet)

- **PHASE 1 — approved master normalization**: after receiving lossless PNGs, apply uniform downscale + X/Y translation only to the approved characters. Set the foot baseline and hat center to production values, and adjust effects that exceed the canvas with an x-offset. Write the result to `artifacts/` only, and verify with overlays against production. P04 and NPC22 are regenerated first.
- **PHASE 2 — IDLE replacement review**: before swapping `clarity/*/idle.png`, compare in the simulator, including the poster (`identity_poster.png`) for NPC Select.
- **PHASE 3 — DRAW / FIRE / HIT**: fix the weapon policy (the holstered spare gun) first, then generate.
- **PHASE 4 — KNEEL / FALL / DOWN**: consistency of dissolve effects (ground contact of wisps, void, afterimages).
- **PHASE 5 — runtime supernatural VFX**: NPC20 echo, NPC18 eye pulse, NPC19 rocks and distortion, NPC15 edge smoke, NPC09 embers, P04 and NPC22 after their new masters.
- **PHASE 6 — NPC Select + Duel Simulator QA**: check readability on dark and light backgrounds and at actual device sizes.

STOP — human approval required.
