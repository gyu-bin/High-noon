# HIGH NOON — Body Differentiation Pass: generation briefs

2026-09-30 · `dev-2.0` · brief only. No generation, production replacement or pose work.

Input: Batch A+B review (`artifacts/character-redesign-batch-ab/BATCH_AB_REVIEW.md`), approved.
Problem: all 7 previous candidates shared one body template (hat mold, walking pose, belt/holster,
coat proportions, diamond-quilt material; aligned solid-core IoU 0.54–0.74).
This pass changes **BODY / SILHOUETTE**, not effects. Successful fantasy language is kept
(P04 spectral dissolve · NPC15 shadow dissolution · NPC19 void/starfield · NPC20 echo ·
NPC09 golden skull · NPC18 red eyes/oracle); NPC22 is fully redesigned.

## 1. Exact filenames (intake)

Save each candidate under **exactly** this name in `artifacts/character-redesign-body-pass/intake/`.
The review script identifies characters by filename only — never by attachment order.

| ID | Name | Filename |
| --- | --- | --- |
| P04 | 망령 사수 / Ghost Gunslinger | `P04_GHOST_GUNSLINGER.png` |
| NPC15 | 그림자 사냥꾼 / Shadow Hunter | `NPC15_SHADOW_HUNTER.png` |
| NPC19 | 보이드 워커 / Void Walker | `NPC19_VOID_WALKER.png` |
| NPC20 | 에코 팬텀 / Echo Phantom | `NPC20_ECHO_PHANTOM.png` |
| NPC09 | 황금 해골 / Golden Skull | `NPC09_GOLDEN_SKULL.png` |
| NPC18 | 레드 아이 오라클 / Red Eye Oracle | `NPC18_RED_EYE_ORACLE.png` |
| NPC22 | 창백한 기수 / Pale Rider | `NPC22_PALE_RIDER.png` |

## 2. File spec (all 7)

- Lossless **PNG**, RGBA, **true alpha** (background alpha = 0; no painted checkerboard, no matte).
- Canvas **≥ 1254×1254** (square preferred; never upscaled from a smaller render).
- One full-body figure; head top ≈2% below canvas top, feet ≈3% above bottom; nothing touches the canvas edge.
- Same camera for all 7: eye-level, front three-quarter, same framing scale.
- No background, no floor, no cast shadow, no text, no frame, no presentation board, no scene props.
- No red/orange extraction rim, no white halo, no black fringe at the alpha edge.
- Lossy WebP / JPEG are not accepted as masters.

## 3. Weapon rule (all 7)

TOTAL REVOLVERS PER CHARACTER ≤ 2. Allowed: **A** 1 in hand + 1 holstered · **B** 2 in hands + holsters
visibly empty · **C** 2 holstered · or a single revolver. **Forbidden:** 2 in hands + a third in a holster.
The chosen configuration becomes the official weapon identity for every later pose
(IDLE / DRAW / FIRE / HIT / KNEEL / FALL / DOWN).

## 4. Differentiation matrix (each character differs from all others on ≥3 body axes)

| ID | Hat / head | Shoulders / torso | Coat / cape | Stance / center of mass | Weapons |
| --- | --- | --- | --- | --- | --- |
| P04 | tall narrow crown, flat brim tilted down; deep hollow void face | narrow, tall (≈8.5 heads) | long **asymmetric** duster, lower hem floats **upward** | upright, weight on right leg; left leg dissolves below knee | **B** 2 in hands, holsters empty |
| NPC15 | wide soft brim drooping low; face fully black | **asymmetric**: one side swallowed by an oversized cloak | one-sided huge cloak, other side narrow/bare | **hunched, stalking**, torso forward, low center of mass, narrow lower body | **A** 1 in hand + 1 holstered |
| NPC19 | hat with a **missing chunk**, brim slightly detached | torso with **real missing sections** (negative space) | short rigid broken coat panels, minimal flowing cloth | **static, frontal, near-symmetrical**, feet together | **single** revolver in the disconnected arm |
| NPC20 | **small low-crown flat brim**; lean face | **slim, fast** frame | hip-length fitted jacket, no long duster | **mid-stride, leaning forward**, drawing motion | **A** 1 in hand + 1 holstered |
| NPC09 | **wide stiff brim**, gold band; golden skull head | **broadest**: gold bone-armored ribcage, heavy pauldrons | **short heavy** waist-length cape | **grounded, wide planted legs**, frontal | **C** 2 holstered (cross-draw) |
| NPC18 | **hood + wrapped scarf**, no cowboy hat; eyes on hood/scarf | tall, narrow, sloped shoulders | **layered ritual robes** to the ground, hanging talismans | still, frontal, feet hidden by robes | **single** revolver held low in robes |
| NPC22 | **tall pale hat**, pale veil/hair; face absent | **tallest, elongated** (≈9 heads), thin | very long **pale** coat/cape to the ground, flaring low | tall, still, slight backward lean; spurred riding boots | **single** long-barrel revolver at the side |

