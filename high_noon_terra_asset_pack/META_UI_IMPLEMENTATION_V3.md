# HIGH NOON — V3 Meta UI Implementation

## Scope completed

This implementation updates the non-duel meta experience on
`feat/animated-splash-branding` while preserving the existing game rules:

- Main menu
- Character select
- NPC select
- Settings
- Stats

Gameplay rules, ability runtime UI, stores, unlock rules, audio behavior, save
data, and approved V3 character production assets were not redesigned or
replaced.

## Implemented experience

- Main Menu now follows the master reference: a full-screen cinematic sunset,
  prominent HIGH NOON lockup, two primary duel choices, and three compact
  Character / Stats / Settings shortcuts.
- Character Select uses the approved V3 player identity art in one central,
  keyboard/touch friendly selector. Existing selection, unlock, and
  long-press ability-detail behavior remain intact.
- NPC Select uses the reference's three-poster carousel: the active opponent is
  presented as a large central Wanted Poster while the previous and next
  opponents remain visible at the sides. Existing progression and locking
  remain authoritative; the Pale Rider uses only the approved locked
  silhouette before unlock.
- Settings now has its own route. The existing BGM, SFX, vibration, language,
  purchase, and restore-purchase behavior was moved from the menu without
  changing its data sources.
- Stats uses the actual persisted aggregate values only. It does not invent
  local-duel records or new progression metrics.

## Design and responsiveness

- Shared primitives provide cinematic leather/wood/aged-paper panels, warm
  brass borders, ochre type, and restrained red danger/locked states. The UI
  uses the high-resolution leather and Wanted Paper masters rather than the
  earlier low-resolution texture previews.
- New UI copies are localized in Korean, English, and Japanese under the
  `meta` namespace.
- Meta screens use safe-area-aware layouts and `useWindowDimensions` to shift
  from vertical layouts on narrow screens to split artwork/information layouts
  in landscape.
- The implementation adds no nonessential motion, so Reduce Motion users do
  not receive new animated transitions.

## Production asset use

- The selector and Wanted Poster preserve approved V3 identity PNGs through
  `constants/v3UiAssets.ts`.
- UI panels use the approved V3 leather, wood, and Wanted Paper textures.
- Gameplay sprite consumers are not changed.

## Validation

- `npx tsc --noEmit` passed.
- `git diff --check` passed.
- Korean, English, and Japanese locale JSON parsed successfully.
- Expo iOS and Android exports completed successfully and resolved the new V3
  meta assets.
- `npm run lint` reports no new errors; it retains nine existing warnings in
  unrelated gameplay and component files.
- The Main Menu, Character Select, NPC Select, and navigation transitions were
  reviewed in the running iPhone 17 simulator.

## Visual review materials

- `output_v3_cinematic_pixel/qa/ui_validation/ui_validation_board.png` covers
  the main-menu portrait/landscape, character select, and normal/special NPC
  select compositions.
- `output_v3_cinematic_pixel/qa/ui_validation/meta_ui_locked_settings_stats.png`
  covers the locked Pale Rider, Settings, and Stats compositions.

Runtime screenshots were additionally captured from the iPhone 17 simulator.
Native iOS and Android bundles export successfully. A final physical-device
pass should still confirm very small handsets and rotation safe-area framing.
