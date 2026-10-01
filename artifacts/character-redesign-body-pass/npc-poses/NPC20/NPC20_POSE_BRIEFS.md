# PHASE 3B-5: NPC20 Echo Phantom combat pose briefs

2026-10-01 · `dev-2.0` · preparation only. No generation, no live mapping change.

## 1. Runtime states (verified in code)
NPC20 uses the same NPC duel path: `NpcFirstPersonDuelArena` → `npcRenderPose` → `CLARITY_NPCS[20]` / `NPC_COMBAT_POSES[20]`.
- **States:** idle / draw / fire / hit(+stagger) / kneel (clarity `down`) / fall* / down* (*registered at integration).
- **Timing:** survive: hit 0 → stagger 180 → recover 440 ms. Final: hit 0 → stagger 200 → kneel 420 → fall 720 → down 1000.
- **Fire direction:** the runtime muzzle flash sits at the **left** of the NPC box, so NPCs fire toward image-left. The old clarity NPC20/NPC09 fire poses and every locked NPC FIRE so far aim left.
- **Ability `echoReady`:** the arena also has a runtime after-image (`styles.afterImage`: the same sprite at opacity 0.24, blue tint, offset −18/+8) shown during the echo/mirror presentation. With baked echoes this may read as a double echo; check at integration.

```
NPC20_RUNTIME_STATES=idle, draw, fire, hit(+stagger), kneel(clarity down), fall*, down*
POSES_TO_GENERATE=DRAW, FIRE, HIT, KNEEL, FALL, DOWN (6; IDLE = locked master)
```

## 2. ⚠ Direction conflict (decision needed before generating)
The locked idle `artifacts/character-redesign-body-pass/intake/NPC20_ECHO_PHANTOM.png` **aims image-RIGHT**, with the echoes trailing image-left. Every other NPC and the runtime flash anchor use image-left.

- **Option M (recommended):** use the **horizontally mirrored** locked idle as the identity and reference: `npc-poses/NPC20/reference/NPC20_ECHO_PHANTOM_MIRRORED.png`, already prepared. It is a lossless flip with no repaint. All 6 poses then aim image-left with the echoes trailing image-right. Setting `idle.mirror=true, idle.x=389` in `anchors.json` applies the same flip to the staged idle. Mirroring was not in the PHASE 1 allowed-transform list, so it needs explicit approval.
- **Option K:** keep the idle facing right and generate all poses facing right. This needs a per-NPC flash-anchor change at integration (a code change).

## 3. Weapon lock
**WEAPON_CONFIG** = 2 revolvers, **both in hand** (one aimed, one held low in the other hand). The tube holster on the hip is **empty**. The guns in the echoes are afterimages and do not count. Never a third physical gun.

| Pose | Weapons (main body) |
| --- | --- |
| DRAW | both in hand; the aim hand rising, the other low |
| FIRE | the aim hand extended at hip–chest height, the other low |
| HIT | both still gripped, off-aim |
| KNEEL | both lowered toward the ground |
| FALL | both slipping, visible |
| DOWN | both on the ground beside the hands |

## 4. Identity checklist (compare every pose to the idle)
- **Main body:** slim, fast lunging gunslinger; dark, solid, clearly readable.
- **Hat and face:** dark hat with an ornate gold star badge on the band; dark face with faint pale eyes; long pale hair wisps.
- **Coat and belt:** dark grey quilted tattered duster with star and cross pins; bullet belt with a compass buckle; empty tube holster; strapped boots with star spurs.
- **Echoes:** **2–3** translucent pale blue-grey afterimages of the hat, arm, gun and coat. They trail **behind** the motion, are always fainter than the main body, and wisps of cold light connect them.
- **Forbidden:** a giant spectral cloud, P04's blue glowing ghost body, NPC19 stars/void, NPC15 dense black smoke, NPC18 red eyes/halo, NPC09 gold skull, echoes stronger than the main body, blood.

