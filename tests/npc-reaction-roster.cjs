const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const rosterJs = ts.transpileModule(fs.readFileSync(path.join(root, 'constants/npcRoster.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const m = { exports: {} }; new Function('module', 'exports', rosterJs)(m, m.exports);
const roster = m.exports.NPC_ROSTER;
const npcsSource = fs.readFileSync(path.join(root, 'constants/npcs.ts'), 'utf8');

// npcs.ts falls back to its own literal when the roster lacks an id; the two must never disagree,
// because the Wanted card shows npc.reactionMs and the AI simulates around the same value.
const literals = [...npcsSource.matchAll(/npc\((\d+),\s*(\d+),/g)].map(([, id, ms]) => [Number(id), Number(ms)]);
assert.equal(literals.length, 22);
for (const [id, ms] of literals) assert.equal(roster[id - 1][1], ms, `NPC${id} roster ${roster[id - 1][1]} vs npcs.ts ${ms}`);

// Locked values for NPC01-21; NPC22 is the fastest on the roster.
const locked = [410, 395, 380, 355, 340, 325, 310, 298, 285, 270, 258, 248, 235, 225, 215, 205, 198, 192, 185, 180, 175];
assert.deepEqual(roster.slice(0, 21).map(r => r[1]), locked, 'NPC01-21 reaction times unchanged');
assert.equal(roster[21][1], 170);
assert.ok(roster[21][1] < Math.min(...locked), 'the final hidden NPC is the fastest');
assert.match(npcsSource, /npc\(21, 175, [^\n]*'chaosRandom'/); assert.match(npcsSource, /npc\(22, 170, [^\n]*'paleSilence'/);
console.log('PASS NPC reaction roster: npcs.ts and roster agree, NPC01-21 unchanged, NPC22 170ms fastest with its abilities kept');
