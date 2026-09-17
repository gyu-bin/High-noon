# HIGH NOON — High-quality 16-bit-inspired production art direction

## Style lock

- High-quality modern Western pixel art inspired by 16-bit arcade and indie games, with modern mobile readability. It is not a strict NES/Famicom hardware reproduction.
- Clearly intentional pixel clusters and crisp hard edges; no anti-aliasing, smooth gradients, painterly texture, photorealism, vector illustration, or 3D rendering.
- Use roughly 24–48 colors when needed and 2–3 deliberate pixel-shading steps. Preserve strong silhouettes while allowing readable leather, metal, cloth, dust, rim highlights, faces, holsters, and revolvers.
- Base palette: Western Red `#8B2500`, Gold `#FFD700`, Cream `#F5E6C8`, Dark Brown `#3B1A08`, Ochre `#C8860A`, Dust Gray `#8C7B6B`.
- Tier accents only: Diamond Blue `#6DD5FA`, Master Purple `#A855F7`, Legend Orange `#F97316`, Hidden Red `#EF4444`, Void Black `#0A0A0A`.

## Asset rules

- V1 output is composition and silhouette reference only; it is never copied, cropped, or rendered as production art.
- Character sprites are authored as 256×256 logical pixel-art masters, with transparent alpha and no ground shadow.
- Backgrounds use a 768×432 master, with foreground/midground/background depth, flat skies, heavy side weight, and an empty central duel lane. Important structures stay safely inside crop margins.
- Generation must be pixel-cluster based from the start. Nearest-neighbor is allowed only for necessary resize operations; it is not an art-style conversion. Bilinear and bicubic resizing are prohibited.
- Do not automatically quantize a good asset to 16 colors. Color reduction is only permitted after inspection when an image is excessively colored and must not destroy deliberate pixel-art detail.
- Character sprites never contain muzzle flashes. UI/localized text, signal cues, names, statistics, and buttons are rendered by React Native, not baked into assets.

## Pose and identity rules

- Identity anchor (portrait/idle) is approved before all other poses. Aim, fire, hit, and down reference that accepted identity.
- Fire aims horizontally toward the opponent around waist/chest height with exactly one integrated revolver.
- Hit is a non-gory torso recoil; down is a natural buckling/fall silhouette with no gore.
