# Five-pose targeted constraints

Text-only Technical Artist review. Scope: P02_FIRE, P03_FIRE, NPC15_DRAW, NPC19_DRAW, NPC22_DRAW. No production files or image pixels changed; generation belongs to the parent. No other character or pose is included. NPC generation must receive its current production **idle image only** as image reference, as explicitly requested by the user. Do not attach NPC DRAW/FIRE/HIT/DOWN or dedicated combat art to those three generation calls.

## Geometry and source-facing contract

The intended display is PLAYER LEFT aiming RIGHT; NPC RIGHT aiming LEFT. Preserve current source axes below so the current presentation flips produce that result. These are source image directions, not screen directions.

| Candidate | Current target | Required coherent SOURCE direction | Existing runtime flip | Exact current reference canvas | Ground convention |
| --- | --- | --- | --- | --- | --- |
| P02_FIRE | `assets/images/characters/clarity/player/02-v2/fire.png` | LEFT: body, head/gaze and held barrel together | yes, resulting RIGHT | 1254×1254 | nominal frame ground 1221; current FIRE alpha>20 bottom 1223 |
| P03_FIRE | `assets/images/characters/clarity/player/03/fire.png` | LEFT: body, head/gaze and held barrel together | yes, resulting RIGHT | 1254×1254 | nominal frame ground 1214; current FIRE alpha>20 bottom 1218 |
| NPC15_DRAW | `assets/images/characters/clarity/npc/15-v2/draw.png` | RIGHT: body, white-eye/hood axis and held barrel together | yes, resulting LEFT | 1624×1624 | centered 1254 frame with pad185; nominal raw ground1370 (frame1185); idle alpha>20 bottom1374 |
| NPC19_DRAW | `assets/images/characters/clarity/npc/19-v2/draw.png` | LEFT: body, cosmic eye/hood axis and held barrel together | no | 1682×1682 | centered 1254 frame with pad214; nominal raw ground1425 (frame1211); idle alpha>20 bottom1445 |
| NPC22_DRAW | `assets/images/characters/clarity/npc/22-v2/draw.png` | LEFT: body, featureless masked head/hood axis and held barrel together | no | 1684×1684 | centered 1254 frame with pad215; nominal raw ground1446 (frame1231); idle alpha>20 bottom1449 |

Keep existing nominal body height, leg length, boot centers and visible sole line. The nominal metadata ground and measured alpha extent are different measurements; do not move an actor to make both numbers artificially identical. The NPC expanded canvas surrounds a centered1254 gameplay frame. Preserve body scale within that frame; do not fit the entire smoke/cape/horse silhouette to1254 and shrink the body. Body facing is a three-quarter anatomical turn, not whole-image rotation, perspective/depth exaggeration or a side-on giant foreground crop.

Aim toward opponent waist/abdomen/torso at approximately horizontal pitch. Small pitch is acceptable; obvious ground aim beside the actor's boots and upward sky aim are not. Do not insist on a chest-high straight-arm pose if a coherent natural waist aim already reads correctly.

Every pose is a quiet held aim, not the instant of shooting: no muzzle flash, barrel gun smoke, flying cartridge, recoil or explosive lighting. P02/P03 FIRE will also be held during STEADY, so their slot name does not justify baked shot effects. Shot effects remain runtime effects at actual firing. Preserve unrelated identity auras, wisps, cosmic particles and the horse.

## Identity and weapon count

### P02_FIRE

Current player identity reference: `assets/images/characters/clarity/player/02-v2/idle.png`; existing target FIRE defines current weapon/style/framing if the parent includes it. Mature bearded male sheriff, current brown leather hat with star, blue neck scarf, pale shirt/waistcoat, dark brown-grey duster, chest sheriff badge, leather belt and side holster, brown trousers/boots. Keep the face, age, beard, anatomy and brown/cream/blue palette. **One held silver revolver**, same production weapon style; an empty holster is clothing, not an additional gun. Do not revert to the older red-bandana P02 or a P01 face. Turn recognizable face and torso LEFT with the barrel; no looking right over the firing arm.

