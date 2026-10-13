# Additional production DRAW/FIRE source triage

Read-only source inspection of NPC02–08,10–14,16–17,21. No code, flips, positions or source pixels were changed. No generation, commit or push. Runtime at native 1× is NOT_VERIFIED until parent evidence is reviewed.

## References and identity locks

All fifteen resolve through current `CLARITY_NPCS` to `assets/images/characters/clarity/npc/XX/{idle,draw,fire,hit,down}.png`. DRAW and FIRE are transparent 1254×1254 squares at production display scale 1. `getV3NpcPose` reads the same registry. Existing faceoff selection uses DRAW for READY and STEADY for these IDs, with a horizontal flip; actual shot uses unflipped FIRE. This observation is not a request to change that code.

The complete current five-pose set is the identity boundary. Preserve each hat, clothing, face/wrap, weapon and palette. Legacy assets, poster derivatives and unrelated alternate firing images are not equivalent substitutions. The high-res poster production-lock document records preservation of the original clarity pose files; its NPC Select device approval does not certify NPC Duel. The clarity manifest records source visual QA with runtime QA pending.

## Source findings

Every audited DRAW has the revolver at the holster, barrel directed downward toward the ground beside its own legs. Flipping reverses its small horizontal component but retains the downward pitch. That is a candidate aim-readability blocker if visible at 1×; it is distinct from its FIRE pose.

Every audited FIRE has a clean approximately horizontal image-left barrel at waist/abdomen height. Under the relaxed waist/torso rule this is an acceptable shot-height candidate. No FIRE barrel points outside/own-side in source or with the current unflipped NPC placement. No baked muzzle flash or gun smoke was visually apparent. NPC14 blue electric edging is existing identity treatment, not a shot flash. No source-edge cutoffs were observed. Ground suitability is still pending native captures: measured sole differences from the shared idle line are recorded in JSON and below.

Head/body observations do not establish a blanket strict-facing failure. NPC02, NPC06 and NPC11 have the clearest recognizable human heads angled image-right while FIRE points left; prioritize these in native evidence. The remaining heads are masked, front-facing or partly hidden, so a hard blocker should be recorded only if plainly wrong at 1×.

| ID / locked identity | DRAW | FIRE | head-review priority | DRAW/FIRE sole delta from idle (source px) | 1× status |
| --- | --- | --- | --- | --- | --- |
| NPC02: brown vest, patchwork trousers, stubble, red scarf | down beside holster | clean left waist/abdomen | clear human profile right vs gun left | +0 / +2 | NOT_VERIFIED |
| NPC03: crow-skull hat and black feathered cloak | down beside holster | clean left waist/abdomen | masked/front/hidden; native review | -4 / +1 | NOT_VERIFIED |
| NPC04: tan fur-trimmed coat and face wrap | down beside holster | clean left waist/abdomen | masked/front/hidden; native review | +6 / +2 | NOT_VERIFIED |
| NPC05: dark shoulder armor, half-mask, crossed cartridge belt | down beside holster | clean left waist/abdomen | masked/front/hidden; native review | +4 / +1 | NOT_VERIFIED |
| NPC06: red-haired woman, fitted brown duster, red scarf | down beside holster | clean left waist/abdomen | clear human profile right vs gun left | +0 / +2 | NOT_VERIFIED |
| NPC07: green coat and yellow-green wrap | down beside holster | clean left waist/abdomen | masked/front/hidden; native review | -2 / +3 | NOT_VERIFIED |
| NPC08: red vest, gold accents, brown duster | down beside holster | clean left waist/abdomen | masked/front/hidden; native review | +3 / +2 | NOT_VERIFIED |
| NPC10: metal shoulder armor and orange-brown poncho | down beside holster | clean left waist/abdomen | masked/front/hidden; native review | +2 / +1 | NOT_VERIFIED |
| NPC11: goggles, heavy beard, broad brown coat | down beside holster | clean left waist/abdomen | clear human profile right vs gun left | -2 / +0 | NOT_VERIFIED |
| NPC12: dark armor and covered face | down beside holster | clean left waist/abdomen | masked/front/hidden; native review | +3 / +11 | NOT_VERIFIED |
| NPC13: split mirror mask and pale poncho | down beside holster | clean left waist/abdomen | masked/front/hidden; native review | +16 / +4 | NOT_VERIFIED |
| NPC14: blue electric trim on dark coat | down beside holster | clean left waist/abdomen | masked/front/hidden; native review | +4 / +3 | NOT_VERIFIED |
| NPC16: purple patterned poncho and scarf | down beside holster | clean left waist/abdomen | masked/front/hidden; native review | +12 / +9 | NOT_VERIFIED |
| NPC17: pale covered face and long dark coat | down beside holster | clean left waist/abdomen | masked/front/hidden; native review | +5 / +11 | NOT_VERIFIED |
| NPC21: black/gold formal duster and skull-topped cane | down beside holster | clean left waist/abdomen | masked/front/hidden; native review | -2 / +1 | NOT_VERIFIED |

## Evidence boundary

Analytical contact sheets were viewed at `/tmp/highnoon-triage-1.jpg`, `-2.jpg`, `-3.jpg`. Their crops maximize source readability and are not native simulator screenshots. The companion JSON stores exact source references, hashes, native sizes, alpha >20 bounds and measured ground deltas. Source observations are candidates for native triage, not whole-roster PASS/FAIL.
