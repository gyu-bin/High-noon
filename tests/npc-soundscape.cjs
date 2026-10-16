const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const flush = async () => { for (let n = 0; n < 12; n++) await Promise.resolve(); };
function player(source) {
  return {
    source, volume: 0, loop: false, playing: false, isLoaded: true, removed: false,
    plays: 0, pauses: 0,
    play() { this.playing = true; this.plays++; },
    pause() { this.playing = false; this.pauses++; },
    remove() { this.removed = true; this.playing = false; },
    async seekTo() {},
  };
}
function load(file, requireDependency, environment = {}) {
  const js = ts.transpileModule(fs.readFileSync(path.join(process.cwd(), file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const m = { exports: {} };
  new Function('module', 'exports', 'require', ...Object.keys(environment), js)(
    m, m.exports, requireDependency, ...Object.values(environment),
  );
  return m.exports;
}
function hookHarness() {
  const ready = deferred(), hooks = [], effects = [], players = [], duckCalls = [];
  let index = 0;
  const state = { phase: '준비', paused: false, focused: true, soundEnabled: true, musicEnabled: true };
  const react = {
    useRef: initial => { const i = index++; return hooks[i] ?? (hooks[i] = { current: initial }); },
    useEffect: (effect, deps) => {
      const i = index++, previous = hooks[i];
      if (!previous || deps.some((value, n) => !Object.is(value, previous.deps[n]))) {
        effects.push(() => { previous?.cleanup?.(); hooks[i] = { deps, cleanup: effect() }; });
      }
    },
  };
  const { useNpcDuelSoundscape: invokeHook } = load('hooks/useNpcDuelSoundscape.ts', name => {
    if (name === 'react') return react;
    if (name === '@react-navigation/native') return { useIsFocused: () => state.focused };
    if (name === 'expo-audio') return { createAudioPlayer: source => { const p = player(source); players.push(p); return p; } };
    if (name === '@/store/settingsStore') return { useSettingsStore: select => select(state) };
    if (name === '@/utils/audioService') return { ensureGameAudioSession: () => ready.promise };
    if (name === '@/utils/bgmService') return { duckBgm: (...args) => duckCalls.push(args) };
    if (name.endsWith('duel_wind.wav')) return name;
    throw new Error('Unexpected soundscape dependency: ' + name);
  });
  return {
    state, ready, players, duckCalls,
    render(update = {}) { Object.assign(state, update); index = 0; invokeHook(state.phase, state.paused); while (effects.length) effects.shift()(); },
    unmount() { for (const hook of hooks) hook?.cleanup?.(); },
  };
}
function clock() {
  let now = 0, id = 0;
  const tasks = new Map();
  const schedule = (fn, delay, interval = false) => { tasks.set(++id, { fn, at: now + delay, interval: interval ? delay : null }); return id; };
  return {
    tasks,
    environment: {
      Date: { now: () => now },
      setTimeout: (fn, delay) => schedule(fn, delay), clearTimeout: key => tasks.delete(key),
      setInterval: (fn, delay) => schedule(fn, delay, true), clearInterval: key => tasks.delete(key),
    },
    advance(ms) {
      const end = now + ms;
      while (true) {
        const entry = [...tasks].filter(([, task]) => task.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!entry) break;
        const [key, task] = entry; now = task.at;
        if (task.interval == null) tasks.delete(key); else task.at += task.interval;
        task.fn();
      }
      now = end;
    },
  };
}
function bgmHarness() {
  const ready = deferred(), timer = clock(), globals = {}, players = [];
  const settings = { musicEnabled: true };
  const api = load('utils/bgmService.ts', name => {
    if (name === 'expo-audio') return { createAudioPlayer: source => { const p = player(source); players.push(p); return p; } };
    if (name === '@/store/settingsStore') return { useSettingsStore: { getState: () => settings } };
    if (name === '@/utils/audioService') return { ensureGameAudioSession: () => ready.promise };
    if (name.startsWith('@/assets/sounds/bgm_')) return name;
    throw new Error('Unexpected BGM dependency: ' + name);
  }, { globalThis: globals, ...timer.environment });
  return { api, ready, timer, players, settings, runtime: () => globals.__highNoonBgmRuntime };
}

(async () => {
  {
    const h = hookHarness(); h.render();
    h.ready.resolve(); await flush();
    const wind = h.players[0];
    assert.equal(wind.loop, true); assert.equal(wind.playing, true); assert.equal(wind.volume, .22);
    assert.deepEqual(h.duckCalls.at(-1), [true, null], 'READY holds music down');
    h.render({ phase: '집중' });
    assert.equal(wind.playing, true); assert.equal(wind.volume, .08, 'STEADY wind is quieter than READY');
    h.render({ phase: '페이크' }); assert.equal(wind.playing, true); assert.equal(wind.volume, .08);
    h.render({ phase: '뱅' }); assert.equal(wind.playing, false); assert.deepEqual(h.duckCalls.at(-1), [true, null]);
    h.render({ phase: '결과' }); assert.equal(wind.playing, false); assert.deepEqual(h.duckCalls.at(-1), [true, null]);
    h.render({ phase: '준비', soundEnabled: false }); assert.equal(wind.playing, false);
    h.render({ soundEnabled: true }); assert.equal(wind.playing, true);
    h.render({ paused: true }); assert.equal(wind.playing, false); assert.deepEqual(h.duckCalls.at(-1), [false, null]);
    h.render({ paused: false }); assert.equal(wind.playing, true);
    h.render({ focused: false }); assert.equal(wind.playing, false); assert.deepEqual(h.duckCalls.at(-1), [false, null]);
    h.render({ focused: true }); assert.equal(wind.playing, true);
    const prior = h.duckCalls.length;
    h.render({ musicEnabled: false }); h.render({ musicEnabled: true });
    assert.equal(h.duckCalls.length, prior + 2, 'music setting changes reapply current phase duck');
    h.render({ phase: '대기' }); assert.equal(wind.playing, false); assert.deepEqual(h.duckCalls.at(-1), [false, null]);
    h.unmount(); assert.equal(wind.removed, true); assert.deepEqual(h.duckCalls.at(-1), [false]);
    console.log('PASS real soundscape READY/STEADY/BANG/result, sound/music settings, pause, focus and cleanup');
  }
  for (const update of [{ phase: '결과' }, { soundEnabled: false }, { paused: true }, { focused: false }]) {
    const h = hookHarness(); h.render(); h.render(update); h.ready.resolve(); await flush();
    assert.equal(h.players[0].playing, false, 'late audio init observes latest ' + JSON.stringify(update));
    h.unmount(); assert.equal(h.players[0].removed, true);
  }
  {
    const h = hookHarness(); h.render(); h.render({ phase: '집중' }); h.ready.resolve(); await flush();
    assert.equal(h.players[0].volume, .08); assert.equal(h.players[0].playing, true); h.unmount();
    const cancelled = hookHarness(); cancelled.render(); cancelled.unmount(); cancelled.ready.resolve(); await flush();
    assert.equal(cancelled.players.length, 0, 'unmounted pending init cannot create an orphan player');
    const failed = hookHarness(); failed.render(); failed.ready.reject(new Error('Audio unavailable')); await flush();
    assert.equal(failed.players.length, 0); failed.unmount();
    console.log('PASS async init uses latest phase/settings and cancels after unmount or audio failure');
  }
  {
    const h = bgmHarness();
    h.api.playBgm('duel'); await flush();
    h.api.duckBgm(true, null);
    assert.equal(h.players.length, 0, 'audio session still pending');
    h.ready.resolve(); await h.runtime().playChain; h.timer.advance(500);
    const music = h.players[0];
    assert.equal(music.playing, true); assert.equal(music.volume, .08, 'held duck survives async track startup/fade');
    h.api.playBgm('duel', { fadeIn: false }); await h.runtime().playChain;
    assert.equal(music.volume, .08, 'same active track cannot escape held duck');
    h.timer.advance(5000); assert.equal(music.volume, .08, 'held duck never auto-releases');
    h.api.duckBgm(false); h.timer.advance(500);
    assert.equal(music.volume, .4); assert.equal(h.runtime().heldDuck, false);
    h.api.stopBgm(); assert.equal(music.removed, true); assert.equal(h.timer.tasks.size, 0);
    console.log('PASS held duck survives pending startTrack and repeated play; explicit release restores music');
  }
  {
    const h = bgmHarness(); h.ready.resolve(); h.api.playBgm('boss'); await h.runtime().playChain;
    assert.notEqual(h.runtime().fadeTimer, null, 'startup fade is active');
    h.timer.advance(50); h.api.duckBgm(true, null);
    const music = h.players[0]; assert.equal(h.runtime().fadeTimer, null); assert.equal(music.volume, .08);
    h.timer.advance(500); assert.equal(music.volume, .08, 'cancelled fade cannot overwrite duck');
    h.api.duckBgm(false); h.timer.advance(500); assert.equal(music.volume, .44);
    h.api.duckBgm(); assert.equal(music.volume, .08);
    h.timer.advance(479); assert.equal(music.volume, .08, 'legacy default still holds for 480ms');
    h.timer.advance(501); assert.equal(music.volume, .44, 'legacy local-mode duck automatically restores base');
    h.api.duckBgm(); h.timer.advance(100); h.api.duckBgm(true, null); h.timer.advance(1000);
    assert.equal(music.volume, .08, 'held duck cancels an earlier legacy release timer');
    h.api.stopBgm(); assert.equal(h.timer.tasks.size, 0);
    console.log('PASS held duck cancels fade/old release; default local duck remains temporary');
  }
  {
    const h = bgmHarness(); h.ready.resolve(); h.api.duckBgm(true, null);
    h.api.playBgm('menu', { fadeIn: false }); await h.runtime().playChain;
    assert.equal(h.players[0].volume, .32, 'held NPC presentation cannot quiet new menu track');
    h.settings.musicEnabled = false; h.api.syncBgmWithSettings();
    assert.equal(h.players[0].removed, true); assert.equal(h.runtime().activeTrack, null);
    h.api.playBgm('duel'); await flush(); assert.equal(h.players.length, 1, 'disabled music cannot start another track');
    const pending = bgmHarness(); pending.api.playBgm('duel'); await flush(); pending.api.stopBgm();
    pending.ready.resolve(); await pending.runtime().playChain;
    assert.equal(pending.players.length, 0, 'stop invalidates pending async track startup');
    console.log('PASS menu baseline, disabled music and cancelled pending startup remain intact');
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
