// Exercise measured source bounds through the actual NPC-only layout helpers.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
function load(file) {
  if (/\.png$/.test(file)) return file;
  if (!path.extname(file)) file += '.ts';
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const out = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('module', 'exports', 'require', out)(module, module.exports, ref =>
    load(ref.startsWith('@/') ? path.join(root, ref.slice(2)) : path.resolve(path.dirname(file), ref)));
  return module.exports;
}
const layout = load(path.join(root, 'constants/npcFaceoffPresentation.ts'));
const { NPC_FACEOFF_ART_BOUNDS: frames } = load(path.join(root, 'constants/npcFaceoffArtBounds.ts'));
const art = load(path.join(root, 'constants/characterArtMetadata.ts'));
let count = 0;
function test(name, fn) { fn(); count++; console.log('PASS ' + name); }
test('every production fire barrel aims inward; redesign idle exceptions stay left', () => {
  for (let id = 1; id <= 4; id++) assert.equal(layout.faceoffFlip('player', id, 'fire'), true);
  for (let id = 1; id <= 22; id++) assert.equal(layout.faceoffFlip('npc', id, 'fire'), false);
  for (const id of [9, 19, 20, 22]) for (const pose of ['idle', 'draw']) assert.equal(layout.faceoffFlip('npc', id, pose), false);
  assert.equal(layout.faceoffFlip('player', 1, 'idle'), false);
  assert.equal(layout.faceoffFlip('npc', 1, 'idle'), true);
});
test('expanded canvases retain production scale and share the same ground', () => {
  for (const meta of Object.values(art.REDESIGN_ART_META)) {
    const size = 249.24, ground = 655.5;
    const fraction = layout.faceoffGroundFraction(meta.kind, meta.id);
    assert.equal(fraction, meta.frameGroundY / 1254);
    const rawGround = (meta.canvasSize - 1254) / 2 + meta.frameGroundY;
    const expandedTop = ground - size * fraction - size * (art.characterArtDisplayScale(meta.kind, meta.id) - 1) / 2;
    const displayedGround = expandedTop + rawGround * size / 1254;
    assert.ok(Math.abs(displayedGround - ground) < 1e-9);
  }
});
test('all measured capes, echoes, and defeat poses fit portrait and landscape safe width', () => {
  for (const [width, height] of [[402, 874], [320, 568], [874, 402]]) {
    const size = width > height ? Math.min(height * .6, width * .32) : Math.min(width * .62, height * .4);
    for (const [key, poses] of Object.entries(frames)) {
      const kind = key.startsWith('NPC') ? 'npc' : 'player';
      const id = Number(key.replace(/^(NPC|P)/, ''));
      for (const [pose, bound] of Object.entries(poses)) {
        const renderedPose = kind === 'player' && ['hit', 'down'].includes(pose) ? 'defeat' : pose;
        const left = layout.faceoffContainedLeft({ kind, id, pose: renderedPose, left: width * (kind === 'player' ? .23 : .77) - size / 2, size, width, paddingLeft: 16, paddingRight: 16 });
        const flip = layout.faceoffFlip(kind, id, renderedPose);
        const min = flip ? 1 - bound[1] : bound[0], max = flip ? 1 - bound[0] : bound[1];
        assert.ok(left + min * size >= 16 - .001, `${key} ${pose} clips left at ${width}`);
        assert.ok(left + max * size <= width - 16 + .001, `${key} ${pose} clips right at ${width}`);
      }
    }
  }
});
test('both actors share a scale and wide fire silhouettes leave a central gap', () => {
  for (const [width, height] of [[320, 568], [402, 874], [874, 402]]) {
    const preferredSize = width > height ? Math.min(height * .6, width * .32) : Math.min(width * .62, height * .4);
    for (let playerId = 1; playerId <= 4; playerId++) for (let npcId = 1; npcId <= 22; npcId++) {
      const pair = layout.faceoffPairLayout({ playerId, npcId, width, preferredSize, paddingLeft: 16, paddingRight: 16 });
      assert.ok(pair.size <= preferredSize && pair.size > 0);
      assert.ok(pair.gap >= pair.size * .2 - .001, `overlap P${playerId} NPC${npcId} at ${width}`);
      assert.ok(pair.playerLeft < pair.npcLeft, 'player must stay left');
    }
  }
  const pilot = layout.faceoffPairLayout({ playerId: 1, npcId: 1, width: 402, preferredSize: 402 * .62, paddingLeft: 16, paddingRight: 16 });
  assert.equal(pilot.size, 402 * .62);
});
test('measured fire anchors preserve redesign metadata and raised P02 barrel', () => {
  for (const [id, anchor] of Object.entries(art.NPC_MUZZLE_ANCHOR)) assert.strictEqual(layout.faceoffMuzzleAnchor('npc', Number(id)), anchor);
  assert.strictEqual(layout.faceoffMuzzleAnchor('player', 4), art.PLAYER_MUZZLE_ANCHOR[4]);
  assert.deepEqual(layout.faceoffMuzzleAnchor('player', 2), { x: .061, y: .165 });
  const anchor = layout.faceoffMuzzleAnchor('player', 1);
  assert.ok(1 - anchor.x > .5, 'mirrored player muzzle must be on opponent-facing edge');
});
test('portrait opens more space within the 8% cap and preserves safe full silhouettes', () => {
  for (const [width, height] of [[320, 568], [375, 812], [402, 874], [430, 932]]) {
    for (const padding of [12, 16]) for (let playerId = 1; playerId <= 4; playerId++) for (let npcId = 1; npcId <= 22; npcId++) {
      const input = { playerId, npcId, width, preferredSize: Math.min(width * .62, height * .4), paddingLeft: padding, paddingRight: padding };
      const before = layout.faceoffPairLayout(input);
      const after = layout.faceoffPairLayout({ ...input, portrait: true });
      assert.ok(after.size <= before.size + .001 && after.size >= before.size * .92 - .001, 'portrait reduction exceeds cap');
      assert.ok(after.gap > before.gap, `spacing did not improve P${playerId} NPC${npcId} W${width}`);
      for (const [kind, id, left] of [['player', playerId, after.playerLeft], ['npc', npcId, after.npcLeft]]) {
        const poses = frames[`${kind === 'player' ? 'P' : 'NPC'}${String(id).padStart(2, '0')}`];
        if (!poses) continue;
        for (const [pose, bounds] of Object.entries(poses)) {
          const renderedPose = kind === 'player' && ['hit', 'down'].includes(pose) ? 'defeat' : pose;
          const containedLeft = layout.faceoffContainedLeft({ kind, id, pose: renderedPose, left, size: after.size, width, paddingLeft: padding, paddingRight: padding });
          const flip = layout.faceoffFlip(kind, id, renderedPose);
          const min = flip ? 1 - bounds[1] : bounds[0], max = flip ? 1 - bounds[0] : bounds[1];
          assert.ok(containedLeft + min * after.size >= padding - .001, `${kind}${id} ${pose} clipped left`);
          assert.ok(containedLeft + max * after.size <= width - padding + .001, `${kind}${id} ${pose} clipped right`);
        }
      }
    }
  }
});
test('landscape placement retains the previous measured coordinates and sizes', () => {
  for (const [playerId, npcId, gap] of [[1, 1, 324.4662], [2, 9, 242.49438], [3, 15, 251.532144], [4, 22, 164.784564]]) {
    const result = layout.faceoffPairLayout({ playerId, npcId, width: 874, preferredSize: 241.2, paddingLeft: 16, paddingRight: 16, portrait: false });
    assert.equal(result.size, 241.2);
    assert.ok(Math.abs(result.playerLeft - 80.42) < 1e-9);
    assert.ok(Math.abs(result.npcLeft - 552.38) < 1e-9);
    assert.ok(Math.abs(result.gap - gap) < 1e-9);
  }
});
test('final outward spacing preserves current scale and uses only portrait actor margins', () => {
  for (const [width, height] of [[320, 568], [375, 812], [402, 874], [430, 932]]) {
    for (const padding of [12, 16]) for (const [playerId, npcId] of [[1, 1], [2, 9], [3, 15], [4, 22]]) {
      const input = { playerId, npcId, width, preferredSize: Math.min(width * .62, height * .4), paddingLeft: padding, paddingRight: padding, portrait: true };
      const current = layout.faceoffPairLayout(input);
      const final = layout.faceoffOutwardPlacement(current, input);
      const step = Math.min(width * .025, padding - 2);
      assert.equal(final.size, current.size, 'additional shrinking is forbidden');
      assert.equal(final.playerLeft, current.playerLeft - step);
      assert.equal(final.npcLeft, current.npcLeft + step);
      assert.equal(final.gap, current.gap + step * 2);
      assert.ok(final.actorPaddingLeft >= 2 && final.actorPaddingRight >= 2);
      for (const [kind, id, left] of [['player', playerId, final.playerLeft], ['npc', npcId, final.npcLeft]]) {
        for (const pose of ['idle', 'draw', 'fire']) {
          const bound = frames[`${kind === 'player' ? 'P' : 'NPC'}${String(id).padStart(2, '0')}`]?.[pose] ?? [.17, .83];
          const contained = layout.faceoffContainedLeft({ kind, id, pose, left, size: final.size, width, paddingLeft: final.actorPaddingLeft, paddingRight: final.actorPaddingRight });
          assert.ok(Math.abs(contained - left) < 1e-9, 'standing pose must retain the outward shift');
          const flip = layout.faceoffFlip(kind, id, pose);
          assert.ok(contained + (flip ? 1 - bound[1] : bound[0]) * final.size >= 2 - .001);
          assert.ok(contained + (flip ? 1 - bound[0] : bound[1]) * final.size <= width - 2 + .001);
        }
        const anchor = layout.faceoffMuzzleAnchor(kind, id);
        const muzzleX = left + (layout.faceoffFlip(kind, id, 'fire') ? 1 - anchor.x : anchor.x) * final.size;
        const muzzleY = height * .75 - final.size * layout.faceoffGroundFraction(kind, id) + anchor.y * final.size;
        // Full flash rectangle and maximum animated smoke extent, including upward drift.
        const halfWidth = Math.max(.175, .16 * 1.12) * final.size;
        assert.ok(muzzleX - halfWidth > 0 && muzzleX + halfWidth < width, 'muzzle effect clips horizontally');
        assert.ok(muzzleY - .04 * final.size - .16 * 1.12 * final.size - 14.4 > 0);
        assert.ok(muzzleY + .119 * final.size < height);
      }
    }
  }
  const input = { playerId: 4, npcId: 22, width: 874, preferredSize: 241.2, paddingLeft: 16, paddingRight: 12, portrait: false };
  const current = layout.faceoffPairLayout(input);
  const final = layout.faceoffOutwardPlacement(current, input);
  assert.deepEqual(final, { ...current, actorPaddingLeft: 16, actorPaddingRight: 12 });
});
test('NPC route renders faceoff directly while Ranked and Local retain existing behavior', () => {
  const npcRoute = fs.readFileSync(path.join(root, 'app/game/npc.tsx'), 'utf8');
  assert.match(npcRoute, /import \{ NpcFaceoffDuelArena \}/);
  assert.match(npcRoute, /<NpcFaceoffDuelArena/);
  assert.doesNotMatch(npcRoute, /NpcFirstPersonDuelArena|OVER_SHOULDER|FIRST_PERSON_WEAPON|30deg/);
  for (const file of ['app/ranking/duel.tsx', 'app/game/local.tsx']) assert.doesNotMatch(fs.readFileSync(path.join(root, file), 'utf8'), /presentation="faceoff"/);
  const renderer = fs.readFileSync(path.join(root, 'components/game/NpcFaceoffDuelArena.tsx'), 'utf8');
  assert.doesNotMatch(renderer, /V3_FIRST_PERSON_WEAPON|CINEMATIC_REVOLVER|V3_PLAYER_OVER_SHOULDER|PLAYER_GROUND_REVOLVER/);
  const legacy = fs.readFileSync(path.join(root, 'components/game/NpcFirstPersonDuelArena.tsx'), 'utf8');
  assert.doesNotMatch(legacy, /import \{ NpcFaceoffDuelArena \}|presentation ===/);
});
console.log(`\n${count} NPC faceoff checks passed`);
