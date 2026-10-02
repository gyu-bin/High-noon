const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../utils/duelBackgroundSelection.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exportsObject = {};
vm.runInNewContext(compiled, { exports: exportsObject, Math });
const { pickDuelBackground } = exportsObject;
for (const [random, expected] of [[0,'twilight'],[1/3-1e-9,'twilight'],[1/3,'canyon'],[2/3-1e-9,'canyon'],[2/3,'moonlit'],[1-1e-9,'moonlit']]) {
  let calls = 0;
  assert.equal(pickDuelBackground(() => { calls++; return random; }), expected);
  assert.equal(calls, 1);
}
const counts = { twilight: 0, canyon: 0, moonlit: 0 };
for (let i=0; i<3000; i++) counts[pickDuelBackground(() => (i+0.5)/3000)]++;
assert.deepEqual(counts,{ twilight:1000, canyon:1000, moonlit:1000 });
console.log('PASS: six boundary cases, one RNG call per selection, equal-width thirds (1000 each).');
