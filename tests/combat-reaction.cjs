// Combat hit / defeat presentation timelines (utils/combatReaction.ts).
// Pure logic only; the on-screen animation is verified on the Simulator.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'utils/combatReaction.ts'), 'utf8');
const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const m = { exports: {} };
new Function('module', 'exports', out)(m, m.exports);
const c = m.exports;

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('PASS ' + name); };
const seq = (tl, ms) => ms.map((t) => c.stageAt(tl, t, 'none'));

test('NPC survives (hearts left): HIT -> STAGGER -> RECOVER, never kneels/falls', () => {
  const tl = c.npcTimeline(2);
  assert.deepEqual(seq(tl, [0, 200, 500, 3000]), ['hit', 'stagger', 'recover', 'recover']);
  assert.ok(!tl.some((s) => ['kneel', 'fall', 'down'].includes(s.stage)));
});

test('NPC final defeat (0 hearts): HIT -> STAGGER -> KNEEL -> FALL -> DOWN on reference timing', () => {
  const tl = c.npcTimeline(0);
  assert.deepEqual(seq(tl, [0, 199, 200, 419, 420, 719, 720, 999, 1000, 5000]),
    ['hit', 'hit', 'stagger', 'stagger', 'kneel', 'kneel', 'fall', 'fall', 'down', 'down']);
});

test('player survives: impact -> recover within 250 ms, no death stages', () => {
  const tl = c.playerTimeline(1);
  assert.deepEqual(seq(tl, [0, 219, 220]), ['impact', 'impact', 'recover']);
  assert.ok(!tl.some((s) => ['loseGrip', 'collapse', 'groundPov', 'defeat'].includes(s.stage)));
});

test('player death: IMPACT -> LOSE GRIP -> COLLAPSE -> GROUND POV (held) -> DEFEAT inside the 1650 ms window', () => {
  const tl = c.playerTimeline(0);
  assert.deepEqual(seq(tl, [0, 130, 340, 740, 1439, 1440]),
    ['impact', 'loseGrip', 'collapse', 'groundPov', 'groundPov', 'defeat']);
  const pov = tl.find((s) => s.stage === 'groundPov').at;
  const end = tl.find((s) => s.stage === 'defeat').at;
  assert.ok(end - pov >= 300 + 300, 'ground POV visible, then held 300-500 ms+');
  assert.ok(end < c.PLAYER_DEATH_TOTAL_MS && c.PLAYER_DEATH_TOTAL_MS <= 1900 - 250, 'fits reveal->modal window');
});

test('pose mapping: existing hit/kneel reused, fall/down use dedicated art only when registered', () => {
  assert.equal(c.npcPoseForStage('hit'), 'hit');
  assert.equal(c.npcPoseForStage('stagger'), 'hit');
  assert.equal(c.npcPoseForStage('recover'), 'idle');
  assert.equal(c.npcPoseForStage('kneel'), 'kneel');
  assert.equal(c.npcPoseForStage('fall'), 'kneel');
  assert.equal(c.npcPoseForStage('down'), 'kneel');
  assert.equal(c.npcPoseForStage('down', { fall: true, down: true }), 'down');
  assert.equal(c.npcPoseForStage('fall', { fall: true }), 'fall');
});

test('foot-anchored scale: feet stay on the ground line, one box for every pose', () => {
  for (const scale of [1, 1.2, 1.25, 1.3, 1.35]) {
    const b = c.npcLaneBox({ baseSize: 193, footY: 507, scale });
    assert.equal(Math.round(b.top + b.size), 507);
  }
  assert.ok(c.NPC_DUEL_SCALE >= 1.2 && c.NPC_DUEL_SCALE <= 1.35);
});

test('no blood assets referenced by the combat renderer', () => {
  const arena = fs.readFileSync(path.join(root, 'components/game/NpcFirstPersonDuelArena.tsx'), 'utf8');
  const requires = [...arena.matchAll(/require\(['"]([^'"]+)['"]\)/g)].map((x) => x[1]);
  const vfx = fs.readFileSync(path.join(root, 'constants/v3DuelAssets.ts'), 'utf8');
  const vfxFiles = [...vfx.matchAll(/require\(['"]([^'"]+)['"]\)/g)].map((x) => x[1]);
  assert.ok(![...requires, ...vfxFiles].some((f) => /blood|gore/i.test(f)));
});

test('ranked opponent uses the same language: non-final holds hit then idle, only final settles down', () => {
  const arena = fs.readFileSync(path.join(root, 'components/game/NpcFirstPersonDuelArena.tsx'), 'utf8');
  const sprites = fs.readFileSync(path.join(root, 'components/game/CharacterSprites.tsx'), 'utf8');
  // Final flag comes from hearts the engine already settled, never from a new result calculation.
  assert.match(arena, /const npcHitFinal = npcDefeated && isLethalHit\(opponentHearts\)/);
  assert.match(arena, /pose=\{npcDefeated && npcStage === 'recover' \? 'idle' : npcPose\}/);
  assert.match(arena, /defeatSettlesDown=\{npcHitFinal\}/);
  // The sprite only swaps hit -> down when the hit is final; default keeps every other screen unchanged.
  assert.match(sprites, /usePoseOpacity\(displayPose, layers\.down != null && defeatSettlesDown\)/);
  assert.match(sprites, /defeatSettlesDown = true,/);
  // Ranked hearts: 2 wins needed -> 1 heart left after a non-final loss, 0 after the final one.
  assert.deepEqual(seq(c.npcTimeline(1), [0, 200, 500]), ['hit', 'stagger', 'recover']);
  assert.equal(c.npcTimeline(0).at(-1).stage, 'down');
});

console.log(`\n${passed} combat reaction checks passed`);
