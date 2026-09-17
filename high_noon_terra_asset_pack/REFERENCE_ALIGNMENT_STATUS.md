# Reference alignment — 2026-09-17

## Implemented

- Canonical 22 NPC display names and baseline reaction times now follow the supplied roster board. Pale Rider retains its internal 198 ms baseline because the reference intentionally specifies no numeric value.
- NPC selection uses the supplied roster artwork via a clipped image atlas. The original image is preserved. This is reference-resolution art, not a new high-resolution portrait master.
- Removed the invented SPEED / POWER / FOCUS display values.
- Created a text-free rear-view cowboy scene for the menu and Player 01 pre-duel screen. Other selected players retain their own identity artwork.
- Wired cinematic sunset, day, arena, and night backgrounds into NPC duel selection.
- Added explicit NEXT / MENU round-result controls.
- Added a playable READY / STEADY / BANG practice tutorial with early-tap and timeout handling and timer cleanup.
- Added persisted dark-mode presentation for meta screens and a destructive-confirmation progress reset that preserves purchases.
- Added persistent NPC win rate, NPC/local completed match counts, recent match history, existing best reaction records, collection count, and progression-derived achievement indicators. Historical wins are not fabricated; match counts start with this version.

## Not complete / do not claim full art approval

- Full-body combat poses still use approved V3 pixel artwork. They do not yet match all 22 illustrated portraits. Final identity-consistent cinematic pose masters are needed before full visual approval.
- Player 02–04 still use V3 identity artwork; Player 01 selection uses the existing cinematic master.
- The supplied NPC portrait atlas is low resolution. Replace with individual high-resolution masters for production-quality enlargement.
- Cloudy background, store/economy, online ranking, and achievement award popups are not implemented in this change.
- Tutorial/settings/stats newly added copy is Korean; localization parity remains work.
- iPhone simulator screenshots verify static menu, NPC selection, and tutorial composition only. They do not prove gameplay interactions or rotation on Android.
- Web export encounters the existing Worklets SSR error. Native export is validated separately.

## Generated asset

Built-in image generation; saved at `assets/branding/cinematic-hero.png`.

Prompt:

Create a production background for HIGH NOON western mobile game pre-duel and main menu. Portrait 2:3 full bleed cinematic western illustration, high detail painterly game key art. Lone cowboy viewed FROM BEHIND, black wide brim hat, long dark brown leather duster, red bandana barely seen behind neck, holster and boots. Full body on ground center, cowboy fills middle 60 percent height, feet at 85 percent height. Dusty frontier main street, wooden saloons left and right, enormous golden orange sunset sun behind hat and shoulders, burnt orange sky, dark brown foreground, strong beautiful silhouette, restrained orange rim highlights, atmospheric perspective. NO pixel art, NO UI, NO text, NO letters, NO logo, NO border, NO rounded corners. Dark upper and lower margins suitable for overlaid app typography. Grounded human anatomy. This is one standalone scene, not a board or collage.