## 5. Material / palette

| ID | Material | Palette |
| --- | --- | --- |
| P04 | worn canvas duster, dull steel | charcoal + cold blue-white spectral |
| NPC15 | matte suede, soot cloth | soot near-black, achromatic; tiny pale eye points only |
| NPC19 | cracked leather panels | void black + limited deep violet/blue stars |
| NPC20 | smooth dark leather | dark brown/black + desaturated ghost gray-blue echoes |
| NPC09 | bone + gold-trimmed leather | black + worn (not shiny) gold |
| NPC18 | woven linen/wool robes, parchment talismans | black + dark crimson + parchment; red eyes as focal point |
| NPC22 | bleached dusty linen, bone clasp/grip | **ash / bone-white dominant** + minimal black |

No shared diamond-quilt material across characters.

## 6. Common prompt header (paste before every character block)

```
Full-body character identity master for a dark western duel game "HIGH NOON".
Single figure, front three-quarter, eye-level camera, feet fully visible, head top ~2% below the canvas top,
feet ~3% above the canvas bottom. Transparent background (true alpha), no floor, no cast shadow, no text,
no frame, no props behind the character. Lossless PNG, at least 1254x1254.
Painterly-realistic dark fantasy western rendering, crisp edges, no colored rim light at the alpha edge.
Supernatural effects may be baked in, but the BODY SILHOUETTE must stay readable when the effects are removed.
Do NOT use a generic walking cowboy template. Maximum two revolvers in total.
```

## 7. Character briefs

### P04 — Ghost Gunslinger → `P04_GHOST_GUNSLINGER.png`
```
A tall, narrow spectral gunslinger. Tall narrow hat crown, flat brim tilted down over a deep hollow void face.
Long asymmetrical duster whose lower hem floats upward against gravity and dissolves into cold blue-white
spectral mist. The torso stays a clear western gunslinger (vest, gun belt). Upright stance, weight on the right
leg; the left leg partially dissolves below the knee. Twin revolvers, one in each hand, held low; both holsters
visibly EMPTY. Palette: charcoal + cold blue-white.
```
Forbidden: afterimages, duplicate figures/hats (NPC20 territory), third revolver, black shadow wisps (NPC15), stars.

### NPC15 — Shadow Hunter → `NPC15_SHADOW_HUNTER.png`
```
A hunched, stalking hunter half-swallowed by living shadow. Wide soft hat brim drooping low; the face is almost
completely black with two tiny pale eye points. Strongly asymmetric shoulders: one side is an oversized black
cloak dissolving into shadow; the other side is narrow and bare. Torso leans forward, low center of mass,
narrow lower body. One revolver held low in the visible hand, one holstered. Palette: soot near-black, achromatic.
```
Forbidden: blue/white spectral glow (P04), stars/void holes (NPC19), upright walking pose, symmetrical cloak.