### P03_FIRE

Current reference: `assets/images/characters/clarity/player/03/idle.png`; existing target FIRE defines current weapon/style/framing if included. Current long-haired female gunslinger, brown hat, red lower-face scarf, fitted brown coat/waistcoat, pale shirt neckline, belt buckle, side holster and brown boots. Preserve female anatomy, face, long hair, coat silhouette and red/brown palette. **One held silver revolver**, same production style. Turn chest, head/nose/gaze and barrel LEFT together while retaining nominal body size and ground. Do not add a second gun or substitute the old small orange-rim sprite.

### NPC15_DRAW — IDLE ONLY image reference

Attach only `assets/images/characters/clarity/npc/15-v2/idle.png`.

Preserve ragged charcoal/black hat with current ornamental band, featureless black void face and paired small white eyes, layered dark neck wrap, shredded black duster/poncho, metallic shoulder ornament/chain, bandolier-like belt cartridges, dark leather pants, decorated boots, and surrounding curling black shadow wisps. Keep the existing silhouette/material detail and contrast; do not make a normal visible human face or replace eyes with a purple ring. **Exactly one held current long-barrel revolver** and existing hip holster. Raise that same weapon to coherent source-RIGHT waist/torso aim. Head/eyes and chest turn right with it. Keep the opposite hand natural and empty. The shadow aura may remain, but no smoke emerging from the muzzle.

### NPC19_DRAW — IDLE ONLY image reference

Attach only `assets/images/characters/clarity/npc/19-v2/idle.png`.

Preserve dark brown hat with current circular star/pentagram-like emblem and torn cosmic opening, single bright violet ring eye in featureless starry void face, scarf/collar, torn dark coat with purple star-filled void regions, detached floating cloak fragments, diagonal leather strap, brown belt/holster, boots and metal buckles. Keep intentional void/star material and fragmentation; do not turn the character into a solid ordinary purple-coated man or add a human mouth/nose. **Exactly one held current long-barrel revolver**, opposite hand empty. Raise existing weapon to source-LEFT waist/torso aim; orient torso and eye/head shape to read left without erasing the circular eye identity. Quiet hold, no bright muzzle spark/flash.

### NPC22_DRAW — IDLE ONLY image reference

Attach only `assets/images/characters/clarity/npc/22-v2/idle.png`.

Preserve flat-brim pale hat with tangled crown/thorn-like trim, dangling cross, long white hair, featureless black face, white wrap/coat with cross details, skull-like belt buckle, pale perforated lace/cape layers and boots. Retain the ghost horse head and flowing mane behind the same single humanoid. The horse is existing identity art, not an extra duelist; preserve its translucent detail and broad extent. **Exactly one held current long-barrel revolver**, existing holster, no second gun or extra arm. Change the held barrel from skyward to source-LEFT waist/torso aim. Head/upper-body silhouette should also read left; do not paint new human facial features into the void. Quiet hold with no muzzle flash/smoke.

## Alpha, staging and acceptance

Full-body transparent cutout, clean natural alpha. No scene background, grey/black matte, ground disk, artificial outline, new orange cinematic rim, text or logos. Do not clip hat, boots, gun tip, shadow wisps, cosmic fragments, cape or horse at canvas edges. Keep source native detail and approved color/material style. The expanded NPC canvas is intentional; do not trim it to the opaque bounding box.

Independent source acceptance after generation will check identity against the allowed reference, one held weapon, coherent required source-facing axis, waist/torso aim, quiet muzzle, transparency, full silhouette, canvas/nominal body size and foot line. Independent native1× validation must then check held STEADY, actual firing with runtime VFX, clipping, signal/actor overlap and ground consistency. Source acceptance alone is not a gameplay or victory/defeat PASS.
