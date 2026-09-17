# NPC 01 clarity upgrade

Built-in image generation/editing; no CLI fallback. Outputs are 1254×1254 RGBA with alpha spanning 0–255. Original 256px V3 production files remain untouched.

Final files: idle.png, draw.png, fire.png, hit.png, down.png. Runtime and preload selection are in constants/v3DuelAssets.ts. Other NPC identities remain V3.

## Prompt set

Shared: Preserve the original tilted rope-band brown hat, black lower-face bandana, worn tan poncho with burgundy trim, gloves, cartridge belt, brown holster, trousers and boots. Premium cinematic detailed illustration; clean coherent forms, restrained amber light; no pixelation, noise or red outline. Single full body, consistent square canvas and body scale, transparent alpha, opaque character interior. No floor, external shadow, UI, text, blood, smoke or muzzle flash.

- Idle: edit original NPC01 idle; preserve exact pose and identity, improve rendering clarity. Boots on a common baseline.
- Draw: edit new idle; right hand grips revolver just leaving holster, elbow bent near waist, weapon not yet aimed.
- Fire: edit new idle; low hip shot, right elbow at waist, fist at belt height, foreshortened barrel toward viewer, empty holster. Initial shoulder-height firing candidate was rejected; final uses waist-height correction.
- Hit: edit new idle; torso arches backward, shoulders displaced, knees soften, weapon arm loses control with revolver lowered, left arm balances.
- Down: reference new idle and hit; collapse onto knee, torso slumped, head bowed, gun lowered, same body scale with upper canvas empty. First candidate had an extra holstered gun; final edit removed only that extra gun, preserving the held revolver and kneeling pose.

## QA

Visual inspection of individual outputs: coherent costume and hat across five poses; distinct draw/fire and hit/down silhouettes. Alpha and dimensions inspected with Pillow, without editing image pixels. TypeScript and targeted ESLint pass.

Runtime simulator verification NOT completed: deep link encountered an iOS Open in High Noon confirmation. Capture routes `duel-clarity` and `duel-clarity-down` are available for subsequent inspection. Do not mark human approval or whole-roster completion.

App-wide orientation choice (portrait versus landscape) is awaiting the user's answer. No orientation changes in this clarity pass.
