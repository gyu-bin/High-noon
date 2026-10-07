# Over-shoulder player art per duel stage: generation brief (2026-10-06)

## Why
The duel foreground is currently two unrelated images: one static rear-view body (`over-shoulder/player_0X.png`)
and a separate first-person gun arm. The body never changes between READY / STEADY / BANG and does not face the
opponent, and the arm does not belong to the body. Rotating or mirroring cannot fix that.
New art: one image per stage with the **body, arm and revolver painted together**.

## Stages (what the runtime shows)
| Stage | Signal | Pose |
| --- | --- | --- |
| `ready` | READY | Standing, back to camera, head turned toward the opponent, gun hand low at the hip (gun still holstered or just gripped) |
| `aim` | STEADY / fake | Gun drawn and raised, arm extended toward the opponent, barrel pointing at the opponent |
| `fire` | BANG (player shot) | Same as aim with recoil: barrel kicked up slightly, shoulder pushed back. No muzzle flash (the game adds it) |

Optional later: `hit` (flinch, gun dipping). The current code animates this by moving the image, so it is not required.

## Composition (identical for every image)
- Canvas **1024x1536**, transparent PNG, true alpha, no background, no floor, no text.
- Camera behind the character's right shoulder, slightly above. Rear three-quarter view.
- The character fills the **lower-right** of the canvas: hat top near y=400, body running off the bottom and right edges.
- The **opponent stands up-left of the character** (toward the canvas top-left, around x=350, y=250). Head, shoulders,
  arm and barrel all point there.
- The gun arm is the character's own arm, continuous from the shoulder. In `aim`/`fire` the hand and revolver reach
  to about x=250..450, y=700..900 (left of the torso), with the barrel pointing up-left at the opponent.
- No outline, no orange/red rim light, no glow around the edges.
- Same scale, same hat position and same shoulder line in all three stages of a character, so swapping images does not jump.

## Characters (attach that character's production idle as the ONLY identity reference)
| ID | Reference | Notes |
| --- | --- | --- |
| P01 무명의 총잡이 | `assets/images/characters/clarity/player/01/idle.png` | brown duster, red bandana, 1 revolver |
| P02 철의 보안관 | `assets/images/characters/clarity/player/02-v2/idle.png` | sheriff star on hat/chest, blue scarf, 1 revolver |
| P03 붉은 로사 | `assets/images/characters/clarity/player/03/idle.png` | long red hair, 1 revolver |
| P04 망령 사수 | `assets/images/characters/clarity/player/04-v2/idle.png` | void face, star-band hat, jagged cloak, electric-blue mist. Dual revolvers: aim with the near gun, the other held low |

## Prompt (replace [CHARACTER] and [STAGE POSE]; one image per request, new chat per image)
```
Use the attached image as the ONLY identity reference: HIGH NOON [CHARACTER]. Keep the same hat, hair, clothes,
colours, materials and revolver design.
Over-the-shoulder duel view: camera behind the character's right shoulder, rear three-quarter view. The character
fills the lower-right of a 1024x1536 canvas (hat top near y=400), body running off the bottom and right edges.
An unseen opponent stands up-left, toward the top-left of the canvas; the character's head is turned toward him.
[STAGE POSE]
The arm is the character's own arm, continuous from the shoulder. Transparent background, true alpha, no floor,
no text, single figure, no outline, no orange or red rim light, no glow on the edges, no muzzle flash.
```
- READY: `Standing ready, gun hand low at the hip gripping the holstered revolver, shoulders squared toward the opponent.`
- AIM: `Revolver drawn, right arm extended up-left toward the opponent, barrel pointing at the opponent, steady.`
- FIRE: `Same aiming pose at the instant of firing: barrel kicked up a few degrees, shoulder pushed back by recoil.`

## Files (12)
Save to `artifacts/over-shoulder-fix/intake/` as `P01_READY.png`, `P01_AIM.png`, `P01_FIRE.png`, … `P04_FIRE.png`.

## Code work once the art arrives
- Register `V3_PLAYER_OVER_SHOULDER[id] = { ready, aim, fire }` and switch by signal phase.
- In portrait, stop drawing the separate first-person gun arm when the stage art exists; anchor the muzzle flash to
  a per-character barrel-tip point.
- Keep the current body + rotated arm as the fallback until all three stages of a character are in.
