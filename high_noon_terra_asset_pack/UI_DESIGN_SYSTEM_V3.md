# HIGH NOON — V3 UI Design System

Status: design specification and shared-asset production only. No screen, gameplay, routing, state, audio, or unlock implementation changed in this phase.

## Audit summary

The current title (`app/index.tsx`) already provides the approved world entry with `WesternHomeBackground` and `ShimmerTitle`. Meta screens share `MetaScreenShell`; navigation returns through `MenuBackButton`; `WoodButton` already has tactile press, audio and haptic behavior. `CharacterSelectCard`, `NpcSelectCard`, `MaskedLegendCard`, `DuelSignalBoard`, `DuelArenaLayout`, `LocalDuelArenaLayout`, `HeartStrip`, `NpcRoundModal`, and the result backdrop/stat components are the reusable bases for a later UI implementation.

Existing UI was not replaced. It is currently a functional card/grid system. The V3 direction evolves it into a restrained cinematic-pixel-western system: art and duel space lead, while wood/leather/parchment only support interaction and information.

## Color tokens

Canonical tokens live in `constants/theme.ts` as `uiV3Colors`. Existing `colors` remain unchanged until the implementation phase to avoid an unreviewed visual rewrite.

| Token | Value | Role |
| --- | --- | --- |
| background | `#1A0C06` | near-black western base / scrim |
| westernRed | `#8B2500` | BANG, dangerous CTA, defeat |
| gold | `#FFD700` | key trim, boss emphasis |
| cream | `#F5E6C8` | primary readable text |
| darkBrown | `#3B1A08` | leather / panel ground |
| ochre | `#C8860A` | primary accent, STEADY |
| dustGray | `#8C7B6B` | muted metadata / disabled state |
| diamondBlue | `#6DD5FA` | Diamond / Mirror accent only |
| masterPurple | `#A855F7` | Master tier only |
| legendOrange | `#F97316` | Legend tier only |
| hiddenRed | `#EF4444` | Pale Rider / final danger accent |
| voidBlack | `#0A0A0A` | void and locked-hidden treatment |

Do not introduce un-tokened hexadecimal colors in newly implemented UI.

## Type and spacing

- `Rye` is reserved for the wordmark, screen titles and duel calls: **READY**, **STEADY**, **BANG!**, **VICTORY**, **OUTDRAWN**.
- The project’s readable system/body font is used for all settings, hints, stats and localized prose.
- Base rhythm: 4 / 8 / 16 / 24 / 32 px. Cards are separated by air, not ornament.
- UI occupies safe margins and never covers the central duel lane. Decorative texture opacity should normally stay at or below 0.16 over an opaque base.

## Primitive contract for implementation

| Primitive | Reuse / responsibility |
| --- | --- |
| `WesternButton` | evolve `WoodButton`; wood/leather base, muted-gold keyline, cream label, pressed translate + lower shadow, disabled opacity, selected ochre keyline. No state raster files. |
| `WesternPanel` / `WesternFrame` | low-opacity leather or parchment backing, vector frame, never a white app card. |
| `WesternHeader` / `WesternDivider` | Rye title plus restrained line ornament. |
| `WesternIconButton` / `WesternBadge` | vector icon or tier emblem; clear accessible label. |
| `WesternModal` | cinematic dark scrim and frame; scene remains perceptible behind it. |
| `WesternSettingRow` | label, optional short description, existing control; preserve current state behavior. |
| `CharacterPortrait`, `CharacterSelector`, `CharacterStats` | use approved character PNGs and existing selection/ability logic. |
| `NpcWantedCard`, `NpcAbilityBadge` | poster visual language, tier / boss / special-duel information; no reward money. |
| `DuelHUD`, `DuelCue`, `PlayerStatus`, `HeartDisplay`, `RoundDisplay`, `ReactionTimeDisplay`, `DuelResultOverlay` | build on existing arena, `HeartStrip`, signal and modal/result components; presentation only. |

These are proposed component boundaries, not newly wired screens.

## Asset policy

Generated PNG is used only where artwork helps: parchment, leather and wood surface tiles. All labels and localized content remain React Native text. Frames, hearts, lock, skull, tier and ability marks are compact SVGs so they tint and scale cleanly.

Production assets are in `assets/images/ui/western/`:

- `ui_wanted_paper.png`, `ui_leather_texture.png`, `ui_wood_texture.png` — 512 × 512 opaque material tiles.
- `frames/ui_frame_primary.svg`, `ui_frame_portrait.svg`, `ui_divider.svg`.
- `icons/ui_heart_full.svg`, `ui_heart_empty.svg`, `ui_skull_boss.svg`, `ui_lock.svg`.
- `tiers/tier_bronze.svg` through `tier_legend.svg`.
- `abilities/ability_mirror.svg`, `ability_thunderbolt.svg`, `ability_blind_bang.svg`, `ability_screen_shake.svg`, `ability_inverted_signals.svg`, `ability_echo_ready.svg`, `ability_chaos_random.svg`, `ability_pale_silence.svg`.

`assets/images/ui/landscape_rotate_hint.svg` already satisfies the orientation-hint need and is preserved unchanged.

## Interaction and accessibility

- Text is never baked into a texture or icon.
- Every action keeps an `accessibilityRole`, label and disabled/selected state.
- Press feedback is motion-light and nonessential; preserve the project reduce-motion policy when primitives are implemented.
- The same hierarchy works at portrait and landscape short dimensions; large panels may not be scaled blindly from a reference device.

## Pale Rider security

Before unlock, use only `pale_rider_locked_silhouette.png`, `???`, lock icon and hidden-red/void-black treatment. Do not mount identity, pose, or reveal artwork. After the existing unlock state is true, the normal approved asset may appear. This is presentation policy only; unlock data and requirements are untouched.
