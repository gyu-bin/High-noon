// Execute the real overlay with a minimal host/effect harness. Native animation
// timing remains a device QA concern; these checks cover visibility and cleanup.
/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function harness() {
  const pending = [];
  const running = new Set();
  const cancelled = new Set();
  const repeats = [];
  const react = {
    memo: component => component,
    useEffect: effect => pending.push(effect),
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    Fragment: 'Fragment',
  };
  const animated = {
    __esModule: true,
    default: { View: 'AnimatedView' },
    Easing: { cubic: 'cubic', quad: 'quad', out: value => value },
    useSharedValue: initial => {
      let value = initial;
      const shared = {
        get value() { return value; },
        set value(next) {
          if (typeof next === 'object') running.add(shared);
          else value = next;
        },
      };
      return shared;
    },
    useAnimatedStyle: callback => callback(),
    withTiming: (value, options) => ({ kind: 'timing', value, options }),
    withDelay: (delay, animation) => ({ kind: 'delay', delay, animation }),
    withSequence: (...animations) => ({ kind: 'sequence', animations }),
    withRepeat: (animation, count, reverse) => {
      const result = { kind: 'repeat', animation, count, reverse };
      repeats.push(result);
      return result;
    },
    cancelAnimation: shared => { running.delete(shared); cancelled.add(shared); },
  };
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const module = { exports: {} };
    const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    new Function('module', 'exports', 'require', 'React', js)(module, module.exports, ref => {
      if (ref === 'react') return react;
      if (ref === 'react-native') return { View: 'View', StyleSheet: { create: value => value } };
      if (ref === 'react-native-reanimated') return animated;
      if (ref === '@/constants/reanimatedGame') return { RM_GAME: 'never' };
      return load(path.resolve(path.dirname(file), ref + '.ts'));
    }, react);
    cache.set(file, module.exports);
    return module.exports;
  }
  const { VictoryEffectsOverlay } = load(path.resolve(__dirname, '../lib/duelSprite/VictoryEffectsOverlay.tsx'));
  function mount(active, mode = 'player', id = 1) {
    const leaves = [];
    function visit(node) {
      if (node == null || node === false) return;
      if (Array.isArray(node)) return node.forEach(visit);
      if (typeof node.type === 'function') return visit(node.type(node.props));
      if (node.type === 'AnimatedView') leaves.push(node);
      visit(node.props.children);
    }
    const tree = VictoryEffectsOverlay({ mode, id, width: 240, height: 240, active });
    visit(tree);
    const cleanup = pending.splice(0).map(effect => effect()).filter(fn => typeof fn === 'function');
    return { tree, leaves, unmount: () => cleanup.forEach(fn => fn()) };
  }
  return { mount, running, cancelled, repeats };
}

let failed = 0;
function test(name, run) {
  try { run(); console.log('PASS ' + name); }
  catch (error) { failed++; console.error('FAIL ' + name + ': ' + error.message); }
}

test('initially inactive P01 defeat renders no victory ring or smoke', () => {
  const h = harness();
  const view = h.mount(false);
  assert.equal(view.tree, null);
  assert.equal(view.leaves.length, 0);
  assert.equal(h.running.size, 0);
});
test('active P01 victory preserves three puffs, mouth ring and wisp', () => {
  const h = harness();
  const view = h.mount(true);
  assert.equal(view.leaves.length, 5);
  assert.deepEqual(view.leaves.map(leaf => leaf.props.style.at(-1).opacity), [.85, .85, .85, .7, .5]);
  assert.equal(h.running.size, 4);
  assert.ok(h.repeats.every(repeat => repeat.count === -1 && repeat.reverse === false));
  assert.deepEqual(h.repeats.map(repeat => repeat.animation.animations.map(step => step.options.duration)), [
    [0, 1400], [0, 1400], [0, 1400], [0, 1800, 400],
  ]);
  view.unmount();
});
test('victory to inactive removes layers and cancels every repeating animation', () => {
  const h = harness();
  // The inactive parent must remove its children; execute their unmount effects.
  const active = h.mount(true);
  active.unmount();
  assert.equal(h.running.size, 0);
  assert.equal(h.cancelled.size, 4);
  assert.equal(h.mount(false).tree, null);
  const remounted = h.mount(true);
  assert.equal(h.running.size, 4);
  remounted.unmount();
  assert.equal(h.running.size, 0);
  assert.equal(h.cancelled.size, 8);
});
test('NPC victory dust keeps its active effects and inactive NPC has none', () => {
  const h = harness();
  const active = h.mount(true, 'npc', 1);
  assert.equal(active.leaves.length, 6);
  active.unmount();
  assert.equal(h.running.size, 0);
  assert.equal(h.cancelled.size, 6);
  assert.equal(h.mount(false, 'npc', 1).tree, null);
  assert.equal(h.mount(true, 'player', 4).tree, null, 'no new effect spec for P04');
});
if (failed) process.exitCode = 1;
