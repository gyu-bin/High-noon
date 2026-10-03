const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'utils/npcRoundSimulation.ts'), 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const moduleShim = { exports: {} };
new Function('module', 'exports', output)(moduleShim, moduleShim.exports);
const lifecycle = moduleShim.exports;

let passed = 0;
const test = (name, fn) => { fn(); passed += 1; console.log(`PASS ${name}`); };

test('BANG sample survives the phase transition and resolves without resimulation', () => {
  const slot = { current: null };
  lifecycle.resetNpcRoundSimulation(slot);
  const bangSample = { reactionMs: 201, npcEarlyTap: false };
  lifecycle.recordNpcRoundSimulation(slot, bangSample);
  const resolved = lifecycle.resolveNpcRoundSimulation(slot, () => {
    throw new Error('result phase must not simulate again');
  });
  assert.strictEqual(resolved, bangSample);
  assert.equal(200 < resolved.reactionMs, true, '200 ms player wins the close finish');
});

test('NPC misfire remains the authoritative result through outcome resolution', () => {
  const slot = { current: null };
  const misfire = { reactionMs: null, npcEarlyTap: true };
  lifecycle.recordNpcRoundSimulation(slot, misfire);
  const resolved = lifecycle.resolveNpcRoundSimulation(slot, () => ({ reactionMs: 36, npcEarlyTap: false }));
  assert.strictEqual(resolved, misfire);
  assert.equal(resolved.npcEarlyTap, true);
});

test('an early player tap creates one fallback and the next round resets it', () => {
  const slot = { current: null };
  let simulations = 0;
  const first = lifecycle.resolveNpcRoundSimulation(slot, () => {
    simulations += 1;
    return { reactionMs: 248, npcEarlyTap: false };
  });
  const second = lifecycle.resolveNpcRoundSimulation(slot, () => {
    simulations += 1;
    return { reactionMs: 999, npcEarlyTap: false };
  });
  assert.strictEqual(first, second);
  assert.equal(simulations, 1);
  lifecycle.resetNpcRoundSimulation(slot);
  assert.equal(slot.current, null);
});

test('screen lifecycle resets at round start, not on the BANG to result transition', () => {
  const screen = fs.readFileSync(path.join(root, 'app/game/npc.tsx'), 'utf8');
  assert.match(screen, /const startRoundDuel[\s\S]*?resetNpcRoundSimulation\(npcRoundSimRef\)/);
  assert.doesNotMatch(screen, /phase !== '뱅'[\s\S]{0,100}npcRoundSimRef\.current = null/);
  assert.match(screen, /resolveNpcRoundSimulation\(npcRoundSimRef/);
});

console.log(`\n${passed} NPC round lifecycle checks passed`);
