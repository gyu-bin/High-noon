const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Execute the production callbacks with a fake clock/store. In particular this
// covers result paths which never pass through either engine shot callback.
const source = fs.readFileSync(path.join(process.cwd(), 'app/game/npc.tsx'), 'utf8');
const syntax = ts.createSourceFile('npc.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const callbacks = {};
let resultEffect;
let autoResultEffect;
let terminalExpression;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.initializer && ts.isCallExpression(node.initializer)) {
    const first = node.initializer.arguments[0];
    if (first && ts.isArrowFunction(first)) callbacks[node.name.getText(syntax)] = first.getText(syntax);
  }
  if (ts.isVariableDeclaration(node) && node.name.getText(syntax) === 'terminalRound') terminalExpression = node.initializer.getText(syntax);
  if (ts.isCallExpression(node) && node.expression.getText(syntax) === 'useEffect') {
    const first = node.arguments[0];
    if (first?.getText(syntax).includes("if (phase !== '결과' || !outcome || !npc) return")) resultEffect = first.getText(syntax);
    if (first?.getText(syntax).includes('!isFocused || !modalVisible || !terminalRound')) autoResultEffect = first.getText(syntax);
  }
  ts.forEachChild(node, visit);
}
visit(syntax);
function bind(expression, context) {
  const js = ts.transpileModule(`const callback = ${expression};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  return new Function('context', `with (context) { ${js}; return callback; }`)(context);
}
function harness({ outcome, simulation, ability = null }) {
  let now = 0, id = 0;
  const timers = new Map(), events = [];
  const state = { playerScore: 0, opponentScore: 0, playerHearts: 3, opponentHearts: 3, abilityUsed: false };
  const ref = current => ({ current });
  const c = {
    phase: '결과', outcome, npc: { id: 1, reactionMs: 300 }, currentRound: 1,
    Date: { now: () => now },
    setTimeout: (fn, delay) => { timers.set(++id, { at: now + delay, fn }); return id; },
    clearTimeout: key => timers.delete(key), queueMicrotask: fn => fn(),
    processedOutcomeKey: ref(''), playerStreakRef: ref(0), npcRoundSimRef: ref(simulation),
    prevBangDelayRef: ref(null), mirrorAdaptiveMsRef: ref(null), earlyOverlayTimerRef: ref(null),
    outcomeRevealTimersRef: ref({ defeat: null, modal: null }), resultReadyAtRef: ref(0),
    deferredModalRef: ref(null), headshotApplyPendingRef: ref(false), shotPresentedRef: ref({ player: false, npc: false }),
    resolveNpcRoundSimulation: slot => slot.current,
    useGameStore: { getState: () => ({ ...state, setScores: c.setScores, setHearts: c.setHearts, setLastReaction: value => { state.lastReaction = value; } }) },
    useSettingsStore: { getState: () => ({ selectedCharacterId: ability === 'last_stand' ? 2 : ability === 'headshot' ? 3 : ability === 'revive' ? 4 : 1 }) },
    useProgressStore: { getState: () => ({ recordGlobalReactionSample() {}, recordNpcBestReaction() {}, markNpcCleared: id => events.push([now, 'cleared', id]) }) },
    setScores: (playerScore, opponentScore) => Object.assign(state, { playerScore, opponentScore }),
    setHearts: (playerHearts, opponentHearts) => Object.assign(state, { playerHearts, opponentHearts }),
    setAbilityUsed: abilityUsed => Object.assign(state, { abilityUsed }),
    setEarlyOverlay() {}, setNpcRoundWinBurstId() {},
    setDefeatedSide: side => { state.defeated = side; events.push([now, 'hit', side]); },
    setModal: data => { state.modal = data; },
    setModalVisible: visible => { state.modalVisible = visible; events.push([now, 'modal', visible]); },
    setAbilityOverlay: overlay => { state.overlay = overlay; },
    setPlayerWeaponShot: active => { state.playerShot = active; },
    setNpcWeaponShot: active => { state.npcShot = active; },
    playGunshot: () => events.push([now, 'gunshot']),
    play: sound => events.push([now, sound]), trigger() {},
    applyAbility: character => ({ lastStandFlipToPlayerWin: character === 2, ghostReviveNullifyLoss: character === 4, headshotRemoveTwoOpponentHearts: character === 3 }),
    buildLastStandWinData: (_data, o, sim) => ({ kind: 'win', playerMs: o.reactionMs ?? 0, npcMs: sim.reactionMs, lastStand: true }),
    WINS_TO_END: 3, NPC_SHOT_TO_HIT_MS: 90, DUEL_DEFEAT_MODAL_DELAY_MS: 1900,
    DUEL_EARLY_MODAL_DELAY_MS: 80, DUEL_HEADSHOT_REVEAL_DELAY_MS: 80,
    lastSteadyToBangDelayMs: null,
    resetNpcRoundSimulation: slot => { slot.current = null; },
    chaosModeRef: ref(null), setChaosBanner() {},
    buildDuelStartParams: () => ({ timing: {}, fakeBangCount: 0, echoBangMiddle: false }),
    startDuelEngine() {},
    routeFocusedRef: ref(true), leavingForResultRef: ref(false), modalDataRef: ref(null),
    adReviveUsedRef: ref(false), adReviveInFlightRef: ref(false), isFocused: true,
    setAdRevivePending: value => { state.adRevivePending = value; c.adRevivePending = value; },
    setAdReviveLoading() {}, showRewardedAd: async () => true,
    battleDayNight: 'day', duelBackgroundId: 'twilight',
    rememberNpcMatchResult: value => events.push([now, 'remember', value]),
    showStageCompleteAd: value => events.push([now, 'ad', value]),
    router: { replace: value => events.push([now, 'route', value]) },
    nextRound: () => { c.currentRound++; events.push([now, 'nextRound']); },
    resetDuel: () => { c.phase = '대기'; },
  };
  c.firePlayerGunshot = bind(callbacks.firePlayerGunshot, c);
  c.fireNpcGunshot = bind(callbacks.fireNpcGunshot, c);
  c.startRoundDuel = bind(callbacks.startRoundDuel, c);
  c.goToMatchResult = bind(callbacks.goToMatchResult, c);
  c.finishMatchToResult = bind(callbacks.finishMatchToResult, c);
  c.onContinue = bind(callbacks.onContinue, c);
  const autoResult = bind(autoResultEffect, c);
  const isTerminal = bind(`() => (${terminalExpression})`, c);
  let committedModal;
  const commitPresentation = () => {
    Object.assign(c, { playerHearts: state.playerHearts, opponentHearts: state.opponentHearts, playerScore: state.playerScore, opponentScore: state.opponentScore, modalVisible: state.modalVisible });
    if (committedModal !== state.modal) { committedModal = state.modal; c.modalDataRef.current = state.modal; }
    c.terminalRound = isTerminal(); autoResult();
  };
  const run = bind(resultEffect, c);
  const completeAbility = bind(callbacks.handleAbilityOverlayComplete, c);
  function advance(ms) {
    const end = now + ms;
    while (true) {
      const entry = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!entry) break;
      const [key, timer] = entry; now = timer.at; timers.delete(key); timer.fn();
    }
    now = end;
  }
  return { c, state, events, run, advance, completeAbility, commitPresentation, startRound: c.startRoundDuel };
}
const win = { reactionMs: 180, earlyTap: false, timeout: false };
const normalNpc = { reactionMs: 300, npcEarlyTap: false };
for (const [name, outcome, simulation, engineShot, expected] of [
  ['player win', win, normalNpc, 'player', 'npc'],
  ['NPC timeout shot', { reactionMs: null, earlyTap: false, timeout: true }, normalNpc, 'npc', 'player'],
  ['timeout without shot', { reactionMs: null, earlyTap: false, timeout: true }, { reactionMs: null, npcEarlyTap: true }, null, 'player'],
  ['early disqualification', { reactionMs: null, earlyTap: true, timeout: false }, normalNpc, null, 'player'],
  ['NPC misfire', win, { reactionMs: null, npcEarlyTap: true }, 'player', 'npc'],
]) {
  const h = harness({ outcome, simulation });
  if (engineShot === 'player') h.c.firePlayerGunshot();
  if (engineShot === 'npc') h.c.fireNpcGunshot();
  const cleanup = h.run(); h.run();
  assert.equal(h.events.filter(e => e[1] === 'gunshot').length, 1, name + ': exactly one winning shot');
  h.advance(89); assert.equal(h.state.defeated, undefined, name + ': shot visible before hit');
  h.advance(1); assert.equal(h.state.defeated, expected, name + ': loser reacts within recoil');
  assert.equal(h.events.filter(e => e[1] === 'heart_break').length, 1);
  h.advance(1809); assert.notEqual(h.state.modalVisible, true, name + ': result waits for fall');
  h.advance(1); assert.equal(h.state.modalVisible, true);
  assert.equal(h.state.defeated, expected, name + ': loser remains down in result');
  assert.equal(h.state.playerScore, expected === 'npc' ? 1 : 0);
  assert.equal(h.state.opponentScore, expected === 'player' ? 1 : 0);
  cleanup();
  console.log('PASS production result flow: ' + name);
}
for (const ability of ['last_stand', 'headshot', 'revive']) {
  const h = harness({ outcome: ability === 'headshot' ? win : { reactionMs: null, earlyTap: false, timeout: true }, simulation: normalNpc, ability });
  h.run(); h.advance(90);
  assert.equal(h.state.defeated, ability === 'revive' ? 'player' : 'npc');
  h.advance(1010); h.completeAbility();
  h.advance(799); assert.notEqual(h.state.modalVisible, true, ability + ': overlay cannot expose Continue before fall');
  h.advance(1); assert.equal(h.state.modalVisible, true);
  assert.equal(h.state.defeated, ability === 'revive' ? 'player' : 'npc', ability + ': no late standing reset');
  assert.equal(h.state.playerScore, ability === 'revive' ? 0 : 1);
  assert.equal(h.state.opponentScore, 0);
  console.log('PASS production ability flow: ' + ability);
}
{
  const h = harness({ outcome: win, simulation: normalNpc });
  h.run(); h.advance(1900);
  h.startRound();
  assert.equal(h.state.playerShot, false);
  assert.equal(h.state.npcShot, false);
  h.c.currentRound = 2; h.c.npcRoundSimRef.current = normalNpc;
  h.c.firePlayerGunshot(); h.run(); h.advance(1900);
  assert.equal(h.events.filter(e => e[1] === 'gunshot').length, 2, 'same winner fires once in each round');
  assert.equal(h.state.playerScore, 2);
  console.log('PASS production round start resets both shot latches for a fresh muzzle event');
}

for (const [name, initial, outcome, won] of [
  ['third win', { playerScore: 2 }, win, true],
  ['last opponent heart', { opponentHearts: 1 }, win, true],
  ['last player heart timeout', { playerHearts: 1 }, { reactionMs: null, earlyTap: false, timeout: true }, false],
  ['third loss', { opponentScore: 2 }, { reactionMs: null, earlyTap: true, timeout: false }, false],
]) {
  const h = harness({ outcome, simulation: normalNpc }); Object.assign(h.state, initial);
  h.run(); h.advance(1899); h.commitPresentation();
  assert.equal(h.events.filter(e => e[1] === 'route').length, 0, name + ': fall is not cut short');
  h.advance(1); h.commitPresentation(); h.commitPresentation(); h.c.onContinue();
  const routes = h.events.filter(e => e[1] === 'route');
  assert.equal(routes.length, 1, name + ': routes automatically once without tapping Continue');
  assert.equal(routes[0][2].pathname, '/result/npc'); assert.equal(routes[0][2].params.won, won ? '1' : '0');
  assert.equal(h.events.filter(e => e[1] === 'ad').length, 1);
  assert.equal(h.events.filter(e => e[1] === 'remember').length, 1);
  assert.equal(h.state.defeated, won ? 'npc' : 'player', name + ': no standing frame before navigation');
  assert.equal(h.events.filter(e => e[1] === 'nextRound').length, 0);
  if (name === 'third loss') assert.equal(routes[0][2].params.lossReason, 'early');
  console.log('PASS automatic terminal presentation: ' + name);
}
{
  const h = harness({ outcome: win, simulation: normalNpc });
  h.run(); h.advance(1900); h.commitPresentation();
  assert.equal(h.state.modalVisible, true); assert.equal(h.c.terminalRound, false);
  assert.equal(h.events.filter(e => e[1] === 'route').length, 0);
  h.c.onContinue(); h.c.onContinue();
  assert.equal(h.events.filter(e => e[1] === 'nextRound').length, 1, 'intermediate Continue is consumed exactly once');
  console.log('PASS intermediate rounds retain one Continue action');
}
for (const ability of ['last_stand', 'headshot']) {
  const h = harness({ outcome: ability === 'headshot' ? win : { reactionMs: null, earlyTap: false, timeout: true }, simulation: normalNpc, ability });
  Object.assign(h.state, ability === 'headshot' ? { opponentHearts: 2 } : { playerScore: 2 });
  h.run(); h.advance(1100); h.commitPresentation();
  assert.equal(h.events.filter(e => e[1] === 'route').length, 0);
  h.completeAbility(); h.completeAbility(); h.advance(799); h.commitPresentation();
  assert.equal(h.events.filter(e => e[1] === 'route').length, 0);
  h.advance(1); h.commitPresentation();
  assert.equal(h.events.filter(e => e[1] === 'route').length, 1, ability + ': routes after ability and fall resolve');
  assert.equal(h.events.find(e => e[1] === 'route')[2].params.won, '1');
  if (ability === 'headshot') assert.equal(h.state.opponentHearts, 0, 'duplicate completion cannot apply extra headshot damage');
  console.log('PASS automatic terminal ability: ' + ability);
}
{
  const h = harness({ outcome: { reactionMs: null, earlyTap: false, timeout: true }, simulation: normalNpc, ability: 'revive' });
  Object.assign(h.state, { playerHearts: 1, opponentScore: 2 });
  h.run(); h.advance(2480); h.completeAbility(); h.advance(0); h.commitPresentation();
  assert.equal(h.events.filter(e => e[1] === 'route').length, 0, 'ghost revive nullifies terminal loss');
  assert.equal(h.state.modalVisible, true); assert.equal(h.state.playerHearts, 1); assert.equal(h.state.opponentScore, 2);
  console.log('PASS ghost revive preserves intermediate round flow');
}
{
  const h = harness({ outcome: win, simulation: normalNpc }); h.state.playerScore = 2;
  h.run(); h.advance(1900); h.c.routeFocusedRef.current = false; h.c.isFocused = false; h.commitPresentation();
  h.c.onContinue(); h.c.goToMatchResult({ won: true });
  assert.equal(h.events.filter(e => e[1] === 'route').length, 0, 'blur prevents both automatic and late callback routing');
  console.log('PASS blurred route cannot auto-navigate or replay a stale callback');
}
{
  const h = harness({ outcome: { reactionMs: null, earlyTap: false, timeout: true }, simulation: normalNpc });
  Object.assign(h.state, { playerScore: 2, opponentScore: 2, playerHearts: 3 });
  h.run(); h.advance(1900); h.commitPresentation(); h.commitPresentation();
  assert.deepEqual(h.state.adRevivePending, { ps: 2, ns: 3 });
  assert.equal(h.events.filter(e => e[1] === 'route').length, 0, 'eligible close loss still offers revive');
  const decline = bind(callbacks.onAdReviveDecline, h.c); decline(); decline();
  assert.equal(h.events.filter(e => e[1] === 'route').length, 1, 'decline routes once');
  console.log('PASS automatic terminal flow preserves ad revive choice and decline');
}

(async () => {
  for (const blur of [false, true]) {
    const h = harness({ outcome: { reactionMs: null, earlyTap: false, timeout: true }, simulation: normalNpc });
    Object.assign(h.state, { playerScore: 2, opponentScore: 2, playerHearts: 3 });
    h.run(); h.advance(1900); h.commitPresentation();
    let resolveReward, requests = 0;
    h.c.showRewardedAd = () => { requests++; return new Promise(resolve => { resolveReward = resolve; }); };
    const watch = bind(callbacks.onAdReviveWatchAd, h.c);
    const first = watch(), duplicate = watch();
    assert.equal(requests, 1, 'double callback cannot request two ads');
    if (blur) h.c.routeFocusedRef.current = false;
    resolveReward(true); await Promise.all([first, duplicate]);
    assert.equal(h.events.filter(e => e[1] === 'route').length, 0);
    if (blur) {
      assert.equal(h.state.opponentScore, 3, 'late blurred reward cannot mutate/restart match');
      assert.equal(h.c.adReviveUsedRef.current, false);
    } else {
      assert.equal(h.state.opponentScore, 2, 'reward rolls back only the terminal loss');
      assert.equal(h.state.playerHearts, 1); assert.equal(h.c.adReviveUsedRef.current, true);
      await watch(); assert.equal(requests, 1, 'already consumed reward cannot replay');
      assert.equal(h.state.opponentScore, 2);
    }
  }
  console.log('PASS rewarded continuation is single-use and ignores late blurred callbacks');
})().catch(error => { console.error(error); process.exitCode = 1; });
