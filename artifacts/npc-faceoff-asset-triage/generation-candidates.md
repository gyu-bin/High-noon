# Minimal face-off asset candidates

Five conditional candidates: **P02_FIRE, P03_FIRE, NPC15_DRAW, NPC19_DRAW, NPC22_DRAW**. This document requests no execution: no art, code, flip, position, scale, timing or gameplay was changed. No images were generated. The current production files remain the references, not replacement targets for this audit.

The parent observed all 22 NPCs in continuous actual iPhone production rounds at normal speed (`actual-roster-1x.mp4`, approximately 800.83 seconds). Those observations, combined with the source inspection, support this conservative five-pose list. This subagent has not independently reviewed that continuous recording. No actual player victory or completed lethal-defeat validation is claimed here; automation verification remains with the parent.

## Candidate boundaries and exact references

| Candidate | Exact current production pose | Canvas | Preserve current source axis / runtime flip | Persistent problem and minimal intended correction |
| --- | --- | --- | --- | --- |
| P02_FIRE | `assets/images/characters/clarity/player/02-v2/fire.png` | 1254×1254 | Source LEFT, runtime flipped to RIGHT | Parent observed face/body toward player's own left during the held STEADY pose while barrel aims right. Keep clean waist/torso aim, turn body and recognizable face coherently toward the barrel. No baked muzzle flash or gun smoke: this pose is also an aim hold. |
| P03_FIRE | `assets/images/characters/clarity/player/03/fire.png` | 1254×1254 | Source LEFT, runtime flipped to RIGHT | Parent observed the same persistent face/body-versus-barrel conflict during STEADY. Keep the female production identity and clean waist/torso aim; align body/head/gaze with the barrel. No baked muzzle flash or gun smoke. |
| NPC15_DRAW | `assets/images/characters/clarity/npc/15-v2/draw.png` | 1624×1624 | Source RIGHT, runtime flipped to LEFT | Current held DRAW aims downward. Existing FIRE has painted muzzle smoke, so it cannot supply a clean hold. Raise existing weapon to an opponent-facing waist/torso aim, body/head following the same axis. Preserve identity shadow wisps; do not add shot smoke at the barrel. |
| NPC19_DRAW | `assets/images/characters/clarity/npc/19-v2/draw.png` | 1682×1682 | Source LEFT, runtime unflipped | Current held DRAW aims downward. Existing FIRE has painted flash. Raise barrel toward opponent waist/torso; preserve cosmic eye, cloak voids and fragments. Aim hold has no flash or gun smoke. |
| NPC22_DRAW | `assets/images/characters/clarity/npc/22-v2/draw.png` | 1684×1684 | Source LEFT, runtime unflipped | Parent observed gun upward before the existing blackout. Existing FIRE has painted flash. Lower raised weapon to opponent-facing waist/torso aim, retaining the horse/cape silhouette and masked identity. Aim hold has no flash or gun smoke. |

Source axes above preserve the current `faceoffStandingArt` direction metadata. They are not authorization to alter flip logic. In particular, NPC15 DRAW is currently source-right and mirrored at runtime: a source-left replacement would point outward under the unchanged mapping. P02 and P03 must remain source-left before their player flip.

## Identity locks

All five are registered in `constants/clarityCharacterAssets.ts`. Reference each complete current five-pose directory, especially its `idle.png`, for identity. Never substitute legacy `characters/player/XX`, old `clarity/player/02`, old redesign `clarity/npc/XX`, poster art, or another character's pose.

- **P02:** `clarity/player/02-v2/{idle,draw,fire,hit,down}.png`. Sheriff with current brown hat and star emblem, beard/face, brown-grey leather coat, pale waistcoat, blue neck scarf, chest badge, belt/holster and silver revolver. Preserve mature male anatomy, body proportions, brown/cream/blue palette and normal 1254 canvas. Do not restore the old red-bandana P02 identity.
- **P03:** `clarity/player/03/{idle,draw,fire,hit,down}.png`. Current long-haired female gunslinger, brown hat, red lower-face scarf, fitted brown leather coat/waistcoat, pale shirt neckline, belt buckle, holster and silver revolver. Preserve hair, female face/anatomy and coat length. Folder has no `-v2` suffix.
- **NPC15:** `clarity/npc/15-v2/{idle,draw,fire,hit,down}.png`, plus existing `combat/npc/15/{fall,down}.png` for whole-set consistency. Ragged black hat/coat, featureless shadow face with paired white eyes, wrapped neck, dark belt and boots, surrounding black shadow wisps. `REDESIGN_ART_META`: expanded canvas 1624; shared production-frame ground 1185; centered 1254-frame pad 185, equivalent raw ground 1370. Keep identity wisps, canvas expansion, body scale and feet.
- **NPC19:** `clarity/npc/19-v2/{idle,draw,fire,hit,down}.png`, plus `combat/npc/19/{fall,down}.png`. Hat with circular motif, violet circular eye, fragmented cosmic void body/coat, violet star texture, floating dark fragments, brown belt/boots and current revolver. Expanded canvas 1682; production-frame ground 1211; centered pad 214, equivalent raw ground 1425. Retain intentional fragments and transparency rather than filling cloak voids.
- **NPC22:** `clarity/npc/22-v2/{idle,draw,fire,hit,down}.png`, plus `combat/npc/22/{fall,down}.png`. Pale flat-brim hat, long white hair, featureless black face, cross details, white perforated lace/cape, ghost horse head and mane behind the actor, pale boots and existing long-barrel weapon. Expanded canvas 1684; production-frame ground 1231; centered pad 215, equivalent raw ground 1446. Preserve the horse/cape extent and white identity; do not create a solid unrelated white coat or remove the horse.

Ground figures for expanded NPCs describe the existing centered-production-frame convention, not an instruction to reposition actors. P02/P03 ground conventions and current lane origins remain unchanged. Aim correction should preserve existing foot placement, nominal body scale and canvas; body/arm/head turn should not rotate the entire sprite, crop the actor or move the camera.

## Excluded from generation

- **NPC02–08, NPC10–14, NPC16–17, NPC21:** all held DRAW frames aim down, but existing current FIRE is clean, source-left, approximately horizontal waist/abdomen aim. They therefore have a future presentation selection gap, not demonstrated need for new images. Code stays unchanged in this triage.
- **NPC02/NPC06/NPC11 and crow-mask NPC03:** parent noticed source-side head angles in actual shots, but the small, short-lived 1× appearance is not yet a clear blocker. Keep as review notes, not generation candidates. Source enlargement alone is insufficient reason to regenerate them.
- **NPC09/NPC18/NPC20:** parent normal-speed 1× observation found inward torso aim satisfactory. Frontal/masked faces are minor and acceptable in that evidence; do not regenerate for ambiguous source gaze. NPC20 already has a clean aiming DRAW despite baked flash in FIRE.
- **P01/NPC01:** existing transparent coherent face-off cutouts solve aiming without new art.
- **P04:** no additional clear normal-speed 1× blocker was supplied for this five-pose list. Preserve its current 04-v2 identity and pose set.

## Acceptance after any later authorized asset work

Native normal-speed held STEADY must visibly aim toward the opponent at waist/torso height. Body/head/barrel should read coherently inward, with ambiguity assessed at actual 1×. Hold frames have no shot flash, barrel smoke or recoil; actual shooting may activate the existing runtime VFX. Existing transparent identity, feet/ground, body size, canvas, full silhouette, signal breathing room and non-overlap must be preserved. The parent must verify actual round/defeat behavior; static source review does not certify it.
