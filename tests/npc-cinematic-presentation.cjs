const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const moduleSource = fs.readFileSync(path.join(root, 'utils/npcCinematicPresentation.ts'), 'utf8');
const output = ts.transpileModule(moduleSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const m = { exports: {} }; new Function('module', 'exports', output)(m, m.exports);
const { cinematicShotEdge, cinematicVisualState, cinematicLayerTop, CINEMATIC_TIMING } = m.exports;
let latch = { scope: 'round1', active: false };
const event = (active, scope = 'round1', hidden = false) => {
  const next = cinematicShotEdge(latch, { scope, active }, hidden); latch = next.latch; return next.fire;
};
assert.equal(event(false), false, 'BANG cue without an authoritative shot cannot fire');
assert.equal(cinematicVisualState({ aiming: true, bangCue: true }), 'BANG_CUE');
assert.equal(event(true), true, 'actual rising shot triggers once');
for (let i = 0; i < 20; i++) assert.equal(event(true), false, 'sticky RESULT shot flags cannot retrigger');
assert.equal(event(true, 'round2'), false, 'scope reset cannot replay stale active flags');
assert.equal(event(false, 'round2'), false);
assert.equal(event(true, 'round2', true), false, 'hidden defeated actor cannot start shot FX');
assert.equal(event(true, 'round2'), false, 'revealing a hidden actor cannot replay its old shot');
assert.equal(event(false, 'round2'), false);
assert.equal(event(true, 'round2'), true, 'fresh actual shot can trigger after rearming');
console.log('PASS cue/shot separation, sticky flag, scoped reset and hidden defeat suppression');
assert.equal(cinematicVisualState({ aiming: false }), 'READY');
assert.equal(cinematicVisualState({ aiming: true }), 'AIM');
assert.equal(cinematicVisualState({ preparation: true }), 'DRAW_PREPARATION');
assert.equal(cinematicVisualState({ drawing: true, bang: true }), 'QUICK_DRAW');
assert.equal(cinematicVisualState({ bang: true }), 'AIM');
assert.equal(CINEMATIC_TIMING.quickDrawLift + CINEMATIC_TIMING.quickDrawExtend, CINEMATIC_TIMING.quickDraw);
assert.equal(cinematicVisualState({ aiming: true, shooting: true }), 'SHOT');
assert.equal(cinematicVisualState({ aiming: true, recovering: true }), 'RECOVER');
assert.equal(cinematicVisualState({ aiming: true, hit: true, shooting: true }), 'HIT');
assert.equal(cinematicVisualState({ aiming: true, defeated: true, shooting: true }), 'FINAL_DEFEAT');
for (const ground of [.94, .96, .98]) assert.ok(Math.abs(cinematicLayerTop(250, .96, ground) + 250 * ground - 250 * .96) < 1e-9, 'every source keeps exactly the same foot');
assert.equal(CINEMATIC_TIMING.fireEnter + CINEMATIC_TIMING.fireHold + CINEMATIC_TIMING.recover, 280);
console.log('PASS distinct reaction priorities, stable foot anchors and short FIRE recovery');
const renderer = fs.readFileSync(path.join(root, 'components/game/NpcCinematicActor.tsx'), 'utf8');
assert.match(renderer, /cinematicShotEdge/);
assert.match(renderer, /if \(!edge\.fire\) return/);
assert.match(renderer, /if \(timer\.current\) clearTimeout/);
assert.match(renderer, /fireArt\.muzzle/);
assert.doesNotMatch(renderer, /signalPhase|onShootPress|rotate|translateY:.*fire/);
assert.match(renderer, /layer\(readyArt/); assert.match(renderer, /layer\(aimArt/); assert.match(renderer, /layer\(fireArt/);
console.log('PASS compositor mounts all pose layers, cancels scoped effects and keeps fixed FIRE muzzle anchors');

// Execute the real compositor with persistent hooks, controllable Animated.Value
// objects and a fake clock. This tests lifecycle behavior beyond helper snapshots.
function actorHarness(initialProps = {}) {
  let time = 0, nextTimer = 1, hookIndex = 0, dirty = false, writes = [];
  const scheduled = new Map(), hooks = [], effects = [], values = [];
  const timeout = (fn, delay) => { const id = nextTimer++; scheduled.set(id, { at: time + delay, fn }); return id; };
  const cancel = id => scheduled.delete(id);
  const read = value => value && typeof value.read === 'function' ? value.read() : value;
  class Value {
    constructor(initial) { this.current = initial; this.timer = null; this.animation = null; this.writes = []; values.push(this); }
    setValue(value) { this.current = value; this.animation = null; this.writes.push(value); }
    stopAnimation() { this.current = this.read(); this.animation = null; if (this.timer != null) cancel(this.timer); this.timer = null; }
    read() {
      if (!this.animation) return this.current;
      const { from, to, start, duration } = this.animation;
      const progress = Math.max(0, Math.min(1, (time - start) / duration));
      return from + (to - from) * progress;
    }
    interpolate({ inputRange, outputRange }) { return { read: () => outputRange[0] + (this.read() - inputRange[0]) / (inputRange[1] - inputRange[0]) * (outputRange[1] - outputRange[0]) }; }
  }
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useRef: initial => { const i = hookIndex++; return hooks[i] ?? (hooks[i] = { current: initial }); },
    useState: initial => {
      const i = hookIndex++;
      if (!hooks[i]) hooks[i] = { state: initial };
      return [hooks[i].state, next => {
        const value = typeof next === 'function' ? next(hooks[i].state) : next;
        writes.push(value);
        if (!Object.is(value, hooks[i].state)) { hooks[i].state = value; dirty = true; }
      }];
    },
    useEffect: (effect, deps) => {
      const i = hookIndex++, previous = hooks[i];
      if (!previous || deps.some((value, index) => value !== previous.deps[index])) {
        effects.push(() => { previous?.cleanup?.(); hooks[i] = { deps, cleanup: effect() }; });
      }
    },
  };
  const animated = {
    Value, View: 'AnimatedView',
    add: (a, b) => ({ read: () => read(a) + read(b) }),
    subtract: (a, b) => ({ read: () => read(a) - read(b) }),
    multiply: (a, b) => ({ read: () => read(a) * read(b) }),
    timing: (value, options) => ({ start: () => {
      value.stopAnimation();
      if (!options.duration) value.setValue(options.toValue);
      else { value.animation = { from: value.current, to: options.toValue, start: time, duration: options.duration }; value.timer = timeout(() => { value.timer = null; value.setValue(options.toValue); }, options.duration); }
    } }),
  };
  const source = fs.readFileSync(path.join(root, 'components/game/NpcCinematicActor.tsx'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText;
  const actorModule = { exports: {} };
  new Function('module', 'exports', 'require', 'React', 'setTimeout', 'clearTimeout', compiled)(actorModule, actorModule.exports, ref => {
    if (ref === 'react') return react;
    if (ref === 'react-native') return { Animated: animated, StyleSheet: { create: x => x }, View: 'View' };
    if (ref === 'expo-image') return { Image: 'Image' };
    if (ref === 'react-native-reanimated') return { useReducedMotion: () => false };
    if (ref === 'react-native-svg') return { __esModule: true, default: 'Svg', Path: 'Path' };
    if (ref === '@/constants/characterArtMetadata') return { scaledArtStyle: (width, height) => ({ width, height }) };
    if (ref === '@/constants/v3DuelAssets') return { V3_DUEL_VFX: { gunSmoke: 'smoke' } };
    if (ref === '@/utils/npcCinematicPresentation') return m.exports;
    throw new Error('Unexpected actor dependency: ' + ref);
  }, react, timeout, cancel);
  const art = (name, ground, x, y) => ({ source: name, groundFraction: ground, muzzle: { x, y }, artScale: 1, flipHorizontal: false });
  let props = { readyArt: art('ready', .94, .6, .5), preparationArt: art('preparation', .93, .6, .5), drawArt: art('draw', .92, .7, .4), aimArt: art('aim', .96, .9, .3), fireArt: art('fire', .95, .75, .25), size: 240, groundFraction: .96, preparation: false, bang: false, holding: false, shotActive: false, scope: 'round1', direction: 'right', ...initialProps };
  // Like React: state set by effects re-renders before the tree is committed.
  function render(update = {}) {
    props = { ...props, ...update };
    for (let pass = 0; ; pass++) {
      assert.ok(pass < 10, 'actor state settles');
      dirty = false; hookIndex = 0;
      const tree = actorModule.exports.NpcCinematicActor(props);
      while (effects.length) effects.shift()();
      if (!dirty) return tree;
    }
  }
  function advance(ms) {
    const end = time + ms;
    while (true) {
      const eligible = [...scheduled].filter(([, task]) => task.at <= end).sort((a, b) => a[1].at - b[1].at || a[0] - b[0]);
      if (!eligible.length) break;
      const [id, task] = eligible[0]; time = task.at; scheduled.delete(id); task.fn();
    }
    time = end;
  }
  function unmount() { for (const hook of hooks) hook?.cleanup?.(); }
  return { render, advance, unmount, values, scheduled, read, props: () => props, writes: () => writes };
}
const flatStyle = node => Object.assign({}, ...[node.props.style].flat().filter(Boolean));
function imageLayers(tree, source) {
  const found = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    const children = node.props?.children ?? [];
    if (node.type === 'AnimatedView' && children.some(child => child?.type === 'Image' && child.props.source === source)) found.push(node);
    for (const child of children.flat()) visit(child);
  }
  visit(tree); return found;
}
function opacity(h, tree, source) { return h.read(flatStyle(imageLayers(tree, source)[0]).opacity); }
// Effective body opacity per pose source, including the actor's own hidden wrapper.
function effectivePoseOpacities(h, tree) {
  const result = {};
  function visit(node, inherited = 1) {
    if (!node || typeof node !== 'object') return;
    const ownOpacity = flatStyle(node).opacity;
    const visible = inherited * (ownOpacity == null ? 1 : h.read(ownOpacity));
    if (node.type === 'Image' && ['ready', 'preparation', 'draw', 'aim', 'fire'].includes(node.props.source)) result[node.props.source] = visible;
    for (const child of (node.props?.children ?? []).flat()) visit(child, visible);
  }
  visit(tree);
  return result;
}
// Exactly one body is fully visible and every other one is fully hidden: no blank, no double body.
function onlyPose(h, expected, message) {
  const alphas = effectivePoseOpacities(h, h.render());
  for (const source of ['ready', 'preparation', 'draw', 'aim', 'fire']) assert.equal(alphas[source], source === expected ? 1 : 0, message + ': ' + source);
}
const FLASH = 0, SMOKE = 1;
{
  const h = actorHarness(); const initial = h.render();
  assert.equal(opacity(h, initial, 'ready'), 1);
  assert.equal(opacity(h, initial, 'preparation'), 0);
  const steady = h.render({ preparation: true });
  assert.equal(opacity(h, steady, 'ready'), 0);
  assert.equal(opacity(h, steady, 'preparation'), 1, 'STEADY visibly differs from READY in the same commit');
  // Fake BANG text remains the preparation prop; it never arms the draw.
  h.render({ preparation: true, bang: false }); h.advance(1000);
  onlyPose(h, 'preparation', 'fake cue stays holstered');
  assert.equal(h.values[FLASH].read(), 0); assert.equal(h.values[SMOKE].read(), 0);
  h.render({ preparation: false, bang: true });
  onlyPose(h, 'draw', 'true BANG immediately exposes the draw');
  h.advance(CINEMATIC_TIMING.quickDraw - 1); onlyPose(h, 'draw', 'draw holds until the 120ms endpoint');
  h.advance(1); onlyPose(h, 'aim', 'draw reaches AIM at its declared duration');
  assert.equal(h.values[FLASH].read(), 0); assert.equal(h.values[SMOKE].read(), 0, 'BANG never automatically fires');
  const draws = h.writes().filter(value => value === 'draw').length;
  h.render({ bang: true }); h.advance(1000);
  assert.equal(h.writes().filter(value => value === 'draw').length, draws, 'same BANG render does not replay draw');
  h.render({ bang: false, holding: true }); h.advance(1000);
  onlyPose(h, 'aim', 'RESULT holds AIM until reaction renderer takes over');
  for (const [source, ground] of [['ready', .94], ['preparation', .93], ['draw', .92], ['aim', .96], ['fire', .95]]) {
    const style = flatStyle(imageLayers(initial, source)[0]);
    assert.ok(Math.abs(style.top + ground * 240 - .96 * 240) < 1e-9, source + ' sole remains fixed');
  }
  h.unmount(); assert.equal(h.scheduled.size, 0);
  console.log('PASS real compositor distinct READY/STEADY, fake suppression, true quickdraw/AIM, fixed soles and no automatic shot');
}
for (const delay of [0, 20, 80]) {
  const h = actorHarness(); h.render(); h.render({ preparation: false, bang: true }); h.advance(delay);
  const shot = h.render({ shotActive: true });
  assert.equal(opacity(h, shot, 'fire'), 1, 'actual input during draw is immediate at ' + delay + 'ms');
  assert.equal(opacity(h, shot, 'draw'), 0);
  assert.equal(h.values[FLASH].read(), 1, 'actual flash appears synchronously at ' + delay + 'ms');
  const glow = shot.props.children.find(node => node?.props?.style?.some?.(style => style?.borderRadius != null));
  const glowStyle = flatStyle(glow);
  assert.ok(Math.abs(glowStyle.left + 240 * .095 - 240 * .75) < 1e-9);
  assert.ok(Math.abs(glowStyle.top + 240 * .095 - (240 * (.96 - .95) + 240 * .25)) < 1e-9);
  h.advance(120);
  onlyPose(h, 'fire', 'cancelled draw callback cannot overwrite shot pose');
  h.advance(50 + CINEMATIC_TIMING.recover); onlyPose(h, 'aim', 'FIRE returns to the aimed hold');
  for (let i = 0; i < 5; i++) { h.render({ shotActive: true, bang: false, holding: true }); h.advance(100); }
  assert.equal(h.writes().filter(value => value === true).length, 1, 'sticky RESULT cannot replay shot');
  onlyPose(h, 'aim', 'sticky RESULT keeps AIM'); assert.equal(h.values[SMOKE].read(), 0);
  h.unmount(); assert.equal(h.scheduled.size, 0);
}
console.log('PASS 0/20/80ms quickdraw interruption, immediate FIRE/flash anchor and sticky RESULT recovery');
{
  const h = actorHarness(); h.render(); h.render({ bang: true }); h.advance(20);
  h.render({ bang: false, holding: true }); h.advance(100);
  onlyPose(h, 'aim', 'outcome hold lets an existing non-shot draw finish');
  h.render({ hidden: true });
  assert.ok(h.values.every(value => value.read() === 0), 'defeat cancels shot effects');
  assert.equal(h.render().props.style.opacity, 0, 'reaction hides standing compositor');
  h.advance(1000); assert.equal(h.render().props.style.opacity, 0, 'late draw cannot revive');
  h.render({ hidden: false, scope: 'round2', holding: false, bang: false, shotActive: false });
  assert.equal(opacity(h, h.render(), 'ready'), 1, 'fresh round starts READY');
  h.render({ bang: true }); h.advance(20); h.render({ shotActive: true }); h.advance(40);
  h.render({ hidden: true });
  assert.ok(h.values.every(value => value.read() === 0), 'defeat cancels draw/shot timers and effects');
  h.advance(1000);
  const fires = h.writes().filter(value => value === true).length;
  h.render({ hidden: false, holding: true });
  assert.equal(h.writes().filter(value => value === true).length, fires, 'revealing cannot replay shot');
  onlyPose(h, 'aim', 'late recovery cannot revive defeated FIRE');
  h.render({ scope: 'round3', shotActive: true, holding: false, bang: false }); h.advance(1000);
  onlyPose(h, 'ready', 'scope reset suppresses stale shot');
  h.render({ shotActive: false }); h.render({ shotActive: true });
  onlyPose(h, 'fire', 'fresh shot rearms');
  h.unmount(); assert.equal(h.scheduled.size, 0);
  const pending = actorHarness(); pending.render(); pending.render({ bang: true }); pending.advance(20); pending.unmount();
  assert.equal(pending.scheduled.size, 0, 'unmount cancels pending draw transition');
  console.log('PASS result draw hold, defeat/scope cleanup, fresh-round rearm and pending draw unmount');
}
{
  const h = actorHarness(); h.render();
  onlyPose(h, 'ready', 'READY contains one character silhouette');
  h.render({ preparation: true });
  for (const ms of [0, 1, 15, 40, 80]) { h.advance(ms); onlyPose(h, 'preparation', 'STEADY never blends a second body'); }
  h.render({ preparation: false, bang: true });
  let previous = 0;
  for (const ms of [0, 1, 20, 40, 60, 80, 119]) {
    h.advance(ms - previous); previous = ms;
    onlyPose(h, 'draw', 'extraction is distinct and exclusive at ' + ms + 'ms');
    assert.equal(h.values[FLASH].read(), 0, 'no flash during BANG extraction');
    assert.equal(h.values[SMOKE].read(), 0, 'no smoke during BANG extraction');
  }
  h.advance(1); onlyPose(h, 'aim', 'AIM appears exactly at the 120ms quickdraw endpoint');
  h.render({ holding: true, bang: false }); h.advance(1000);
  onlyPose(h, 'aim', 'outcome survivor holds aimed pose without ghosting');
  h.unmount(); assert.equal(h.scheduled.size, 0);
}
for (const delay of [0, 20, 80]) {
  const h = actorHarness(); h.render(); h.render({ bang: true }); h.advance(delay);
  h.render({ shotActive: true });
  onlyPose(h, 'fire', 'actual shot interrupts draw immediately at ' + delay + 'ms');
  assert.equal(h.values[FLASH].read(), 1, 'muzzle flash shares the first actual FIRE frame');
  assert.equal(h.values[SMOKE].read(), .32, 'actual shot emits smoke immediately');
  let previous = 0;
  for (const ms of [1, 20, 60, 120, 170, 220, 279]) {
    h.advance(ms - previous); previous = ms;
    onlyPose(h, 'fire', 'recoil recovery never overlays two bodies at ' + ms + 'ms');
  }
  h.advance(1); onlyPose(h, 'aim', 'exclusive shot recovery completes at 280ms');
  h.advance(1000); h.render({ shotActive: true, bang: false, holding: true });
  onlyPose(h, 'aim', 'sticky authoritative flag does not repeat shot');
  assert.equal(h.values[FLASH].read(), 0); assert.equal(h.values[SMOKE].read(), 0);
  h.render({ hidden: true });
  assert.ok(Object.values(effectivePoseOpacities(h, h.render())).every(alpha => alpha === 0), 'defeated actor has no standing layer');
  h.render({ hidden: false, scope: 'round2', bang: false, holding: false, shotActive: true });
  onlyPose(h, 'ready', 'new round ignores stale shot flags');
  h.render({ shotActive: false }); h.render({ shotActive: true }); onlyPose(h, 'fire', 'fresh actual edge rearms');
  h.unmount(); assert.equal(h.scheduled.size, 0, 'all animation and quickdraw callbacks are cancelled');
}
console.log('PASS non-overlapping silhouettes at intermediate frames, exact120ms draw, instant0/20/80ms shot and cleanup');
for (const staleOnReveal of [false, true]) {
  const h = actorHarness();
  h.render(); h.render({ bang: true }); h.advance(120); h.render({ shotActive: true }); h.advance(20);
  h.render({ hidden: true, bang: false, holding: true });
  h.render({ scope: 'round2', hidden: true, shotActive: true, holding: false });
  h.render({ hidden: false, bang: false, preparation: false, shotActive: staleOnReveal });
  onlyPose(h, 'ready', 'uncovering a new READY cannot reveal stale AIM or latched shot');
  h.advance(1000); onlyPose(h, 'ready', 'old draw/recovery callbacks cannot revive new-round AIM');
  assert.equal(h.values[FLASH].read(), 0); assert.equal(h.values[SMOKE].read(), 0);
  h.render({ shotActive: false }); h.render({ bang: true }); h.advance(20); h.render({ shotActive: true });
  onlyPose(h, 'fire', 'fresh authoritative shot still interrupts new-round draw');
  h.unmount(); assert.equal(h.scheduled.size, 0);
}
console.log('PASS scope reset underneath hidden HIT clears stale AIM/shot, preserves READY and rearms actual shots');
// Every prop sequence of a round, sampled at each timer boundary: never zero bodies, never two.
{
  const h = actorHarness();
  const steps = [
    [{ preparation: true }, 300], [{ preparation: false, bang: true }, 60], [{ shotActive: true }, 400],
    [{ bang: false, holding: true }, 500], [{ hidden: true }, 300], [{ hidden: false, holding: false, scope: 'round2', shotActive: false }, 0],
    [{ preparation: true }, 200], [{ preparation: false, bang: true }, 200], [{ bang: false, holding: true }, 300],
    [{ holding: false, scope: 'round3' }, 0], [{ bang: true }, 10], [{ shotActive: true }, 300],
  ];
  h.render();
  for (const [update, wait] of steps) {
    h.render(update);
    for (let t = 0; t <= wait; t += 5) {
      const alphas = effectivePoseOpacities(h, h.render());
      const hidden = h.props().hidden;
      const shownBodies = Object.values(alphas).filter(alpha => alpha === 1).length;
      assert.ok(Object.values(alphas).every(alpha => alpha === 0 || alpha === 1), 'no partial (blended) body');
      if (!hidden) assert.equal(shownBodies, 1, 'exactly one body is visible after ' + JSON.stringify(update) + ' +' + t + 'ms');
      h.advance(5);
    }
  }
  h.unmount(); assert.equal(h.scheduled.size, 0);
  console.log('PASS whole-round sweep: exactly one fully visible body at every 5ms sample, never blank or blended');
}


{
  const { PNG } = require('pngjs');
  const artCache = new Map();
  function loadArt(file) {
    if (/\.png$/.test(file)) return file;
    if (!path.extname(file)) file += '.ts';
    if (artCache.has(file)) return artCache.get(file).exports;
    const item = { exports: {} }; artCache.set(file, item);
    const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    new Function('module', 'exports', 'require', js)(item, item.exports, ref => loadArt(ref.startsWith('@/') ? path.join(root, ref.slice(2)) : path.resolve(path.dirname(file), ref)));
    return item.exports;
  }
  const { cinematicPilotArt } = loadArt(path.join(root, 'constants/npcCinematicPilotArt.ts'));
  for (const kind of ['player', 'npc']) {
    const sources = new Set();
    for (const stage of ['ready', 'preparation', 'draw', 'aim', 'fire']) {
      const selected = cinematicPilotArt(kind, stage); sources.add(selected.source);
      const png = PNG.sync.read(fs.readFileSync(selected.source));
      assert.ok(png.width > 0 && png.height > 0);
      let bottom = -1;
      for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) if (png.data[(y * png.width + x) * 4 + 3] > 127) bottom = Math.max(bottom, y);
      assert.ok(Math.abs(selected.groundFraction - ((Math.max(png.width, png.height) - png.height) / 2 + bottom + 1) / Math.max(png.width, png.height)) <= 1 / Math.max(png.width, png.height), kind + ' ' + stage + ' ground uses actual opaque sole');
      assert.ok(selected.muzzle.x > 0 && selected.muzzle.x < 1 && selected.muzzle.y > 0 && selected.muzzle.y < selected.groundFraction);
    }
    assert.equal(sources.size, 5, kind + ' has five real distinct production sources');
  }
  console.log('PASS pilot five distinct PNG sources, exact opaque sole metadata and contained measured muzzle coordinates');
  const { quickDrawArt, usesNpcQuickDraw } = loadArt(path.join(root, 'constants/npcQuickDrawArt.ts'));
  let supported = 0;
  for (let player = 1; player <= 4; player++) for (let npc = 1; npc <= 22; npc++) {
    const expected = [1, 2, 3].includes(player) && [1, 2, 4].includes(npc);
    assert.equal(usesNpcQuickDraw(player, npc, true), expected, 'portrait quickdraw supports registry actors independently: P' + player + '/NPC' + npc);
    assert.equal(usesNpcQuickDraw(player, npc, false), false, 'landscape retains legacy renderer');
    supported += Number(expected);
  }
  assert.equal(supported, 9, 'exactly9 approved portrait pairs use this batch registry');
  assert.equal(usesNpcQuickDraw(0, 1, true), false);
  assert.equal(usesNpcQuickDraw(1, 23, true), false);
  for (const kind of ['player', 'npc']) for (const stage of ['ready', 'preparation', 'draw', 'aim', 'fire']) {
    assert.deepEqual(quickDrawArt(kind, 1, stage), cinematicPilotArt(kind, stage), 'P01/NPC01 art and anchors are preserved: ' + kind + '/' + stage);
  }
  for (const [kind, ids] of [['player', [2, 3]], ['npc', [2, 4]]]) for (const id of ids) {
    const poses = {};
    for (const stage of ['ready', 'preparation', 'draw', 'aim', 'fire']) {
      const selected = quickDrawArt(kind, id, stage); poses[stage] = selected;
      assert.ok(selected, kind + id + '/' + stage + ' resolves approved production art');
      const png = PNG.sync.read(fs.readFileSync(selected.source));
      assert.equal(selected.artScale, 1, 'measured anchors share the unscaled contained canvas');
      let bottom = -1;
      for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) if (png.data[(y * png.width + x) * 4 + 3] > 127) bottom = Math.max(bottom, y);
      const canvas = Math.max(png.width, png.height);
      const actualGround = ((canvas - png.height) / 2 + bottom + 1) / canvas;
      assert.ok(Math.abs(selected.groundFraction - actualGround) <= 1 / canvas, kind + id + '/' + stage + ' ground uses the actual opaque sole');
      assert.ok(selected.muzzle.x > 0 && selected.muzzle.x < 1 && selected.muzzle.y > 0 && selected.muzzle.y < selected.groundFraction, kind + id + '/' + stage + ' barrel lies inside the contained canvas');
    }
    assert.notEqual(poses.ready.source, poses.preparation.source, kind + id + ' READY/STEADY uses visually different art');
    assert.notEqual(poses.preparation.source, poses.aim.source, kind + id + ' STEADY cannot reuse an already aimed pose');
    assert.notEqual(poses.aim.source, poses.fire.source, kind + id + ' shot recoil has a distinct FIRE source');
  }
  console.log('PASS exact9-pair portrait gate, preserved pilot art, batch actual PNG sole/barrel metadata and distinct preparation/AIM/FIRE');

}

// Evaluate the actual arena JSX expressions, including fake BANG labels, rather
// than reproducing its phase mapping in a test helper.
{
  const arenaFile = path.join(root, 'components/game/NpcFaceoffDuelArena.tsx');
  const arenaSource = fs.readFileSync(arenaFile, 'utf8');
  const syntax = ts.createSourceFile(arenaFile, arenaSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const actors = [];
  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(syntax) === 'NpcCinematicActor') actors.push(node);
    ts.forEachChild(node, visit);
  }
  visit(syntax); assert.equal(actors.length, 2);
  function value(actor, name, signalPhase, playerShotActive, npcShotActive) {
    const property = actor.attributes.properties.find(item => item.name?.getText(syntax) === name);
    assert.ok(property?.initializer && ts.isJsxExpression(property.initializer));
    const expression = property.initializer.expression.getText(syntax);
    return new Function('signalPhase', 'playerShotActive', 'npcShotActive', 'return (' + expression + ');')(signalPhase, playerShotActive, npcShotActive);
  }
  for (const actor of actors) {
    for (const phase of ['idle', '준비', '집중', '페이크', '뱅', '결과']) {
      assert.equal(value(actor, 'bang', phase, false, false), phase === '뱅', 'only genuine engine BANG begins draw');
      assert.equal(value(actor, 'preparation', phase, false, false), phase === '집중' || phase === '페이크');
      assert.equal(value(actor, 'holding', phase, false, false), phase === '결과');
      assert.equal(value(actor, 'shotActive', phase, false, false), false, 'signal alone cannot inject an automatic shot');
    }
  }
  assert.equal(value(actors[0], 'shotActive', '뱅', true, false), true);
  assert.equal(value(actors[1], 'shotActive', '뱅', true, false), false);
  assert.equal(value(actors[0], 'shotActive', '뱅', false, true), false);
  assert.equal(value(actors[1], 'shotActive', '뱅', false, true), true);
  console.log('PASS actual arena JSX true/fake phase mapping and independent authoritative player/NPC shot wiring');
}

// Exercise the real compositor: registration must move the sprite and every
// barrel effect equally in screen coordinates, even when source art is mirrored.
for (const flipHorizontal of [false, true]) {
  const fireArt = { source: 'registered-fire', groundFraction: .95, muzzle: { x: .75, y: .25 }, artScale: 1, flipHorizontal };
  const h = actorHarness({ fireArt });
  h.render();
  const before = h.render({ bang: true, shotActive: true });
  const after = h.render({ fireArt: { ...fireArt, offsetX: -.075 } });
  function nodes(tree) {
    const result = [];
    function walk(node) {
      if (!node || typeof node !== 'object') return;
      result.push(node);
      for (const child of (node.props?.children ?? []).flat(Infinity)) walk(child);
    }
    walk(tree); return result;
  }
  const actorBefore = flatStyle(imageLayers(before, 'registered-fire')[0]);
  const actorAfter = flatStyle(imageLayers(after, 'registered-fire')[0]);
  assert.equal(actorAfter.left - actorBefore.left, -18, 'post-flip sprite shift is not mirrored again');
  assert.equal(actorAfter.top, actorBefore.top, 'anatomical X registration cannot alter the sole Y');
  assert.deepEqual(actorAfter.transform, actorBefore.transform, 'registration preserves existing direction and scale');
  const effectNodes = tree => nodes(tree).filter(node => node.type === 'AnimatedView' && (
    flatStyle(node).backgroundColor === '#F7B34D' ||
    (node.props.children ?? []).some(child => child?.type === 'Svg' || (child?.type === 'Image' && child.props.source === 'smoke'))
  ));
  const effectsBefore = effectNodes(before), effectsAfter = effectNodes(after);
  assert.equal(effectsBefore.length, 3, 'flash, glow and smoke are exercised');
  effectsBefore.forEach((node, i) => {
    const a = flatStyle(node), b = flatStyle(effectsAfter[i]);
    assert.ok(Math.abs(b.left - a.left + 18) < 1e-9, 'barrel VFX follows the same registered screen X as FIRE');
    assert.equal(b.top, a.top, 'muzzle Y remains unchanged');
  });
  assert.equal(h.values[FLASH].read(), 1, 'registration changes do not suppress actual shot flash');
  h.unmount();
}
console.log('PASS actual compositor registered sprite/flash/glow/smoke attachment for both source orientations');
