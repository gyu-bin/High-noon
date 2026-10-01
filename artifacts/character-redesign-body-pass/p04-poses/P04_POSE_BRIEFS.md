# HIGH NOON — PHASE 3A: P04 Ghost Gunslinger combat pose briefs

2026-10-01 · `dev-2.0` · brief only. No live mapping change. Pose images are generated outside this repo, as in the identity passes.

## 1. Runtime states actually used by P04 (verified in code)
P04 is a player. Every P04 body render goes through `PlayerCharacterSprite`:
- the ranked/ghost opponent in `NpcFirstPersonDuelArena`;
- `DuelArenaLayout`;
- `LocalDuelArenaLayout`;
- `CharacterSelectCard`.

The sprite reads `CLARITY_PLAYERS[4]` via `constants/spriteAssets.ts`.

| Runtime pose | Clarity file | When / timing |
| --- | --- | --- |
| `idle` | `idle.png` | Default; also RECOVER after a non-final hit |
| `aim` | `draw.png` | Before BANG; crossfade 36 ms |
| `shoot` | `fire.png` | On fire; shoot crossfade 120 ms, kick 70 + 180 ms; runtime muzzle flash at barrel x = 0.22 of the box when flipped |
| `defeat` | `hit.png` | Non-final hit: frame held, then back to idle (`defeatSettlesDown=false`). Final: crossfade 280 ms, topple motion 1100 ms |
| (final) | `down.png` | Swapped in at max(36, 1100 × 0.44) = **484 ms** after defeat (220 ms crossfade). The existing art is a **KNEEL** (see `constants/combatPoses.ts` header) |

**Not used by players:** NPC-only `kneel`/`fall`/`down` stages (`NPC_COMBAT_POSES`, `npcPoseForStage`), and player first-person stages (`impact`, `loseGrip`, `collapse`, `groundPov`), which are camera/hand presentation with no body sprite.

So P04 needs **4 new files**: `draw`, `fire`, `hit`, and `down` (= KNEEL art). A separate FALL and a lying DOWN have no runtime slot and are **not produced** (§2 of the task: do not add unused states).
To add them later, the player sprite needs new stages first; that is a code decision.

## 2. Weapon logic (locked idle already holds both guns)
The locked idle shows **two revolvers in hand and empty holsters**. A holster-draw sequence would contradict it, so DRAW raises the guns already in hand:

| Pose | Weapons |
| --- | --- |
| idle | 2 in hands, held low; holsters empty |
| draw | 2 in hands, rising toward aim; holsters empty |
| fire | 2 in hands, aimed; holsters empty |
| hit | 2 in hands, control loosening, but both still held; holsters empty |
| down (KNEEL) | 1–2 still in hand, or 1 in hand + 1 on the ground next to the knee; **never** holstered; total 2 |

## 3. Canvas and scale lock
- **Reference:** `artifacts/character-redesign-body-pass/intake/P04_GHOST_GUNSLINGER.png` (the locked 1254² source, not the normalized one).
- **Generate:** 1254×1254 RGBA, true alpha, **the same camera, framing and body scale as that reference**. Hat brim width ≈ the reference's (≈250 px). Boot soles on y ≈ 1242 (the same ground). Body centre x ≈ 750, no horizontal drift.
- **Normalize:** `build_p04_poses.py` applies the **identical** transform as the idle (uniform 0.9844, the same translation, the same 1446² canvas, frameGroundY 1211). Per-pose scale is only corrected (downscale only) if the generated hat brim width differs by more than 3%.
- **Facing and fire direction:** the guns aim to the **image left**, like the old P04 fire; the runtime mirrors the sprite per corner. Keep the muzzle near the left 20–25% of the canvas so the runtime flash anchor still works. The flash anchor must be re-derived for the 1446 canvas at integration.

## 4. Common prompt header (attach the reference PNG every time)
```
Use the attached image as the exact identity reference: HIGH NOON "Ghost Gunslinger".
Keep EXACTLY: the same hat, hollow void face with blue cracks, scarf, asymmetric tattered duster,
belt and empty holsters, boots, the same two revolvers, the same diamond-quilt materials, the same
charcoal + cold blue-white spectral palette, and the same body proportions and scale.
Same camera, same framing, same canvas 1254x1254, boots on the same ground line as the reference.
Transparent background (true alpha), no floor, no shadow, no text. Lossless PNG.
Two revolvers in total; no extra gun anywhere. No blood, no gore, no new ornaments,
no face, no large magic blast. Blue-white mist stays secondary to the body.
```

## 5. Per-pose prompts
### DRAW → save as `P04_DRAW.png`
```
The same character raising both revolvers from the low idle position toward aim, mid-motion.
Torso upright, weight centred, both arms bent at the elbow with the guns at belt-to-chest height,
pointing toward image left. The coat reacts slightly. The spectral right-leg dissolve stays as in
the reference. Not an exaggerated action pose: this frame must sit between idle and fire.
```
### FIRE → `P04_FIRE.png`
```
The same character firing both revolvers toward image left, arms extended at shoulder height,
controlled recoil: shoulders pushed back slightly, the guns tipping up a few degrees.
Only a tiny muzzle spark at most (the game adds the flash). The coat and spectral mist react slightly.
No spellcasting pose.
```
### HIT → `P04_HIT.png` (non-final, must be able to RECOVER)
```
The same character struck but still standing: torso recoils back, one shoulder twists back,
head turned slightly away, both revolvers still in hand but lowered and off-aim, knees slightly bent.
Both feet on the ground. Not kneeling, not falling. No blood.
```
### DOWN slot = KNEEL → `P04_KNEEL.png`
```
The same character collapsing to one knee (the first big break of a final defeat): one knee on the ground,
the other foot planted, upper body still partly upright but sagging forward, head dropping,
one revolver slipping from the hand toward the ground (still two guns visible in total),
the spectral lower body destabilising into mist. Clearly different from HIT. No blood.
```

## 6. Intake and review
Put the 4 PNGs in `p04-poses/intake/` with the exact names above, then run:
```
python3 artifacts/character-redesign-body-pass/p04-poses/build_p04_poses.py
```
The script:
- **Checks:** refuses to run if a file is missing; checks PNG/RGBA/alpha/size/edge contact/fringe.
- **Normalizes:** applies the idle transform (downscale-only correction) and writes the result to `assets/images/characters/staged/redesign-v2/player/04/{draw,fire,hit,down}.png`. It verifies production hashes before and after.
- **Contact sheets:**
  - A: IDLE→DRAW→FIRE
  - B: IDLE→HIT→IDLE (recover)
  - C: HIT→KNEEL (down slot)
  - D: silhouettes
  - E: 160/200/241 duel size
  - F: dark background
- **Continuity:** a table of head/belt/ground/hat-scale per transition.
