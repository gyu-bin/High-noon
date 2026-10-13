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

// Replay the actual arena with hook/timer adapters; combat inputs remain authoritative.
function createArenaReplay(overrides = {}) {
  const slots = []; let cursor = 0, pending = [], dirty = false, now = 0, nextTimer = 1;
  const timers = new Map(); let props, tree;
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value: typeof initial === 'function' ? initial() : initial };
      return [slots[index].value, value => {
        const next = typeof value === 'function' ? value(slots[index].value) : value;
        if (!Object.is(next, slots[index].value)) { slots[index].value = next; dirty = true; }
      }];
    },
    useRef(value) { const index = cursor++; return (slots[index] ??= { current: value }); },
    useEffect(effect, deps) {
      const index = cursor++, previous = slots[index];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        pending.push(() => { previous?.cleanup?.(); slots[index] = { deps, cleanup: effect() }; });
      }
    },
  };
  const jsx = (type, props) => ({ type, props });
  const reanimated = {
    default: { View: 'AnimatedView' },
    useSharedValue: value => hooks.useRef({ value }).current,
    useAnimatedStyle: fn => fn(), useReducedMotion: () => false,
    cancelAnimation: () => {}, Easing: { out: value => value, cubic: null },
    withTiming: value => value, withSequence: (...values) => values.at(-1),
  };
  const source = fs.readFileSync(path.join(root, 'components/game/NpcFaceoffDuelArena.tsx'), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  const mocks = {
    react: hooks, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'react-native': { Pressable: 'Pressable', Text: 'Text', View: 'View', StyleSheet: { create: x => x, absoluteFill: {}, absoluteFillObject: {} } },
    'react-native-reanimated': { __esModule: true, ...reanimated },
    '@expo/vector-icons': { Ionicons: 'Icon' }, 'expo-image': { Image: 'Image' },
    'expo-linear-gradient': { LinearGradient: 'Gradient' }, 'react-i18next': { useTranslation: () => ({ t: key => key }) },
    '@/components/game/DevNpcDuelInput': { DevNpcDuelInput: () => null },
    './DevNpcDuelInput': { DevNpcDuelInput: () => null },
    './CharacterSprites': { PlayerCharacterSprite: 'PlayerSprite' }, './DuelCoverImage': { DuelCoverImage: 'Background' }, './DuelSignalBoard': { DuelSignalBoard: 'Signal' },
    '@/constants/fonts': { FONT_RYE: 'rye', FONT_WESTERN_SERIF: 'serif', usesCjkFont: () => false },
    '@/constants/clarityCharacterAssets': { CLARITY_NPCS: {}, CLARITY_PLAYERS: {} },
    '@/constants/theme': { uiV3Colors: {} },
    '@/constants/v3DuelAssets': { APPROVED_DUEL_BACKGROUNDS: {}, getV3NpcPose: (id, pose) => `npc${id}-${pose}`, V3_DUEL_VFX: { muzzleFlash: 'runtime-flash', gunSmoke: 'runtime-smoke' } },
    '@/utils/characterLabels': { getCharacterLabels: () => ({ name: 'Player' }) },
    '@/utils/npcLabels': { getNpcDisplayName: () => 'Npc' },
    '@/utils/duelBackgroundSelection': { pickDuelBackground: () => 'twilight' },
  };
  new Function('require', 'module', 'exports', 'setTimeout', 'clearTimeout', '__DEV__', output)(
    ref => mocks[ref] ?? load(path.join(root, ref.slice(2))), module, module.exports,
    (fn, delay) => { const id = nextTimer++; timers.set(id, { fn, at: now + delay }); return id; }, id => timers.delete(id), false,
  );
  props = { width: 402, height: 874, paddingTop: 70, paddingBottom: 34, paddingLeft: 12, paddingRight: 12,
    npcId: 1, playerCharacterId: 1, npcPose: 'idle', playerDefeated: false, signalPhase: '준비', opponentHearts: 3, playerHearts: 3, currentRound: 1, ...overrides };
  const render = () => {
    do { dirty = false; cursor = 0; pending = []; tree = module.exports.NpcFaceoffDuelArena(props); for (const effect of pending) effect(); } while (dirty);
    return tree;
  };
  const allNodes = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(allNodes)];
  render();
  return {
    update(patch) { props = { ...props, ...patch }; return render(); },
    advance(ms) {
      const until = now + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, t]) => t.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        now = due[1].at; timers.delete(due[0]); due[1].fn(); render();
      }
      now = until; return render();
    },
    recoilYs() { return allNodes(tree).filter(node => node.type === 'AnimatedView' && [node.props.style].flat(Infinity).some(style => style?.width > 10 && style?.height > 10)).flatMap(node => [node.props.style].flat(Infinity).flatMap(style => style?.transform ?? []).filter(value => 'translateY' in value).map(value => value.translateY)); },
    shotEffectOpacities() { return allNodes(tree).filter(node => node.type === 'AnimatedView' && ['runtime-flash', 'runtime-smoke'].includes(node.props.children?.props?.source)).flatMap(node => [node.props.style].flat(Infinity).filter(style => typeof style?.opacity === 'number').map(style => style.opacity)); },
    sources() { return allNodes(tree).filter(node => node.type === 'Image' && typeof node.props.source === 'string').map(node => node.props.source); },
    player() { return allNodes(tree).find(node => node.type === 'PlayerSprite')?.props ?? null; },
    npcSource() { return allNodes(tree).find(node => node.type === 'Image' && typeof node.props.source === 'string' && /npc1-|combat\/npc\/01\/|npc_01_left/.test(node.props.source)).props.source; },
  };
}
test('final revealed NPC defeat persists through Continue and resets for new rounds, identities, or restored hearts', () => {
  const replay = createArenaReplay();
  replay.update({ opponentHearts: 0, signalPhase: '결과' });
  assert.match(replay.npcSource(), /npc_01_left/, 'zero hearts must not start the reveal early');
  replay.update({ npcPose: 'defeat' }); replay.advance(1000);
  assert.match(replay.npcSource(), /combat\/npc\/01\/down\.png$/);
  replay.update({ npcPose: 'idle' }); replay.advance(2000);
  assert.match(replay.npcSource(), /combat\/npc\/01\/down\.png$/, 'Continue must not stand the final loser up');
  replay.update({ opponentHearts: 1 });
  assert.match(replay.npcSource(), /npc_01_left/, 'restored heart releases the terminal pose');
  replay.update({ opponentHearts: 0, npcPose: 'defeat' }); replay.advance(1000);
  replay.update({ npcPose: 'idle', currentRound: 2 });
  assert.match(replay.npcSource(), /npc_01_left/, 'new round clears the previous terminal pose');
  replay.update({ currentRound: 1 });
  assert.match(replay.npcSource(), /npc_01_left/, 'returning to the old round must not resurrect the terminal pose');
  replay.update({ npcPose: 'defeat' }); replay.advance(1000);
  replay.update({ npcPose: 'idle', playerCharacterId: 2 });
  assert.match(replay.npcSource(), /npc_01_left/, 'new identity clears the previous terminal pose');
  replay.update({ playerCharacterId: 1 });
  assert.match(replay.npcSource(), /npc_01_left/, 'returning to the old player identity must not resurrect the terminal pose');
  replay.update({ npcPose: 'defeat' }); replay.advance(1000);
  replay.update({ npcPose: 'idle', npcId: 2 });
  replay.update({ npcId: 1 });
  assert.match(replay.npcSource(), /npc_01_left/, 'NPC A→B→A must not restore an old terminal pose');
});
test('final player pose persists through cleared reveal while ordinary hit reactions recover', () => {
  const replay = createArenaReplay();
  replay.update({ playerHearts: 0, signalPhase: '결과' });
  assert.equal(replay.player(), null, 'zero hearts must not reveal player defeat early');
  replay.update({ playerDefeated: true }); replay.advance(1650);
  assert.equal(replay.player().pose, 'defeat'); assert.equal(replay.player().defeatSettlesDown, true);
  replay.update({ playerDefeated: false }); replay.advance(2000);
  assert.equal(replay.player().pose, 'defeat'); assert.equal(replay.player().defeatSettlesDown, true);
  replay.update({ playerHearts: 1 });
  assert.equal(replay.player(), null);
  replay.update({ playerHearts: 0, playerDefeated: true }); replay.advance(1650);
  replay.update({ playerDefeated: false, npcId: 2 });
  assert.equal(replay.player(), null, 'new NPC clears the previous terminal pose');
  replay.update({ npcId: 1 });
  assert.equal(replay.player(), null, 'NPC A→B→A must not restore an old player terminal pose');
  replay.update({ playerDefeated: true }); replay.advance(1650);
  replay.update({ playerDefeated: false, playerCharacterId: 2 });
  replay.update({ playerCharacterId: 1 });
  assert.equal(replay.player(), null, 'player A→B→A must not restore an old terminal pose');
  replay.update({ playerDefeated: true }); replay.advance(1650);
  replay.update({ playerDefeated: false, currentRound: 2 });
  replay.update({ currentRound: 1 });
  assert.equal(replay.player(), null, 'round A→B→A must not restore an old player terminal pose');
  const surviving = createArenaReplay({ signalPhase: '결과', opponentHearts: 1, playerHearts: 1 });
  surviving.update({ npcPose: 'defeat', playerDefeated: true }); surviving.advance(1000);
  assert.match(surviving.npcSource(), /npc_01_left/); assert.equal(surviving.player(), null);
  surviving.update({ npcPose: 'idle', playerDefeated: false });
  assert.match(surviving.npcSource(), /npc_01_left/); assert.equal(surviving.player(), null);
});

