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
const { quickDrawArt } = load(path.join(root, 'constants/npcQuickDrawArt.ts'));
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
    assert.equal(png.width, 1254); assert.equal(png.height, 1254);
    let lo = 1254, hi = -1;
    for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) if (png.data[(y * png.width + x) * 4 + 3] >= 16) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
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
for (const [kind, id] of [['player', 1], ['npc', 1], ['player', 4], ['npc', 22]]) {
  assert.equal(quickDrawBounds(kind, id), null);
  for (const stage of stages) assert.equal(quickDrawOffsetX(kind, id, stage), 0);
  assert.equal(quickDrawContainedLeft({ kind, id, left: -17, size: 250, width: 402, paddingLeft: 16, paddingRight: 16 }), -17);
}
console.log('PASS actual PNG bounds, post-flip anatomical registration, all-phase viewport containment, immutable scale and pilot/non-target fallback');
