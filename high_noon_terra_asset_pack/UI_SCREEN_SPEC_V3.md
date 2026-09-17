# HIGH NOON — V3 UI Screen Specification

Status: validation target only. Do not treat this document as an implementation authorization.

## Global composition

The journey reads as one western world: app icon → splash → title → menu → character/NPC choice → duel → result. `WesternHomeBackground` and the existing title wordmark remain the entry reference. Dark brown, burnt orange, western red, muted gold and warm cream form the visual hierarchy; generic white cards, neon and glass effects are excluded.

## Menu

Portrait and landscape retain a single cinematic background area. Use `HIGH NOON` / `A DUEL AWAITS` above two clear actions: **VS NPC** with `SOLO DUEL`, then **LOCAL DUEL** with `2 PLAYERS`. A low-priority bottom action row contains **CHARACTER**, **STATS**, **SETTINGS**. Settings remain off the home surface and no new settings are invented.

## Character select

Title: `CHOOSE YOUR GUNSLINGER`. A selected, approved full-body character is the hero on a restrained sun/halo support shape. Name, one compact ability/status line and **SELECT** follow. The existing character unlock and long-press ability rules remain. This is not a dense inventory grid in the target composition.

## NPC select

Use a `WANTED POSTER` motif backed by `ui_wanted_paper.png`. Each card includes name, tier emblem, boss/special-duel marker, concise localized ability hint and **DUEL**. It never shows bounty or currency. NPC 01–12 emphasize speed/tier/personality. NPC 13–22 add a compact special-duel marker and defer explanation to the existing pre-duel information surface.

## NPC duel

Layer order is fixed: approved background → NPC pose → ability presentation VFX → minimal HUD → READY / STEADY / BANG cue → foreground first-person hand/revolver → muzzle/smoke → result overlay. Top-left is YOU + hearts; top-right is NPC + hearts; top-center is round. The center remains clear. Do not add a permanent giant wooden HUD frame.

READY uses stable cream; STEADY is ochre/gold; BANG! is western red with restrained gold and is the strongest event. There is no countdown and no replacement DRAW cue.

## Local duel

Portrait is a shared scene shown twice: the physical top 50% is P2’s scene rotated 180°, and the physical bottom 50% is P1’s normal scene. Both receive the same layout and READY cue in their own correct viewing direction. The validation board makes this explicit without a permanent heavy divider.

Landscape is one composition: P1 left 50%, P2 right 50%. Touch zones split logically; a divider only appears temporarily in the existing first-match/tutorial guidance if necessary. Do not create two unrelated visual systems.

## Result

Keep the live duel scene visible. NPC result says `YOU WIN` or `OUTDRAWN`, with reaction time and optional best draw, then rematch and context-appropriate next/menu action. Local result says `PLAYER 1 WINS` or `PLAYER 2 WINS`, reaction information, rematch and menu. This is a cinematic overlay, never a centered white app dialog.

## Settings, stats and tutorial

Wrap existing controls in proposed `WesternSettingRow` patterns without changing their state or audio behavior. Stats use readable body typography and restrained tier/emblem treatment. The orientation tutorial remains brief and relies on the existing landscape-rotate asset. No new settings, unlock conditions, assets or tutorial rules are introduced.

## Responsive rules

- Use safe-area insets, orientation and short dimension rather than a fixed phone reference scale.
- In portrait, reserve top/bottom system safe areas before positioning title, HUD or dual-player content.
- In landscape, preserve a central 40% duel lane and keep player weapon/VFX inside lower-right safe composition.
- Texture is a supporting layer, not a dense backdrop; scale/crop it without distorting text or interactive regions.
