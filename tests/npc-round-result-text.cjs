const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(file) {
  const out = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const m = { exports: {} };
  new Function('module', 'exports', 'require', out)(m, m.exports, ref => load(path.resolve(path.dirname(file), ref) + '.ts'));
  return m.exports;
}
const { npcRoundResultLine: line } = load(path.join(root, 'utils/npcRoundResultLine.ts'));

// Measured pairs → a positive margin; win and loss phrase it from the player's side.
assert.deepEqual(line({ kind: 'win', playerMs: 200, npcMs: 232.3 }), { key: 'result.roundText.marginWin', marginMs: 32.30000000000001 });
assert.deepEqual(line({ kind: 'loss', reason: 'slower', playerMs: 250, npcMs: 220 }), { key: 'result.roundText.marginLoss', marginMs: 30 });
// No invented reaction gap for causes without a measured pair.
assert.equal(line({ kind: 'loss', reason: 'early', playerMs: null, npcMs: 230 }).key, 'result.roundText.causeEarly');
// The engine reports 'timeout' when the NPC fires before any tap: that reads as "opponent fired first".
assert.equal(line({ kind: 'loss', reason: 'timeout', playerMs: null, npcMs: 230 }).key, 'result.roundText.causeShotFirst');
assert.equal(line({ kind: 'loss', reason: 'timeout', playerMs: null, npcMs: null }).key, 'result.roundText.causeTimeout');
assert.equal(line({ kind: 'win', playerMs: 210, npcMs: null, npcMisfire: true }).key, 'result.roundText.causeNpcMisfire');
assert.equal(line({ kind: 'win', playerMs: 250, npcMs: 220, lastStand: true }).key, 'result.roundText.causeAbility');
assert.equal(line({ kind: 'loss', reason: 'slower', playerMs: 250, npcMs: 220, revive: true }).key, 'result.roundText.causeAbility');
for (const data of [line({ kind: 'win', playerMs: 200, npcMs: 232 }), line({ kind: 'loss', reason: 'early', playerMs: null, npcMs: 230 })]) {
  assert.ok(!('marginMs' in data) || Number.isFinite(data.marginMs));
}

// Every key exists in every locale, and the margin strings carry the {{ms}} slot.
for (const lang of ['ko', 'en', 'ja']) {
  const texts = JSON.parse(fs.readFileSync(path.join(root, 'locales', lang + '.json'), 'utf8')).result.roundText;
  for (const key of ['marginWin', 'marginLoss', 'causeEarly', 'causeTimeout', 'causeNpcMisfire', 'causeAbility']) assert.ok(texts[key], lang + ' ' + key);
  assert.match(texts.marginWin, /\{\{ms\}\}/); assert.match(texts.marginLoss, /\{\{ms\}\}/);
}
const modal = fs.readFileSync(path.join(root, 'components/game/NpcRoundModal.tsx'), 'utf8');
assert.doesNotMatch(modal, /Δ/, 'the round modal no longer prints a delta symbol');
// A Last Stand win after a timeout has no measured player shot: no margin, cause text, and the screen
// keeps the player time null (shown as "—") instead of a made-up 0 ms.
assert.equal(line({ kind: 'win', playerMs: null, npcMs: 388, lastStand: true }).key, 'result.roundText.causeAbility');
const npcScreen = fs.readFileSync(path.join(root, 'app/game/npc.tsx'), 'utf8');
assert.match(npcScreen, /const pm = o\.reactionMs \?\? null;/);
assert.doesNotMatch(npcScreen, /reactionMs \?\? 0/);
console.log('PASS round result line: measured margins phrased as faster/slower, cause text otherwise, all locales');

// Pause control: outside the 52pt HUD row (a child below its parent's bounds never gets touches on iOS)
// and hidden while a result is on screen.
const arena = fs.readFileSync(path.join(root, 'components/game/NpcFaceoffDuelArena.tsx'), 'utf8');
const hudStart = arena.indexOf('<View pointerEvents="box-none" style={[styles.hud');
const hudEnd = arena.indexOf('</View>\n', arena.indexOf('<Portrait kind="npc"', hudStart));
const pauseAt = arena.indexOf("accessibilityLabel={t('game.pause')}");
assert.ok(hudStart > 0 && pauseAt > hudEnd, 'pause button is not a child of the HUD row');
assert.match(arena, /\{pauseHidden \? null : <Pressable[^>]*accessibilityLabel=\{t\('game\.pause'\)\}/);
assert.match(arena, /top: paddingTop \+ 58, right: paddingRight/);
const screen = fs.readFileSync(path.join(root, 'app/game/npc.tsx'), 'utf8');
assert.match(screen, /pauseHidden=\{phase === '결과' \|\| modalVisible\}/);
console.log('PASS NPC pause control sits outside the HUD row and hides during results');
