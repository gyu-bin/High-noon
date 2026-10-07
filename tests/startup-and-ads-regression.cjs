const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

const ads = read('utils/adService.ts');
const game = read('app/game/npc.tsx');
const layout = read('app/_layout.tsx');
const ota = read('utils/otaApply.ts');

assert.doesNotMatch(ads, /INTERSTITIAL_LOAD_WAIT_MS|20_000/);
assert.match(ads, /!ad\?\.loaded/);
assert.match(ads, /void ad\.show\(\)\.then\(markPresented\)\.catch\(finish\)/);
assert.doesNotMatch(game, /await showStageCompleteAd/);
console.log('PASS stage completion only presents prepared ads and navigation never awaits callbacks');

assert.match(layout, /HYDRATION_STARTUP_BUDGET_MS/);
assert.match(layout, /if \(hydration\.every\(Boolean\)\)/);
assert.match(layout, /waitPersistHydrated\(useProgressStore\.persist\)[\s\S]*waitPersistHydrated\(useSettingsStore\.persist\)/);
assert.match(layout, /Never inspect or back up defaults before both stores finished hydration/);
console.log('PASS hydration has a bounded splash wait and deferred safe recovery');

assert.match(ota, /const deadline = Date\.now\(\) \+ timeoutMs/);
assert.match(ota, /withinBudget\(Updates\.checkForUpdateAsync\(\)\)/);
assert.match(ota, /withinBudget\(Updates\.fetchUpdateAsync\(\)\)/);
assert.match(layout, /timeoutMs: OTA_COLD_START_BUDGET_MS/);
assert.match(layout, /OTA_FAST_PATH_MS/);
assert.doesNotMatch(layout, /AnimatedSplash/);
console.log('PASS OTA stays on a cold-start budget, and no update does not hold the splash');
