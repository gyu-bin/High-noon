const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { PNG } = require('pngjs');
const root = path.resolve(__dirname, '..');
const cache = new Map();
function load(file) {
  if (/\.png$/.test(file)) return file;
  if (!path.extname(file)) file += '.ts';
  if (cache.has(file)) return cache.get(file).exports;
  const m = { exports: {} }; cache.set(file, m);
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function('module', 'exports', 'require', js)(m, m.exports, ref => load(ref.startsWith('@/') ? path.join(root, ref.slice(2)) : path.resolve(path.dirname(file), ref)));
  return m.exports;
}
const { QUICK_DRAW_ALIGNMENT, quickDrawOffsetX, quickDrawBounds, quickDrawContainedLeft } = load(path.join(root, 'constants/npcQuickDrawAlignment.ts'));
const { quickDrawArt, usesNpcQuickDraw, QUICK_DRAW_NPC_IDS, QUICK_DRAW_PLAYER_IDS } = load(path.join(root, 'constants/npcQuickDrawArt.ts'));
const { faceoffPairLayout, faceoffOutwardPlacement } = load(path.join(root, 'constants/npcFaceoffPresentation.ts'));
const stages = ['ready', 'preparation', 'draw', 'aim', 'fire'];
for (const [key, frames] of Object.entries(QUICK_DRAW_ALIGNMENT)) {
  const [kind, textId] = key.split(':'), id = Number(textId);
  const reference = (frames.ready.flip ? 1254 - frames.ready.pelvis : frames.ready.pelvis) / 1254;
  const union = quickDrawBounds(kind, id);
  for (const stage of stages) {
    const art = quickDrawArt(kind, id, stage), measurement = frames[stage];
    assert.equal(art.flipHorizontal, measurement.flip, key + '/' + stage + ' measured orientation matches actual runtime');
    assert.equal(art.offsetX, quickDrawOffsetX(kind, id, stage));
    const registered = (measurement.flip ? 1254 - measurement.pelvis : measurement.pelvis) / 1254 + art.offsetX;
    assert.ok(Math.abs(registered - reference) < 1e-12, key + '/' + stage + ' same measured anatomical anchor after flip');
    const png = PNG.sync.read(fs.readFileSync(art.source));
    assert.equal(png.width, Math.round(1254 * art.artScale)); assert.equal(png.height, png.width);
    const inset = (png.width - 1254) / 2;
    let lo = png.width, hi = -1;
    for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) if (png.data[(y * png.width + x) * 4 + 3] >= 16) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
    lo -= inset; hi -= inset;
    assert.deepEqual(measurement.bounds, [lo, hi + 1], key + '/' + stage + ' metadata covers actual visible PNG pixels');
    const left = (measurement.flip ? 1254 - hi - 1 : lo) / 1254 + art.offsetX;
    const right = (measurement.flip ? 1254 - lo : hi + 1) / 1254 + art.offsetX;
    assert.ok(left >= union[0] - 1e-12 && right <= union[1] + 1e-12, key + '/' + stage + ' registered visible silhouette belongs to shared union');
  }
  for (const width of [320, 375, 393, 402, 430, 768]) {
    const pair = faceoffOutwardPlacement(faceoffPairLayout({ playerId: kind === 'player' ? id : 2, npcId: kind === 'npc' ? id : 2, width, preferredSize: width * .62, paddingLeft: 16, paddingRight: 16, portrait: true }), { width, paddingLeft: 16, paddingRight: 16, portrait: true });
    const input = { kind, id, left: kind === 'player' ? pair.playerLeft : pair.npcLeft, size: pair.size, width, paddingLeft: pair.actorPaddingLeft, paddingRight: pair.actorPaddingRight };
    const original = { ...input }, left = quickDrawContainedLeft(input);
    assert.deepEqual(input, original, 'containment cannot change locked size or input layout');
    assert.ok(left + union[0] * pair.size >= input.paddingLeft - 1e-9);
    assert.ok(left + union[1] * pair.size <= width - input.paddingRight + 1e-9);
    for (const pose of [...stages, 'hit', 'defeat', 'down', 'recover']) assert.equal(quickDrawContainedLeft({ ...input, pose }), left, 'phase including reaction cannot change shared origin');
    assert.equal(quickDrawContainedLeft({ ...input, left }), left, 'safe placement is stable under repeated containment');
  }
}
for (const [kind, id] of [['player', 1], ['npc', 1], ['player', 5], ['npc', 23]]) {
  assert.equal(quickDrawBounds(kind, id), null);
  for (const stage of stages) assert.equal(quickDrawOffsetX(kind, id, stage), 0);
  assert.equal(quickDrawContainedLeft({ kind, id, left: -17, size: 250, width: 402, paddingLeft: 16, paddingRight: 16 }), -17);
}
console.log('PASS actual PNG bounds, post-flip anatomical registration, all-phase viewport containment, immutable scale and pilot/non-target fallback');

