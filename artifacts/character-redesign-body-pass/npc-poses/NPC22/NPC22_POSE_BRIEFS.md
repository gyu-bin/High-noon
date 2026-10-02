# PHASE 3B-6: NPC22 Pale Rider combat pose briefs

2026-10-01 · `dev-2.0` · preparation only. No generation, no live mapping change.

## 1. Runtime states (verified in code)
NPC22 uses the same NPC duel path: `NpcFirstPersonDuelArena` → `npcRenderPose` → `CLARITY_NPCS[22]` / `NPC_COMBAT_POSES[22]`.
- **States:** idle / draw / fire / hit(+stagger) / kneel (clarity `down`) / fall* / down* (*registered at integration).
- **Timing:** survive: hit 0 → stagger 180 → recover 440 ms. Final: hit 0 → stagger 200 → kneel 420 → fall 720 → down 1000.
- **Fire direction:** image-left (runtime muzzle flash at the left of the NPC box).
- **NPC22 specifics:**
  - Always the night duel background.
  - The ability `paleSilence` changes timing params (`npcDuelParams`) and adds a full-screen **blackout dim** (`paleDim`) that fades in during STEADY (`app/game/npc.tsx`). The sprite sits under a darkening overlay, so the pale palette must stay readable when dimmed.
  - No extra character art states.

```
NPC22_RUNTIME_STATES=idle, draw, fire, hit(+stagger), kneel(clarity down), fall*, down*
POSES_TO_GENERATE=DRAW, FIRE, HIT, KNEEL, FALL, DOWN (6; IDLE = locked master)
```

## 2. Reference and weapon lock
- **REFERENCE_IDLE** = `artifacts/character-redesign-body-pass/intake/NPC22_PALE_RIDER.png` (round-2 lock, sha d1ad2acb1223, the same file PHASE 1 normalized). It is the only attachment, in a new chat per pose.
- **WEAPON_CONFIG** = **1 long-barrel revolver total**, held low in the image-right hand in the idle. The tall tube holster on the hip stays **empty**. The other hand is an open bone-pale claw.

| Pose | Weapon |
| --- | --- |
| DRAW | the long-barrel gun rising, swinging toward image-left, elbow bent |
| FIRE | aimed image-left at hip–chest height, arm extended, slow and deliberate |
| HIT | still GRIPPED, knocked off-aim |
| KNEEL | lowered, barrel resting toward the ground |
| FALL | slipping from the hand, visible |
| DOWN | on the ground beside the hand |

## 3. Identity checklist (compare every pose to the idle)
- **Palette:** pale / ash / bone-white dominant from hat to boots. Cold, desaturated; minimal dark only in the deep folds.
- **Hat and face:** wide pale torn-brim hat with a thorn/crown band and a hanging cross charm. **No face**: a dark empty void under the brim with long pale hair/veil strands.
- **Body:** long, thin, elongated; pale wrapped/quilted coat, trousers and boots with bone-coloured buckles and star spurs; skull belt buckle (small, as in the reference).
- **Cape:** huge tattered pale veil/cape trailing to image-left, cobweb-like.
- **Horse skull:** the **spectral pale horse skull** emerging from the cape at the upper image-left. A restrained rider motif; keep it in every standing pose.
- **Forbidden:** black smoke (NPC15), blue glow (P04), stars/purple (NPC19), afterimage duplicates (NPC20), red eyes/halo (NPC18), gold skull/ribs (NPC09), lanterns, ravens, graveyard crosses, a dark cowboy body, a 2nd gun, blood.