test('coherent standing art stays aimed without a shot recoil until actual shot flags arrive', () => {
  const replay = createArenaReplay();
  for (const signalPhase of ['준비', '집중', '뱅']) {
    replay.update({ signalPhase }); replay.advance(0);
    assert.equal(replay.player(), null, 'standing art must not invoke PlayerSprite shoot choreography');
    assert.ok(replay.sources().some(source => /player_01_right/.test(source)));
    assert.ok(replay.sources().some(source => /npc_01_left/.test(source)));
    assert.ok(!replay.recoilYs().some(y => y < -.1), 'held aim must not trigger recoil');
  }
  replay.update({ playerShotActive: true, npcShotActive: true }); replay.advance(0);
  assert.ok(replay.recoilYs().filter(y => Math.abs(y + .7) < .001).length >= 2, 'both actual shots use the existing grounded recoil basis');
  assert.ok(replay.sources().some(source => /player_01_right/.test(source)));
  assert.ok(replay.sources().some(source => /npc_01_left/.test(source)));
  replay.update({ playerShotActive: false, npcShotActive: false }); replay.advance(0);
  assert.ok(!replay.recoilYs().some(y => y < -.1), 'cleared shots stop recoil while aim art remains');
});

test('BANG pose alone keeps baked-flash NPCs in clean aim until their actual shot event', () => {
  const { faceoffStandingArt } = load(path.join(root, 'constants/npcFaceoffPoseArt.ts'));
  for (const npcId of [15, 19, 20, 22]) {
    const replay = createArenaReplay({ npcId, npcPose: 'shoot', signalPhase: '뱅', npcShotActive: false });
    replay.advance(0);
    const held = faceoffStandingArt('npc', npcId, 'aim').source;
    const fired = faceoffStandingArt('npc', npcId, 'fire').source;
    assert.notEqual(held, fired, 'held clean aim must differ from baked fire');
    assert.ok(replay.sources().includes(held)); assert.ok(!replay.sources().includes(fired));
    assert.ok(!replay.recoilYs().some(y => y < -.1));
    replay.update({ npcShotActive: true }); replay.advance(0);
    assert.ok(replay.sources().includes(fired));
    assert.ok(replay.recoilYs().some(y => Math.abs(y + .7) < .001));
  }
});

