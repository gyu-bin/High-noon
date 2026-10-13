// Production Pre-Duel silhouettes are measured from the actual PNG sources.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { PNG } = require('pngjs');
const root = path.resolve(__dirname, '..');
const cache = new Map();
const element = (type, props) => ({ type, props });
const mocks = {
  'react/jsx-runtime': { jsx: element, jsxs: element },
  'react-native': { View: 'View', Text: 'Text', StyleSheet: { create: x => x, absoluteFill: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 } } },
  'expo-image': { Image: 'Image' },
  'expo-linear-gradient': { LinearGradient: 'LinearGradient' },
  '@expo/vector-icons': { Ionicons: 'Ionicons' },
  'react-i18next': { useTranslation: () => ({ t: x => x }) },
  '@/utils/characterLabels': { useCharacterLabels: () => ({ name: 'Selected player' }) },
  '@/components/game/DuelCoverImage': { DuelCoverImage: 'DuelCoverImage' },
  '@/components/ui/MenuBackButton': { MenuBackButton: 'MenuBackButton' },
  '@/components/ui/western/WesternPrimitives': { WesternButton: 'WesternButton' },
  '@/constants/fonts': { FONT_RYE: 'Rye', FONT_WESTERN_SERIF: 'Serif', usesCjkFont: () => false },
  '@/constants/theme': { uiV3Colors: {} },
};
function load(file) {
  if (/\.png$/.test(file)) return file;
  if (!path.extname(file)) file += fs.existsSync(file + '.ts') ? '.ts' : '.tsx';
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const out = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function('module', 'exports', 'require', out)(module, module.exports, ref => mocks[ref]
    ?? load(ref.startsWith('@/') ? path.join(root, ref.slice(2)) : path.resolve(path.dirname(file), ref)));
  return module.exports;
}
const { faceoffStandingArt } = load(path.join(root, 'constants/npcFaceoffPoseArt.ts'));
const { npcPreDuelLayout, preDuelAimBounds } = load(path.join(root, 'constants/npcPreDuelPresentation.ts'));
const { NpcPreDuelScreen } = load(path.join(root, 'components/game/NpcPreDuelScreen.tsx'));
const measured = new Map();
function actualBounds(kind, id) {
  const key = `${kind}${id}`;
  if (measured.has(key)) return measured.get(key);
  const art = faceoffStandingArt(kind, id, 'aim');
  const png = PNG.sync.read(fs.readFileSync(art.source));
  const pixels = [png.width, png.height, 0, 0];
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    if (png.data[(y * png.width + x) * 4 + 3] <= 1) continue;
    pixels[0] = Math.min(pixels[0], x); pixels[1] = Math.min(pixels[1], y);
    pixels[2] = Math.max(pixels[2], x + 1); pixels[3] = Math.max(pixels[3], y + 1);
  }
  const side = Math.max(png.width, png.height);
  const bounds = [.5 + (pixels[0] - png.width / 2) / side * art.artScale,
    .5 + (pixels[1] - png.height / 2) / side * art.artScale,
    .5 + (pixels[2] - png.width / 2) / side * art.artScale,
    .5 + (pixels[3] - png.height / 2) / side * art.artScale];
  if (art.flipHorizontal) [bounds[0], bounds[2]] = [1 - bounds[2], 1 - bounds[0]];
  measured.set(key, bounds); return bounds;
}
const close = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-6, `${message}: ${a} vs ${b}`);
let count = 0;
function test(name, fn) { fn(); count++; console.log('PASS ' + name); }
test('all 26 measured production AIM sources include even faint cape and horse alpha', () => {
  for (const kind of ['player', 'npc']) for (let id = 1; id <= (kind === 'player' ? 4 : 22); id++) {
    const actual = actualBounds(kind, id), registered = preDuelAimBounds(kind, id);
    actual.forEach((value, index) => close(value, registered[index], `${kind}${id} bounds${index}`));
  }
});
test('the old half-width flex slots reproduce the three settled native clipping cases', () => {
  for (const [playerId, npcId] of [[2, 9], [3, 15], [4, 22]]) {
    const p = actualBounds('player', playerId), n = actualBounds('npc', npcId);
    // At 402pt, the VS label consumes ~12pt after its old negative margins.
    const playerLeft = 195 - 402 * .64, npcLeft = 207;
    assert.ok(playerLeft + p[0] * 402 * .64 < 0, 'player clips left');
    assert.ok(npcLeft + n[2] * 402 * .58 > 402, 'NPC clips right');
  }
});
let pairs = 0, silhouetteEdges = 0;
test('all 88 pairs fit complete PNG silhouettes, leave VS space, and share feet grounding', () => {
  for (const [width, height] of [[320, 568], [375, 812], [402, 874], [430, 932], [874, 402], [932, 430]]) {
    for (const paddingLeft of [8, 16, 32]) for (let playerId = 1; playerId <= 4; playerId++) for (let npcId = 1; npcId <= 22; npcId++) {
      const layout = npcPreDuelLayout({ width, height, playerId, npcId, paddingLeft, paddingTop: width > height ? 12 : 64 });
      const positions = [];
      for (const [kind, id, actor] of [['player', playerId, layout.player], ['npc', npcId, layout.npc]]) {
        const bounds = actualBounds(kind, id), ground = faceoffStandingArt(kind, id, 'aim').groundFraction;
        const visible = [actor.left + bounds[0] * actor.size, actor.top + bounds[1] * actor.size,
          actor.left + bounds[2] * actor.size, actor.top + bounds[3] * actor.size];
        assert.ok(visible[0] >= layout.regionLeft - 1e-6, `${kind}${id} left clip W${width}`);
        assert.ok(visible[2] <= layout.regionRight + 1e-6, `${kind}${id} right clip W${width}`);
        assert.ok(visible[1] >= layout.regionTop - 1e-6, `${kind}${id} crown collides with copy W${width}`);
        assert.ok(visible[3] < height, `${kind}${id} boot/echo clips bottom`);
        close(actor.top + actor.size * ground, layout.groundY, `${kind}${id} boot ground`);
        assert.ok(actor.size > 0); positions.push(visible); silhouetteEdges += 4;
      }
      assert.ok(positions[1][0] - positions[0][2] >= 40 - 1e-6, 'silhouettes cover VS/opponent');
      assert.ok(layout.vsLeft >= positions[0][2] - 1e-6 && layout.vsLeft + 40 <= positions[1][0] + 1e-6);
      pairs++;
    }
  }
});
test('normal pairs retain preferred presence; broad pairs reduce only as much as fitting requires', () => {
  const pilot = npcPreDuelLayout({ width: 402, height: 874, playerId: 1, npcId: 1, paddingLeft: 12, paddingTop: 64 });
  assert.equal(pilot.scale, 1); assert.equal(pilot.player.size, 402 * .64); assert.equal(pilot.npc.size, 402 * .58);
  for (const [playerId, npcId] of [[2, 9], [3, 15], [4, 22]]) {
    const result = npcPreDuelLayout({ width: 402, height: 874, playerId, npcId, paddingLeft: 12, paddingTop: 64 });
    assert.ok(result.scale < 1); close(result.gap, 40, 'minimum fitting gap');
    close(result.player.size / (402 * .64), result.npc.size / (402 * .58), 'common fit ratio');
    console.log(`  P${playerId}/NPC${npcId}: player=${result.player.size.toFixed(2)} NPC=${result.npc.size.toFixed(2)} ground=${result.groundY.toFixed(2)} gap=${result.gap.toFixed(2)}`);
  }
});
function flatten(style) { return Object.assign({}, ...(Array.isArray(style) ? style : [style]).filter(Boolean)); }
function walk(node, visit) { if (!node || typeof node !== 'object') return; visit(node); for (const child of [node.props?.children].flat()) walk(child, visit); }
test('VS follows actual actor height on broad pairs while sizes, origins and ground stay fitted', () => {
  for (const [playerId, npcId] of [[2, 9], [3, 15], [4, 22]]) {
    const result = npcPreDuelLayout({ width: 402, height: 874, playerId, npcId, paddingLeft: 12, paddingTop: 64 });
    const heads = [['player', playerId, result.player], ['npc', npcId, result.npc]].map(([kind, id, actor]) =>
      actor.top + actualBounds(kind, id)[1] * actor.size);
    const center = result.vsTop + 14;
    close(center, (Math.min(...heads) + result.groundY) / 2, 'VS centers within visible actors');
    assert.ok(center > Math.max(...heads) && center < result.groundY, 'VS stays below both hats and above their feet');
    close(result.groundY, 874 * .69, 'original ground');
    close(result.gap, 40, 'original gap');
  }
});
test('actual Pre-Duel renderer uses fitted sources and boxes while retaining selected background and CTA', () => {
  for (const [playerId, npcId] of [[1, 1], [2, 9], [3, 15], [4, 22]]) {
    const props = { width: 402, height: 874, playerId, npcId, paddingLeft: 12, paddingTop: 64, paddingBottom: 34,
      opponentName: 'Opponent', backgroundId: 'town', onBack() {}, onStart() {} };
    const tree = NpcPreDuelScreen(props), positions = npcPreDuelLayout(props), images = [];
    let background, start;
    walk(tree, node => {
      if (node.type === 'View' && node.props.children?.type === 'Image') images.push(node);
      if (node.type === 'DuelCoverImage') background = node;
      if (node.type === 'WesternButton') start = node;
    });
    assert.equal(images.length, 2);
    images.forEach((node, index) => {
      const kind = index === 0 ? 'player' : 'npc', id = index === 0 ? playerId : npcId;
      const actor = index === 0 ? positions.player : positions.npc;
      const box = flatten(node.props.style), image = node.props.children, art = faceoffStandingArt(kind, id, 'aim');
      assert.equal(image.props.source, art.source); assert.equal(image.props.contentFit, 'contain');
      close(box.left, actor.left, 'render left'); close(box.top, actor.top, 'render top');
      close(box.width, actor.size, 'render nominal square');
      const style = flatten(image.props.style);
      close(style.width, actor.size * art.artScale, 'expanded canvas width');
      close(style.marginHorizontal ?? 0, (actor.size - style.width) / 2, 'expanded canvas centered');
      assert.equal(style.transform?.[0]?.scaleX === -1, art.flipHorizontal);
    });
    assert.equal(background.props.width, props.width); assert.equal(background.props.height, props.height);
    assert.strictEqual(start.props.onPress, props.onStart);
  }
});
test('NPC Select opts into the same cinematic background and dark ambience as the actual Menu only', () => {
  const select = fs.readFileSync(path.join(root, 'app/npc-select.tsx'), 'utf8');
  const menu = fs.readFileSync(path.join(root, 'app/menu.tsx'), 'utf8');
  const background = /<MetaScreenShell[^>]*background=\{(require\([^)]*\))\}/;
  assert.equal(select.match(background)?.[1], menu.match(background)?.[1]);
  assert.ok(!/<MetaScreenShell[^>]*ambience="poster"/.test(select));
  assert.ok(select.includes('centeredNpcIndices') && select.includes('selectPaleRiderUnlocked'), 'navigation/unlock contract remains');
});
console.log(`PASS ${count} Pre-Duel/NPC Select checks; ${measured.size} actual PNG sources; ${pairs} pairs; ${silhouetteEdges} silhouette edges`);
