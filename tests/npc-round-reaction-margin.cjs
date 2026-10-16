const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../utils/npcRoundReactionMargin.ts'), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const m = { exports: {} }; new Function('module', 'exports', output)(m, m.exports);
const margin = m.exports.npcRoundReactionMargin;
const win = { kind: 'win', playerMs: 286, npcMs: 304 };
assert.equal(margin(win), 18);
assert.equal(margin({ kind: 'loss', reason: 'slower', playerMs: 304, npcMs: 286 }), 18);
for (const override of [{ npcMs: null }, { playerMs: NaN }, { npcMs: Infinity }, { playerMs: -1 }, { npcMisfire: true }, { lastStand: true }, { revive: true }, { playerMs: 305 }, { playerMs: 304 }]) {
  assert.equal(margin({ ...win, ...override }), null);
}
for (const reason of ['early', 'timeout']) assert.equal(margin({ kind: 'loss', reason, playerMs: 304, npcMs: 286 }), null);
assert.equal(margin({ kind: 'loss', reason: 'slower', playerMs: 100, npcMs: 286 }), null);
console.log('PASS NPC round margins use finite actual reaction pairs, excluding special outcomes and missing input');