test('generic NPC STEADY holds existing clean torso FIRE with shot effects off and preserves READY/actual fire', () => {
  const { faceoffStandingArt } = load(path.join(root, 'constants/npcFaceoffPoseArt.ts'));
  const { getV3NpcPose } = load(path.join(root, 'constants/v3DuelAssets.ts'));
  for (const npcId of [2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 16, 17, 21]) {
    const ready = faceoffStandingArt('npc', npcId, 'ready');
    const held = faceoffStandingArt('npc', npcId, 'aim');
    const fired = faceoffStandingArt('npc', npcId, 'fire');
    assert.equal(ready.source, getV3NpcPose(npcId, 'draw'));
    assert.equal(ready.pose, 'draw'); assert.equal(ready.flipHorizontal, true);
    assert.equal(held.source, getV3NpcPose(npcId, 'fire'));
    assert.equal(held.pose, 'fire'); assert.equal(held.flipHorizontal, false);
    assert.deepEqual(held, fired, 'holding clean FIRE must not introduce source/ground/anchor differences');
    assert.equal(held.groundFraction, layout.faceoffGroundFraction('npc', npcId));
    assert.deepEqual(held.muzzle, layout.faceoffMuzzleAnchor('npc', npcId));
    const replay = createArenaReplay({ npcId, npcPose: 'aim', signalPhase: '집중', npcShotActive: false });
    replay.advance(0);
    assert.ok(replay.sources().includes(held.source), `NPC${npcId} must hold its production FIRE in STEADY`);
    assert.ok(!replay.recoilYs().some(y => y < -.1));
    assert.deepEqual(replay.shotEffectOpacities(), [0, 0, 0, 0], 'held aim has no runtime flash or smoke');
  }
  for (const npcId of [20]) {
    assert.equal(faceoffStandingArt('npc', npcId, 'aim').source, getV3NpcPose(npcId, 'draw'), `NPC${npcId} keeps existing clean DRAW`);
  }
});