### NPC19 — Void Walker → `NPC19_VOID_WALKER.png`
```
A static, frontal, almost symmetrical figure whose body is literally broken by the void. Real missing torso and
coat sections (transparent negative space), with a starfield visible inside the remaining edges. One arm is
partially disconnected, floating with a gap at the shoulder, holding a single revolver. The hat has a chunk cut
out by the void and the brim floats slightly detached. Short rigid broken coat panels, minimal flowing cloth.
Feet close together. Palette: void black + limited deep violet/blue stars. Only one revolver in total.
```
Forbidden: long flowing cloth, glow-only cowboy, identity carried by color alone, giant external portal.

### NPC20 — Echo Phantom → `NPC20_ECHO_PHANTOM.png`
```
A slim, fast gunslinger caught mid-draw, leaning forward in mid-stride. Small low-crown flat-brim hat,
hip-length fitted jacket (no long duster). One revolver being drawn; 2-3 faint semi-transparent echoes of the arm,
hat brim and jacket hem trail slightly behind, following the body's motion. The main body is fully opaque and
clearly dominant. One holstered revolver on the other hip. Palette: dark leather + desaturated ghost gray-blue echoes.
```
Forbidden: giant spectral cloud, full-body duplicate figures standing apart, echoes stronger than the main body,
extra physical guns, long duster.

### NPC09 — Golden Skull → `NPC09_GOLDEN_SKULL.png`
```
A heavy boss gunslinger with an unmistakable golden skull head under a wide stiff-brimmed hat with a gold band.
Broadest shoulders in the cast: a bone/armored ribcage chest plated in worn gold, heavy pauldrons.
Short heavy waist-length cape. Grounded frontal stance, legs planted wide. Two revolvers holstered in a
cross-draw rig, hands empty near the belt. Palette: black + worn gold.
```
Forbidden: floating spectral cloth, long ghost duster, red eyes (NPC18), pale/bone-white palette (NPC22),
walking pose, guns in hands.

### NPC18 — Red Eye Oracle → `NPC18_RED_EYE_ORACLE.png`
```
A tall, narrow prophet: ORACLE first, gunslinger second. Hood and wrapped scarf instead of a cowboy hat.
Multiple red eyes integrated into the hood, scarf and robes. Layered ritual robes reaching the ground, hanging
talismans and parchment strips. Still, frontal stance, feet hidden by the robes. One revolver held low, partly
hidden in the robe. Palette: black + dark crimson + parchment.
```
Forbidden: skulls (NPC09), large crosses (old NPC22 overlap), cowboy duster as the main shape, halo spikes that
touch the canvas edge.

### NPC22 — Pale Rider (full redesign) → `NPC22_PALE_RIDER.png`
```
The hidden final boss: a PALE RIDER of an apocalyptic western. Elongated, the tallest silhouette in the cast.
Ash/bone-white dominant palette with minimal black accents. Tall pale hat, long pale veil or hair; the face is
absent, a bone-gray void. Very long pale coat/cape reaching the ground and flaring low, dusty bleached linen.
Spurred riding boots, riding gloves; restrained bone motif (one bone clasp, bone revolver grip).
Still, slight backward lean. One long-barrel revolver hanging at the side.
```
Forbidden: lanterns, crosses, ravens, graveyard props, skull face (NPC09), blue spectral glow (P04),
brown/black-dominant palette, background structures.

## 8. Review (after all 7 files arrive)

```
python artifacts/character-redesign-body-pass/review_body_pass.py
```
(needs Pillow + numpy). The script refuses to run unless all 7 exact filenames exist, never touches production,
and writes to `artifacts/character-redesign-body-pass/review/`:

- `file_checks.json` — PNG/RGBA, true alpha, canvas ≥1254, edge cropping, white/black/red-orange fringe, sharpness
- `A_lineup_{dark,light}.png`
- `B_silhouette.png` — full alpha and solid core
- `C_select256_{dark,light}.png`
- `D_duel_160_200_241_{dark,light}.png`
- `E_body_overlap.png` + `body_overlap_iou.json` — solid cores aligned by body height
- `F_effects_toned_down_{dark,light}.png` — partial-alpha/high-saturation glow suppressed, desaturated
  (pass condition: all 7 still recognizable)
