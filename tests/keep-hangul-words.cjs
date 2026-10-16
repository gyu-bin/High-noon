const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'utils/keepHangulWords.ts'), 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', js)(mod, mod.exports);
const { keepHangulWords } = mod.exports;

const WJ = '⁠';
const out = keepHangulWords('연승하면 점점 버티기 어려워집니다.');
// Text is unchanged once joiners are removed, and spaces stay the only break points.
assert.equal(out.split(WJ).join(''), '연승하면 점점 버티기 어려워집니다.');
assert.equal(out, ['연승하면', '점점', '버티기', '어려워집니다.'].map(w => w.replace(/[가-힣](?=[가-힣])/g, c => c + WJ)).join(' '));
assert.ok(!out.includes(' ' + WJ) && !out.includes(WJ + ' '), 'never joins across a space');
// Latin, digits and punctuation are left alone.
assert.equal(keepHangulWords('BANG 120ms!'), 'BANG 120ms!');
assert.equal(keepHangulWords('공허·썬더'), `공${WJ}허·썬${WJ}더`);
console.log('PASS Hangul words keep together on Android; spaces remain the only Korean break points');
