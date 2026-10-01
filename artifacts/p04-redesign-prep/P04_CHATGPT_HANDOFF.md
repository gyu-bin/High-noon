# HIGH NOON — P04 Ghost Gunslinger handoff

Branch: `dev-2.0` · 2026-09-30 · SOURCE + BRIEF ONLY

## Source of truth

P04_RUNTIME_PATH=/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/player/04/idle.png

P04_HIGH_RES_SOURCE=/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/player/04/idle.png

P04_SOURCE_PATH=/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/player/04/idle.png

P04_SOURCE_RESOLUTION=1254×1254 RGBA PNG; alpha range 0–255

SOURCE_SHA256=0e8fe2320f032f6c1a2c71068d870efab82a3859f078620e35cb595633a4887d

Runtime evidence: `constants/clarityCharacterAssets.ts` registers Player 4 IDLE
to this file. `constants/v3UiAssets.ts` derives V3_PLAYER_IDENTITIES from that
registry; CharacterSelector and NpcPreDuelScreen consume it. This is the active
high-resolution master, not an unused, rejected or legacy image.

Attach the original PNG above directly to ChatGPT. Do not attach a contact sheet
as the generation source. This source already provides the front/three-quarter
identity reference, so no additional image is required. No source export,
resampling or production modification is necessary.

## Final proposed direction

P04_CURRENT_IDENTITY=Opaque dark longcoat cowboy; ordinary human gunslinger rather than a ghost.

P04_REDIRECTION=GHOST GUNSLINGER; preserve Western clothing roots and cinematic rendering, change the supernatural silhouette.

Use exactly THREE primary anchors:

1. Two torn longcoat tails visibly lifted against gravity, with clear separation.
2. Selective spectral dissolution of the lower coat and part of one lower leg.
3. A hollow, deeply shadowed face beneath the existing cowboy hat.

P04_SILHOUETTE_TARGET=Stable head/torso/belt, lifted split coat tails, broken lower contours; readable as a ghost without relying on color. Keep recognizable boot remnants and source-comparable anatomical scale. No whole-body levitation or missing upper-body side.

P04_COLOR_TARGET=Near-black/charcoal/weathered brown base; pale desaturated gray and restrained cold blue-white material edges at dissolving boundaries. No red/orange rim, neon blue, bright purple or broad glow.

P04_FACE_TARGET=Hollow shadow, no clearly human skin; no glowing eyes in this first candidate, so the three primary anchors remain dominant. No zombie, exposed skull or gore.

P04_WEAPON_TARGET=One classic Western revolver holstered in IDLE, worn wood grip and cold dark steel. Keep the cylinder/barrel firearm silhouette physical and readable. No spectral weapon trail or second gun in this candidate.

P04_SUPERNATURAL_TARGET=Lifted tails + localized lower-body dissolution + hollow face only. Cold boundary shading supports these anchors, not a separate aura. No smoke cloud, particles or duplicate body.

## P04_GENERATION_BRIEF — paste with the original PNG

Use the attached P04 production IDLE PNG as the identity, anatomical scale,
camera and cinematic Western material reference. Redesign this same character
as HIGH NOON's GHOST GUNSLINGER, not as a new fantasy character.

Create ONE full-body IDLE identity review candidate. Preserve the familiar
cowboy hat, longcoat lineage, weathered leather belt, single holster and boot
construction. Keep the source's three-quarter/front view, head-to-body proportion
and comparable foot baseline. The original dark cowboy silhouette is the problem,
so do not merely trace it and add glow.

Use exactly three strong supernatural anchors: two separated torn longcoat tails
lifted against normal gravity; selective spectral dissolution of the lower coat
and part of one lower leg; and a hollow, lightless face under the hat. The upper
body remains coherent and the main figure stays clearly readable. Retain enough
boot and supporting-leg structure to feel grounded rather than airborne.

Use near-black, charcoal and weathered brown, with pale desaturated gray and
very restrained cold blue-white material breakup at spectral boundaries. No
red/orange rim lighting anywhere. Any retained neckcloth is muted and non-emissive.
No glowing eyes for this first candidate. No neon contour or global glow.

Keep one classic Western six-shot revolver holstered, with cold worn dark steel
and weathered wood grip. Natural empty hands, relaxed quick-draw readiness.
No firing, aiming, kneeling or falling. No sci-fi weapon, spectral gun trail,
second physical gun, extra limbs, floating superhero stance or duplicated body.

Maintain HIGH NOON's approved cinematic/pixel rendering language and weathered
cloth, leather and metal detail. Do not convert to strict NES, photorealistic
skin/3D rendering, generic fantasy wizard, cyberpunk or an MMO boss. No armor
clutter, staff, wings, horns, magical circles, excessive particles or broad fog.

Deliver a square native-resolution true-alpha RGBA PNG, target 1254×1254 or larger,
full hat and boots inside the canvas with usable transparent margins. External
background must be alpha=0: no black/white matte, checkerboard, scenery, floor,
baked cast/contact shadow, text or UI. Selective partial alpha is allowed only
for intentional spectral material. Keep solid leather/metal opaque. No blood,
gore, muzzle flash or unrelated VFX. Do not aggressively downsample or upscale
a small image to fake the requested production resolution.

Stop after this single IDLE review candidate. No FALL/DOWN or production replacement.

## Review gate and scope

- Check actual native dimensions and RGBA alpha; a prompt alone cannot certify them.
- Review on dark/light backgrounds and in grayscale, then at 256px and gameplay size.
- Lifted tails and broken lower contours must read without the name or colored glow.
- Human identity approval is required before locking this design or deriving poses.
- P04 FALL/DOWN remain blocked until that approval.
- NPC15/NPC19/NPC20 are out of scope. Player02's previous safe-fix report is preserved;
  its manifest is not modified here. NPC01 Combat remains protected.

IMAGE_GENERATION=NONE
PRODUCTION_CHANGED=NO
CODE_CHANGED=NO
DATABASE_CHANGED=NO
STOP=YES
