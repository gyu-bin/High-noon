# Independent generated-source acceptance

Reviewed actual generated P02_FIRE, P03_FIRE, NPC15_DRAW, NPC19_DRAW and NPC22_DRAW in `generated/`. Text/JSON only written by this reviewer; no production files or image pixels changed. This is source acceptance, not normal-speed native1× approval.

## Visual findings

| Pose | Identity | Source facing | Held weapon / quiet muzzle | Geometry verdict |
| --- | --- | --- | --- | --- |
| P02_FIRE | Current blue-scarf sheriff, hat star, badge, beard, pale waistcoat and duster preserved | Body, recognizable head and barrel clearly LEFT | One revolver; no flash/smoke/recoil | Accept current1254geometry; native pending |
| P03_FIRE | Female gunslinger, long hair, brown hat/coat, red scarf and belt silhouette preserved | Body/head silhouette/barrel coherently LEFT | One revolver; no flash/smoke/recoil | Accept current1254geometry; update moved muzzle anchor only; native pending |
| NPC15_DRAW | Black shadow/wisp identity, paired eye treatment, ragged hat/cape, belt and boots preserved | Body/head/barrel clearly RIGHT | One held revolver; no muzzle smoke. Gold hip-hilt/scabbard matches idle | Normalize to1624canvas and idle body/ground; native pending |
| NPC19_DRAW | Violet eye/star-void coat, current hat emblems, fragments and boots preserved | Barrel LEFT, torso three-quarter/front. Featureless circular face is not clearly opposite | One held revolver; no baked shot spark/smoke | Normalize to1682canvas and idle body/ground; native pending |
| NPC22_DRAW | Pale hat/cross, void face, white hair, perforated cape and horse preserved | Barrel LEFT, torso three-quarter/front. Masked void face is not clearly opposite | One held revolver; no baked shot spark/smoke | Normalize to1684canvas and idle body/ground; native pending |

NPC19/NPC22 should not be rejected solely because their featureless faces remain partly frontal. No clear outward-facing nose/gaze/body turn was observed; this matches the conservative normal1× assessment rule. A native capture still needs to confirm the combined reading.

NPC15's gold rounded hip handle is not a newly introduced second gun. Enlarged side-by-side inspection of allowed production idle and generated pose shows the same engraved hilt/scabbard, chain, lower ornament and placement. One gun is held. Do not remove that existing identity object based on its gold color.

All outputs are1254×1254RGBA with genuine transparent backgrounds and alpha0–255. There is no scene matte. NPC15/NPC22 contain a few corner alpha1pixels, so nonzero-alpha fullbbox is unsuitable for sizing. NPC22 shows isolated blue/red/green fringe pixels along pale silhouette edges when enlarged; record as a technical native-background check, not an additional facing/generation blocker. Final alpha/edge approval is pending normalized native1× evidence.

## Uniform pixel normalization

Use body landmarks, not full smoke/horse/cape extent. Crown top was visually sampled within about4source pixels. Front sole exclusive bottom and the two boot sole midpoint were measured at alpha>20; sole X midpoint uses each boot's bottom15rows. The proposed transform preserves the idle crown-to-front-sole span and boot midpoint. It does not preserve a particular stretched stance width, which naturally changes with aiming.

`x_out = s*x_in + tx`, `y_out = s*y_in + ty`.

| Pose | Output canvas | Uniform s | tx(px) | ty(px) | Crown/sole input → output |
| --- | --- | --- | --- | --- | --- |
| NPC15_DRAW |1624×1624|1.1053621825|39.532083|91.779868|97/1160 →199/1374|
| NPC19_DRAW |1682×1682|1.1244153414|6.278528|112.567820|116/1185 →243/1445|
| NPC22_DRAW |1684×1684|1.1393129771|60.893648|106.889313|130/1178 →255/1449|

These are recommendations to validate in a normalized preview, not an unreviewed permission to install files. With integer-sized resampling, round scaled image dimensions and translation only at final rasterization; check resulting sole/head placement within1–2pixels. Keep source alpha, entire silhouette and transparent target canvas. Retain existing runtime display scale, lane origins, layout and ground fractions. No whole-body rotation or per-axis stretching. Do not compress all effects to1254.

P02/P03 already retain their original full-body crown/sole height; do not enlarge them with the NPC transform. New P03 barrel exit is approximately raw(39,216), normalized(.03110,.17225), sampled±3pixels. P02 is approximately(70,199), normalized(.05582,.15869). These current FIRE tips require fire-VFX anchors. NPC actual FIRE files are unchanged: do not replace their FIRE anchors using normalized DRAW tips.

Production metadata nominal ground and exact alpha soles are separate measurements. Matching each existing idle visible sole preserves baseline presentation without moving the stage. This does not request any lane/ground metadata change.


## Normalized follow-up — source asset PASS, 5/5

Independently viewed the actual normalized NPC files and checked all five dimensions, decoded pixels and alpha bounds. Production was not yet connected at review. This follow-up supersedes the earlier geometry-pending status; runtime1× remains pending.

- P02_FIRE and P03_FIRE remain1254×1254 and decoded RGBA pixels are exactly identical to their generated inputs.
- NPC15_DRAW is1624×1624; front sole alpha>20 bottom1375 vs idle1374, a +1pixel difference.
- NPC19_DRAW is1682×1682; front sole bottom1446 vs idle1445, +1pixel.
- NPC22_DRAW is1684×1684; front sole bottom1450 vs idle1449, +1pixel.
- Crown/body scale and source placement match the recommended body-landmark normalization. All gun tips, shadow wisps, floating fragments, pale cape and horse remain fully inside the target canvas. No source crop was observed.
- Transparent canvas, identity, inward source direction under the existing flips, one held weapon and quiet muzzle are accepted for all five. NPC19/NPC22 featureless partly-front heads do not clearly face outward.

No layout, runtime scale or ground/lane origin change is needed. P03 muzzle anchor requires the known approximately(.031,.172) correction. P02 old anchor differs by roughly1runtime pixel and can remain as parent specified. NPC FIRE anchors remain unchanged.

NPC22 retains isolated white/colored fringe pixels visible in the enlarged source. That caution does not add a static generation blocker, but final visual alpha-edge approval requires normalized native1× views over the approved backgrounds. This source asset PASS does not imply actual gameplay, victory/defeat or native whole-screen PASS.


## Locked viewport-boundary follow-up

After native left-edge evidence, P02/P03 and NPC19/NPC22 received the parent-owned asset-only X containment corrections. Actual corrected isolated sources and frozen helper math now pass all264 P02/P03×NPC01–22×three standing stages×12/16pt inset combinations at402pt width. Crowns/soles are vertically unchanged; no runtime scale/layout/ground code change is required. Minimum player left clearance2.1326pt, NPC right clearance2.0001pt and complete opaque gap19.9683pt. See `locked-boundary-acceptance.md/json`. Corrected native1× visual verification remains pending.