function createDevInputReplay({ dev = true, enabled = false, ...initial } = {}) {
  const slots = [], timers = new Map(); let cursor = 0, pending = [], now = 0, nextId = 1, calls = [];
  let input = { signalPhase: '준비', shootActive: false, scope: '1:1:1', onShootPress: () => calls.push('original'), ...initial };
  const react = {
    createContext: value => ({ defaultValue: value }), useContext: () => enabled,
    useRef(value) { const i = cursor++; return (slots[i] ??= { current: value }); },
    useEffect(effect, deps) {
      const i = cursor++, previous = slots[i];
      if (!previous || deps.some((value, index) => !Object.is(value, previous.deps[index]))) {
        pending.push(() => { previous?.cleanup?.(); slots[i] = { deps, cleanup: effect() }; });
      }
    },
  };
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(root, 'components/game/DevNpcDuelInput.tsx'), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('require', 'module', 'exports', 'setTimeout', 'clearTimeout', '__DEV__', output)(
    ref => { assert.equal(ref, 'react'); return react; }, module, module.exports,
    (fn, delay) => { const id = nextId++; timers.set(id, { fn, at: now + delay }); return id; }, id => timers.delete(id), dev,
  );
  assert.equal(module.exports.DevNpcDuelInputContext.defaultValue, false, 'production context must default to off');
  const render = (commit = true) => {
    cursor = 0; pending = []; module.exports.DevNpcDuelInput(input);
    if (commit) for (const effect of pending) effect();
  };
  render();
  return {
    calls,
    update(patch, commit = true) { input = { ...input, ...patch }; render(commit); },
    advance(ms) {
      const until = now + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, t]) => t.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        now = due[1].at; timers.delete(due[0]); due[1].fn(); render();
      }
      now = until;
    },
    unmount() { for (const slot of slots) slot?.cleanup?.(); },
  };
}
test('DEV input automation requires opt-in, actual BANG and an armed tap surface', () => {
  for (const options of [
    { dev: false, enabled: true, signalPhase: '뱅', shootActive: true },
    { enabled: false, signalPhase: '뱅', shootActive: true },
    { enabled: true, signalPhase: '집중', shootActive: true },
    { enabled: true, signalPhase: '뱅', shootActive: false },
  ]) {
    const replay = createDevInputReplay(options); replay.advance(1000);
    assert.deepEqual(replay.calls, [], 'unarmed/off/release input must never tap');
  }
  const armed = createDevInputReplay({ enabled: true, signalPhase: '뱅', shootActive: true });
  armed.advance(99); assert.deepEqual(armed.calls, []);
  armed.advance(1); assert.deepEqual(armed.calls, ['original']);
  armed.update({ signalPhase: '집중' }); armed.update({ signalPhase: '뱅' }); armed.advance(1000);
  assert.deepEqual(armed.calls, ['original'], 'one automatic input per scope');
});
test('DEV input uses latest callback/state and cancels old scopes and unmounted timers', () => {
  const latest = createDevInputReplay({ enabled: true, signalPhase: '뱅', shootActive: true });
  latest.update({ onShootPress: () => latest.calls.push('latest') }); latest.advance(100);
  assert.deepEqual(latest.calls, ['latest'], 'the queued input must use the latest handler');
  for (const patch of [{ shootActive: false }, { signalPhase: '결과' }, { scope: '2:1:1' }]) {
    const replay = createDevInputReplay({ enabled: true, signalPhase: '뱅', shootActive: true });
    // A timer already queued on JS can arrive before React runs effect cleanup.
    replay.update(patch, false); replay.advance(100);
    assert.deepEqual(replay.calls, [], 'queued timeout must recheck latest authoritative input state');
  }
  const scoped = createDevInputReplay({ enabled: true, signalPhase: '뱅', shootActive: true });
  scoped.advance(40); scoped.update({ scope: '1:1:2' }); scoped.advance(60);
  assert.deepEqual(scoped.calls, [], 'the prior round timer must be cancelled');
  scoped.advance(40); assert.deepEqual(scoped.calls, ['original'], 'new round arms its own timer');
  const unmounted = createDevInputReplay({ enabled: true, signalPhase: '뱅', shootActive: true });
  unmounted.unmount(); unmounted.advance(1000); assert.deepEqual(unmounted.calls, []);
});

