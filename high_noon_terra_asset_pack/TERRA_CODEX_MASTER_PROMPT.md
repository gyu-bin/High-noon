# HIGH NOON — TERRA / CODEX MASTER PROMPT

Generate every production image asset from `asset_manifest.json` and save it at the exact `path`.

`references/high_noon_master_reference.png` is ART DIRECTION ONLY.
Do not crop assets out of the board. Do not bake any UI text into image assets.

## Character consistency is mandatory
For each character, create the portrait/idle identity first. Once accepted, use that exact generated image as the reference for aim/shoot/defeat. Face, hat, coat, body shape, color palette, revolver and accessories must stay consistent.

For the player, generate `player_idle.png` first and use it as the identity source for draw/fire/hit/down.

FIRE:
- realistic quick-draw shooting pose
- revolver points toward opponent around waist/chest level
- never point the gun upward
- no extra revolver
- no muzzle flash baked into the character; layer the separate FX asset

DOWN:
- natural western hit/fall
- knees buckle or torso loses balance
- non-gory
- not a deformed corpse pose

## Transparency
Character poses, weapons, effects and icons must be true transparent PNGs where requested.
If the generator cannot directly make clean alpha, use a chroma-key generation/removal step and inspect the edges.

## Background rules
Backgrounds contain no characters, no foreground revolver and no UI text. Leave a clear duel lane for runtime layering.

## Never bake these into images
READY / STEADY / BANG / names / hearts / reaction times / buttons / stats / localization.
React Native renders all of them.

## Existing sound
Do not generate or replace any sound. Keep current repository audio exactly as-is.

## Existing NPC abilities
Do not redesign gameplay rules. Preserve:
#13 mirror
#14 thunderbolt
#15 blindBang
#16 screenShakeLight
#17 screenShakeMedium
#18 screenShakeHeavy
#19 invertedSignals
#20 echoReady
#21 chaosRandom
#22 paleSilence

## Recommended generation order
1. backgrounds and UI textures
2. player idle identity
3. player draw/fire/hit/down using player idle reference
4. NPC 01–06
5. NPC 07–12
6. NPC 13–18
7. NPC 19–22
8. first-person weapon assets
9. FX
10. skill icons

For every NPC:
portrait or idle -> visually inspect -> use accepted identity as reference -> aim -> shoot -> defeat.

Do not continue with a broken identity, bad hands, extra guns, malformed revolvers, baked text, or bad transparency.

Maintain `asset_generation_report.md` with:
- generated
- regenerated
- failed
- needs human review
- exact output path

Do not create placeholder files.
