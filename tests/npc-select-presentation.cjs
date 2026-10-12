const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const helper = fs.readFileSync(path.join(root, 'utils/npcCarousel.ts'), 'utf8');
const output = ts.transpileModule(helper, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const m = { exports: {} };
new Function('module', 'exports', output)(m, m.exports);
const { boundedNpcIndex, centeredNpcIndices } = m.exports;

assert.equal(boundedNpcIndex(0, -1, 22), 0, 'left at NPC 1 must not wrap to NPC 22');
assert.equal(boundedNpcIndex(21, 1, 22), 21, 'right at NPC 22 must not wrap to NPC 1');
assert.equal(boundedNpcIndex(7, -1, 22), 6);
assert.equal(boundedNpcIndex(7, 1, 22), 8);
assert.deepEqual(centeredNpcIndices(0, 22), [null, null, 0, 1, 2]);
assert.deepEqual(centeredNpcIndices(21, 22), [19, 20, 21, null, null]);
console.log('PASS NPC carousel is bounded and keeps edge focus centered');

const card = fs.readFileSync(path.join(root, 'components/npc/NpcWantedCard.tsx'), 'utf8');
const select = fs.readFileSync(path.join(root, 'app/npc-select.tsx'), 'utf8');
assert.match(card, /const identityHidden = isPale && locked/);
assert.match(card, /disabled=\{locked\}/);
assert.doesNotMatch(select, /<Text style=\{styles\.thumbLocked\}>\?<\/Text>/);
assert.match(select, /itemLocked && item\.id === 22/);
console.log('PASS ordinary locked NPC art remains visible while NPC 22 stays secret and duels stay locked');

const portrait = fs.readFileSync(path.join(root, 'components/npc/NpcPortrait.tsx'), 'utf8');
assert.match(portrait, /source=\{POSTER_NPC_IDENTITIES\[id\]\}/);
assert.match(card, /formatReactionMs\(npc\.reactionMs\)/);
console.log('PASS NPC Select uses production identity posters and configured reaction stats');