assert.deepEqual(QUICK_DRAW_PLAYER_IDS, [1, 2, 3, 4]);
assert.deepEqual(QUICK_DRAW_NPC_IDS, Array.from({ length: 22 }, (_, i) => i + 1));
for (const portrait of [true, false]) for (let playerId = 1; playerId <= 4; playerId++) for (let npcId = 1; npcId <= 22; npcId++) {
  assert.equal(usesNpcQuickDraw(playerId, npcId, portrait), true, 'every NPC duel uses the same compositor in either orientation');
  for (const [kind, id] of [['player', playerId], ['npc', npcId]]) for (const stage of stages) {
    const art = quickDrawArt(kind, id, stage);
    assert.ok(fs.existsSync(art.source), `${kind}:${id}/${stage} registered art exists`);
    assert.ok(Number.isFinite(art.groundFraction) && Number.isFinite(art.muzzle.x) && Number.isFinite(art.muzzle.y));
    assert.ok(art.artScale >= 1);
  }
}
for (const [playerId, npcId] of [[0, 1], [5, 1], [1, 0], [1, 23]]) assert.equal(usesNpcQuickDraw(playerId, npcId, true), false);
for (const id of [15, 19, 20, 22]) {
  assert.equal(quickDrawArt('npc', id, 'aim').source, quickDrawArt('npc', id, 'fire').source);
  assert.doesNotMatch(quickDrawArt('npc', id, 'fire').source, /\/fire\.png$/, 'baked muzzle flashes must never be held or duplicated');
}
assert.equal(quickDrawArt('player', 4, 'fire').flipHorizontal, true, 'player 4 barrel points inward after mirroring');
assert.equal(quickDrawArt('npc', 15, 'fire').flipHorizontal, true, 'NPC 15 clean right-facing aim is mirrored inward');
for (const id of [9, 16, 17, 18, 19, 20, 21, 22]) assert.equal(quickDrawArt('npc', id, 'fire').flipHorizontal, false);
console.log('PASS full 4 × 22 roster coverage in portrait and landscape, expanded-canvas geometry and clean shot-only muzzle effects');

for (const [kind, id] of [['player', 4], ...[9, 15, 16, 17, 18, 19, 20, 21, 22].map(id => ['npc', id])]) {
  const art = quickDrawArt(kind, id, 'fire');
  const png = PNG.sync.read(fs.readFileSync(art.source));
  const inset = (png.width - 1254) / 2;
  const x = Math.round(art.muzzle.x * 1254 + inset), y = Math.round(art.muzzle.y * 1254 + inset);
  let opaque = false;
  for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) {
    if (png.data[((y + dy) * png.width + x + dx) * 4 + 3] >= 128) opaque = true;
  }
  assert.ok(opaque, `${kind}:${id} muzzle connects to the visually reviewed painted barrel`);
}
console.log('PASS full-roster extension muzzle anchors attach to actual opaque source pixels');