## 4. Common prompt header (attach only the idle; new chat per pose)
```
Use the attached NPC22_PALE_RIDER image as the ONLY visual reference. Create ONLY the [POSE] pose of this exact character.
IDENTITY MUST REMAIN IDENTICAL: pale ash / bone-white from hat to boots, cold and desaturated; the same wide torn-brim
pale hat with the thorn crown band and hanging cross charm; NO face, only a dark empty void under the brim with long
pale hair and veil strands; the same long, thin, elongated body in pale wrapped coat, trousers and boots with bone
buckles and star spurs; the same small skull belt buckle; the same huge tattered cobweb-like pale cape trailing to
image left; the same spectral pale HORSE SKULL emerging from the cape at the upper image left; the same long-barrel
revolver and the same body proportions.
WEAPON: exactly ONE long-barrel revolver in total, held in the hand. The tall tube holster stays EMPTY. Never a second gun.
OUTPUT: one character, one pose, no sheet, no labels, no text. Transparent background, native 1254x1254 PNG, true alpha,
full body, transparent margin on all sides; the hat, cape, horse skull, gun and boots must not touch the canvas edge.
Same body scale as the reference: hat top near y=30, boot soles near y=1240 when standing.
DO NOT ADD: black smoke, blue glow, stars or purple, afterimage duplicates, red eyes, halo, gold, lanterns, ravens,
graveyard crosses, dark brown or black clothing, blood, large muzzle flash.
```

## 5. POSE sections
| File | POSE |
| --- | --- |
| `NPC22_DRAW.png` | Slow, deliberate: the long-barrel revolver rising and swinging toward image left, elbow bent, not fully extended; body tall and still; cape and horse skull drift slightly. |
| `NPC22_FIRE.png` | The revolver arm extended toward image left at hip-to-chest height, minimal recoil, body upright and calm; the horse skull's jaw opens slightly; only a tiny muzzle spark. |
| `NPC22_HIT.png` | Struck but standing: the tall body bends back, head and hat tilt away, veil and cape whip outward, the revolver still GRIPPED but off-aim, both feet down. No blood. Must be able to recover to idle. |
| `NPC22_KNEEL.png` | Final defeat begins: sinks to one knee, clearly lower than HIT; head bowed, cape pooling; the revolver held with the barrel on the ground; the horse skull droops. Same body scale; do not enlarge. |
| `NPC22_FALL.png` | Toppling sideways/backward from the kneel, not yet flat; cape trailing; the revolver slipping from the hand (visible); the horse skull fading into the cape. Same body scale. |
| `NPC22_DOWN.png` | Lying flat, the pale cape spread like a shroud, hat beside the head, the horse skull resting faintly in the cloth, the revolver on the ground beside the hand. Same body scale. |

## 6. Locked silhouette relation
- **Live:** `assets/images/hidden/pale_rider_locked_silhouette.png` (256², black, binary alpha). It is shown in `NpcWantedCard` when NPC22 is hidden/locked.
- **LOCKED_SILHOUETTE_SOURCE** = the staged `assets/images/characters/staged/redesign-v2/hidden/pale_rider_locked_silhouette.png`, derived in PHASE 2 from the normalized locked idle (alpha threshold). The idle is unchanged in this pass, so the staged silhouette stays valid. If NPC22 gets re-locked to an IDLE_V2 (as P04/NPC09/NPC19 did), the silhouette and the staged poster must be re-derived from the new idle (`stage_phase2.py`).

## 7. Intake, anchors, review
- **INTAKE:** `npc-poses/NPC22/intake/` with the exact names above (native PNG from ~/Downloads/high-noon).
- **ANCHORS:** `anchors.json`. The idle values come from PHASE 1 (chin 250 = bottom of the face void, ground 1245, belt x 929; horse skull and cape excluded). Per pose, fill `x` (skull belt-buckle centre, or pelvis for FALL/DOWN) and `rel` (downscale-only).
- **REVIEW_SCRIPT:** `build_npc_poses.py NPC22` (chin_to_ground, no changes needed). Dry run (idle copied into all 6 slots): body scale 1.0 (wanted ×1.007), canvas 1642² (= PHASE 1), all ≥ 8 px margin, protected files unchanged.
- **Review background:** NPC22 is pale on a night scene. The review sheets must be judged on the dark sheet (F) and with the blackout dim in mind.