## 5. Common prompt header (attach only the reference; new chat per pose)
```
Use the attached NPC20_ECHO_PHANTOM image as the ONLY visual reference. Create ONLY the [POSE] pose of this exact character.
IDENTITY MUST REMAIN IDENTICAL: the slim, fast gunslinger main body, dark and solid; the same dark hat with the gold
star badge; the dark face with faint pale eyes and pale hair wisps; the same dark grey quilted tattered duster with
star and cross pins; the bullet belt with compass buckle; the empty tube holster; strapped boots with star spurs;
the same two revolvers and the same body proportions.
ECHO: 2-3 translucent pale blue-grey afterimages of the hat, arm, gun and coat trailing BEHIND the motion
(toward image right), always fainter than the main body, with thin cold light wisps. No giant spectral cloud.
WEAPONS: exactly TWO revolvers in the main body's hands; the holster stays EMPTY. Echo guns are only afterimages.
OUTPUT: one character, one pose, no sheet, no labels, no text. Transparent background, native 1254x1254 PNG,
true alpha, full body, transparent margin on all sides; echoes, coat and guns must not touch the canvas edge.
Same body scale as the reference: hat top near y=40, boot soles near y=1240 when standing.
DO NOT ADD: blue glowing ghost body, stars or purple void, dense black smoke, red eyes, halo, gold skull, blood,
large muzzle flash.
```
(Echo direction is written for Option M. Under Option K, replace "image right" with "image left" and "image left" with "image right" in §6.)

## 6. POSE sections
| File | POSE |
| --- | --- |
| `NPC20_DRAW.png` | Mid-draw lunge: the aim hand rising toward image left, elbow bent, not fully extended; the other gun held low; echoes of the rising arm and gun trail behind. |
| `NPC20_FIRE.png` | The aim arm fully extended toward image left at hip-to-chest height, controlled recoil; the echoes snap back behind the shot; only a tiny muzzle spark. |
| `NPC20_HIT.png` | Struck but standing: jolts back, head snapping away; the echoes scatter and smear; both guns still GRIPPED off-aim; both feet down. Must recover to idle. |
| `NPC20_KNEEL.png` | Final defeat begins: drops to one knee, clearly lower than HIT; the echoes fade and lag behind; both guns lowered to the ground. Same body scale. |
| `NPC20_FALL.png` | Toppling backward from the kneel, not yet flat; the echoes stretch out behind the fall; both guns slipping from the hands, visible. Same body scale. |
| `NPC20_DOWN.png` | Lying flat; the echoes reduced to one faint fading silhouette; the hat beside the head; both guns on the ground beside the hands. Same body scale. |

## 7. Intake, anchors, review
- **INTAKE:** `npc-poses/NPC20/intake/` with the exact names above (native PNG from ~/Downloads/high-noon).
- **ANCHORS:** `anchors.json`. Idle values come from PHASE 1, main body only (chin 300, ground 1240, belt x 864). PHASE 1 wanted ×1.0404 and clamped to 1.0, so NPC20 renders ≈4% smaller.
- **REVIEW_SCRIPT:** `build_npc_poses.py NPC20`. This round added an optional lossless `mirror` flag per pose for Option M; NPC09/15/18/19 runs are unchanged. Dry run (idle copied into all 6 slots): body scale 1.0, canvas 1712² (= PHASE 1), every pose ≥ 8 px margin, protected files unchanged.

## Decision (2026-10-01)
- **Option M approved.** The official combat reference is `reference/NPC20_ECHO_PHANTOM_MIRRORED.png` (pure horizontal flip, no repaint).
  - All poses aim image-left, and the echoes trail image-right.
  - Runtime muzzle-flash logic is unchanged.
- **anchors.json:** `idle.mirror=true`, `idle.x=389`. The unmirrored idle is kept as history.
- **Integration QA item:** the echoReady runtime afterimage vs the baked echoes. If it doubles up too much, change opacity/offset or disable it for NPC20 only.