test('corrected P02/P03 FIRE is confined to NPC art selection while shared Local/Ranked mapping stays original', () => {
  const { faceoffStandingArt } = load(path.join(root, 'constants/npcFaceoffPoseArt.ts'));
  const { CLARITY_PLAYERS } = load(path.join(root, 'constants/clarityCharacterAssets.ts'));
  for (const [id, folder] of [[2, '02-v2'], [3, '03']]) {
    assert.equal(CLARITY_PLAYERS[id].fire, path.join(root, `assets/images/characters/clarity/player/${folder}/fire.png`));
    assert.equal(faceoffStandingArt('player', id, 'ready').source, CLARITY_PLAYERS[id].draw, 'READY source remains shared DRAW');
    for (const stage of ['aim', 'fire']) {
      const selected = faceoffStandingArt('player', id, stage);
      assert.equal(selected.source, path.join(root, `assets/images/characters/clarity/player/${folder}/fire-faceoff.png`));
      assert.notEqual(selected.source, CLARITY_PLAYERS[id].fire);
      assert.equal(selected.flipHorizontal, true);
    }
    const replay = createArenaReplay({ playerCharacterId: id, signalPhase: '집중' }); replay.advance(0);
    assert.ok(replay.sources().includes(faceoffStandingArt('player', id, 'aim').source));
    assert.ok(!replay.sources().includes(CLARITY_PLAYERS[id].fire));
  }
  assert.deepEqual(faceoffStandingArt('player', 2, 'fire').muzzle, { x: 37 / 1254, y: 199 / 1254 });
  assert.deepEqual(faceoffStandingArt('player', 3, 'fire').muzzle, { x: 14 / 1254, y: 216 / 1254 });
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'constants/clarityCharacterAssets.ts'), 'utf8'), /fire-faceoff/);
});

test('corrected NPC15/19/22 DRAW is exclusive to NPC aim hold with shared READY and actual FIRE unchanged', () => {
  const { faceoffStandingArt } = load(path.join(root, 'constants/npcFaceoffPoseArt.ts'));
  const { CLARITY_NPCS } = load(path.join(root, 'constants/clarityCharacterAssets.ts'));
  for (const npcId of [15, 19, 22]) {
    assert.equal(CLARITY_NPCS[npcId].draw, path.join(root, `assets/images/characters/clarity/npc/${npcId}-v2/draw.png`));
    assert.equal(faceoffStandingArt('npc', npcId, 'ready').source, CLARITY_NPCS[npcId].draw);
    assert.equal(faceoffStandingArt('npc', npcId, 'fire').source, CLARITY_NPCS[npcId].fire);
    const held = faceoffStandingArt('npc', npcId, 'aim');
    assert.equal(held.pose, 'draw'); assert.equal(held.flipHorizontal, npcId === 15);
    assert.equal(held.source, path.join(root, `assets/images/characters/clarity/npc/${npcId}-v2/draw-faceoff.png`));
    assert.equal(held.groundFraction, layout.faceoffGroundFraction('npc', npcId));
    assert.deepEqual(held.muzzle, layout.faceoffMuzzleAnchor('npc', npcId));
    const replay = createArenaReplay({ npcId, npcPose: 'aim', signalPhase: '집중' }); replay.advance(0);
    assert.ok(replay.sources().includes(held.source));
    assert.ok(!replay.sources().includes(CLARITY_NPCS[npcId].draw));
    assert.deepEqual(replay.shotEffectOpacities(), [0, 0, 0, 0]);
  }
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'constants/clarityCharacterAssets.ts'), 'utf8'), /draw-faceoff/);
});

test('corrected PNG opaque bounds fit locked actor lanes across all 22 opponents and 12/16 point HUD insets', () => {
  const { PNG } = require('pngjs');
  const { faceoffStandingArt } = load(path.join(root, 'constants/npcFaceoffPoseArt.ts'));
  const measured = new Map();
  for (const [kind, id] of [['player', 2], ['player', 3], ['npc', 15], ['npc', 19], ['npc', 22]]) {
    const selected = faceoffStandingArt(kind, id, 'aim');
    const png = PNG.sync.read(fs.readFileSync(selected.source));
    let min = png.width, max = -1;
    for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
      if (png.data[(y * png.width + x) * 4 + 3] > 20) { min = Math.min(min, x); max = Math.max(max, x); }
    }
    assert.ok(max >= min, `${kind}${id} must contain opaque artwork`);
    // scaledArtStyle centers expanded canvases around the fixed production square.
    const sourceMin = .5 + (min / png.width - .5) * selected.artScale;
    const sourceMax = .5 + ((max + 1) / png.width - .5) * selected.artScale;
    measured.set(`${kind}${id}`, selected.flipHorizontal ? [1 - sourceMax, 1 - sourceMin] : [sourceMin, sourceMax]);
  }
  for (const [width, height] of [[320, 568], [402, 874], [430, 932], [874, 402]]) {
    for (const padding of [12, 16]) for (let playerId = 1; playerId <= 4; playerId++) for (let npcId = 1; npcId <= 22; npcId++) {
      const portrait = width < height;
      const input = { playerId, npcId, width, preferredSize: portrait ? Math.min(width * .62, height * .4) : Math.min(height * .6, width * .32), paddingLeft: padding, paddingRight: padding, portrait };
      const pair = layout.faceoffOutwardPlacement(layout.faceoffPairLayout(input), input);
      for (const [kind, id, origin] of [['player', playerId, pair.playerLeft], ['npc', npcId, pair.npcLeft]]) {
        const bounds = measured.get(`${kind}${id}`); if (!bounds) continue;
        const pose = faceoffStandingArt(kind, id, 'aim').pose;
        const left = layout.faceoffContainedLeft({ kind, id, pose: pose === 'faceoff' ? 'fire' : pose, left: origin, size: pair.size, width, paddingLeft: pair.actorPaddingLeft, paddingRight: pair.actorPaddingRight });
        assert.ok(left + bounds[0] * pair.size >= pair.actorPaddingLeft - .001, `${kind}${id} clips left vs NPC${npcId}, W${width} pad${padding}`);
        assert.ok(left + bounds[1] * pair.size <= width - pair.actorPaddingRight + .001, `${kind}${id} clips right vs NPC${npcId}, W${width} pad${padding}`);
      }
    }
  }
});

console.log(`\n${count} NPC faceoff checks passed`);
