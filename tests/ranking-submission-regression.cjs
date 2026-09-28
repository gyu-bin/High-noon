// Deterministic regression harness for ranking submission stability.
// Runs the real pvpApi / rankingSubmission / zustand stores against an
// in-memory fake of the Supabase RPCs that mirrors the SQL in
// supabase/migrations (status gate, integer params, Elo K=32, idempotency).
// It is not a live-database test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const TODAY = '2026-09-27';
const DEVICE_KEY = 'a'.repeat(64);

function resolveSource(name) {
  const base = path.join(root, name.slice(2));
  for (const candidate of [base + '.ts', base + '.tsx', path.join(base, 'index.ts')]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error('Cannot resolve ' + name);
}

function isIntegerList(value) {
  return Array.isArray(value) && value.every((v) => v === null || Number.isInteger(v));
}

/** Fake of the deployed RPCs, following the checked-in migration SQL. */
function createFakeServer() {
  const server = {
    offline: false,
    dropNextResponse: false,
    /** false = donor-era server: no pvp_capabilities RPC. */
    v3Baseline: true,
    calls: [],
    profile: {
      id: 'p-me', display_name: 'Dust Fox', character_id: 1,
      rating: 1000, rank_tier: 'silver', wins: 0, losses: 0,
    },
    matches: new Map(),
    completedOrder: [],
    dailyDone: new Map(),
    friend: { code: 'ABC234', samples: [300, 300, 300], expired: false, attempts: new Map() },
  };
  const tier = (r) => (r < 1000 ? 'bronze' : r < 1200 ? 'silver' : r < 1400 ? 'gold' : r < 1600 ? 'platinum' : 'diamond');
  const valid = (ms) => (ms != null && ms >= 80 && ms <= 2500 ? ms : null);
  function score(rounds, samples) {
    let sp = 0, so = 0;
    for (let i = 0; i < Math.min(3, rounds.length); i++) {
      const mine = valid(rounds[i]);
      if (mine == null) so++;
      else if (mine < samples[i]) sp++;
      else if (mine > samples[i]) so++;
      if (sp >= 2 || so >= 2) break;
    }
    return { sp, so, result: sp > so ? 'win' : so > sp ? 'loss' : 'draw' };
  }
  server.addMatch = (id, samples = [300, 300, 300], opponentRating = 1000) => {
    server.matches.set(id, { id, status: 'assigned', samples, opponentRating });
  };
  const handlers = {
    pvp_capabilities: () => {
      if (!server.v3Baseline) throw new Error('Could not find the function public.pvp_capabilities');
      return { contract: 'v3-baseline-20260927', ranked_submit_idempotent: true, forfeit_rpc: true };
    },
    pvp_login_device: () => ({ ...server.profile }),
    pvp_submit_match: (a) => {
      const m = server.matches.get(a.p_opponent_id);
      if (!m || m.status !== 'assigned') throw new Error('match_not_found_or_expired');
      const { sp, so, result } = score(a.p_player_rounds, m.samples);
      const expected = 1 / (1 + Math.pow(10, (m.opponentRating - server.profile.rating) / 400));
      const delta = Math.round(32 * ((result === 'win' ? 1 : result === 'draw' ? 0.5 : 0) - expected));
      const before = server.profile.rating;
      server.profile.rating = Math.max(0, before + delta);
      server.profile.rank_tier = tier(server.profile.rating);
      if (result === 'win') server.profile.wins++;
      if (result === 'loss') server.profile.losses++;
      Object.assign(m, { status: 'complete', result, sp, so, delta });
      server.completedOrder.unshift(m.id);
      return {
        match_id: m.id, rating_before: before, rating_after: server.profile.rating,
        rating_delta: delta, rank_tier: server.profile.rank_tier,
        wins: server.profile.wins, losses: server.profile.losses,
      };
    },
    pvp_history: (a) => server.completedOrder.slice(0, a.limit_count).map((id) => {
      const m = server.matches.get(id);
      return {
        id, opponent_name: 'Ghost', opponent_character_id: 2, result: m.result,
        score_player: m.sp, score_opponent: m.so, rating_delta: m.delta, completed_at: 'x',
      };
    }),
    pvp_submit_daily: (a) => {
      const done = server.dailyDone.get(TODAY);
      if (done) return { ...done, already_completed: true };
      const { sp, so, result } = score(a.p_player_rounds, [250, 250, 250]);
      const row = {
        already_completed: false, challenge_date: TODAY, result,
        score_player: sp, score_opponent: so, avg_ms: null, shared: false, badge: 'daily_duelist',
      };
      server.dailyDone.set(TODAY, row);
      return row;
    },
    pvp_submit_friend_challenge: (a) => {
      if (a.p_code !== server.friend.code) throw new Error('challenge_not_found');
      if (server.friend.expired) throw new Error('challenge_expired');
      const done = server.friend.attempts.get('p-me');
      if (done) return { ...done, already_completed: true };
      const { sp, so, result } = score(a.p_player_rounds, server.friend.samples);
      const row = {
        already_completed: false, code: a.p_code, result, score_player: sp, score_creator: so,
        avg_ms: null, best_ms: null, creator_name: 'Iron Crow', creator_avg_ms: 300, creator_best_ms: 290,
      };
      server.friend.attempts.set('p-me', row);
      return row;
    },
  };
  server.rpc = async (name, args = {}) => {
    server.calls.push({ name, args });
    if (server.offline) return { data: null, error: { message: 'TypeError: Network request failed' } };
    // PostgREST cannot bind a JSON float to integer / integer[] parameters.
    for (const key of ['p_player_rounds', 'p_opponent_rounds', 'p_sample_ms']) {
      if (key in args && !isIntegerList(args[key])) {
        return { data: null, error: { message: 'invalid input syntax for type integer', code: '22P02' } };
      }
    }
    const handler = handlers[name];
    if (!handler) return { data: null, error: { message: 'unknown rpc ' + name } };
    let data;
    try {
      data = handler(args);
    } catch (e) {
      return { data: null, error: { message: e.message } };
    }
    if (server.dropNextResponse) {
      server.dropNextResponse = false;
      return { data: null, error: { message: 'TypeError: Network request failed' } };
    }
    return { data, error: null };
  };
  return server;
}

function createApp() {
  const server = createFakeServer();
  const storage = new Map();
  const asyncStorage = {
    getItem: async (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: async (k, v) => { storage.set(k, v); },
    removeItem: async (k) => { storage.delete(k); },
  };
  const mocks = {
    '@react-native-async-storage/async-storage': { __esModule: true, default: asyncStorage },
    '@/lib/supabase/client': { isSupabaseConfigured: true, getSupabase: () => ({ rpc: server.rpc }) },
    '@/lib/supabase/deviceKey': { getOrCreateDeviceKey: async () => DEVICE_KEY },
    '@/utils/dailyChallenge': {
      utcDateKey: () => TODAY,
      getLocalDaily: async () => { throw new Error('local daily unused'); },
      submitLocalDaily: async () => { throw new Error('local daily unused'); },
    },
    '@/utils/challengeLink': {
      normalizeChallengeCode: (c) => String(c ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6),
    },
  };
  const cache = {};
  function load(name) {
    if (mocks[name]) return mocks[name];
    if (!name.startsWith('@/')) return require(name);
    const file = resolveSource(name);
    if (cache[file]) return cache[file].exports;
    const module = { exports: {} };
    cache[file] = module;
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText;
    // Same realm as the test so Error / Array checks behave like the app.
    new Function('module', 'exports', 'require', 'console', source)(module, module.exports, load, {
      ...console, warn() {},
    });
    return module.exports;
  }
  return {
    server,
    storage,
    payload: load('@/lib/supabase/reactionPayload'),
    api: load('@/lib/supabase/pvpApi'),
    sub: load('@/utils/rankingSubmission'),
    routes: load('@/utils/duelRoutes'),
    pending: () => load('@/store/rankingSubmissionStore').useRankingSubmissionStore.getState().pending,
    pvp: () => load('@/store/pvpStore').usePvpStore.getState(),
  };
}

const flush = () => new Promise((r) => setImmediate(r));
const submitCalls = (app, name) => app.server.calls.filter((c) => c.name === name);

function rankedEntry(app, overrides = {}) {
  return app.sub.buildRankedSubmission({
    matchId: 'm-1', opponentIsBot: false,
    playerRounds: [243.42, 243.72, null], opponentRounds: [300, 300, 300],
    scorePlayer: 2, scoreOpponent: 0, result: 'win', characterId: 3,
    ...overrides,
  });
}

let passed = 0;
async function test(name, fn) {
  await fn();
  passed++;
  console.log('PASS ' + name);
}

(async () => {
  await test('A reaction 243.42ms -> server payload 243', async () => {
    const app = createApp();
    assert.equal(app.payload.normalizeReactionMsForServer(243.42), 243);
    app.server.addMatch('m-1');
    await app.api.pvpSubmitMatch({
      matchId: 'm-1', opponentIsBot: false, playerRounds: [243.42, null, null],
      opponentRounds: [300, 300, 300], scorePlayer: 1, scoreOpponent: 2, result: 'loss', characterId: 1,
    });
    assert.deepEqual(submitCalls(app, 'pvp_submit_match')[0].args.p_player_rounds, [243, null, null]);
  });

  await test('B reaction 243.72ms -> 244; null / NaN keep no-shot meaning', async () => {
    const app = createApp();
    assert.equal(app.payload.normalizeReactionMsForServer(243.72), 244);
    assert.equal(app.payload.normalizeReactionMsForServer(null), null);
    assert.equal(app.payload.normalizeReactionMsForServer(Number.NaN), null);
    assert.deepEqual(app.payload.normalizeSamplesForServer([210.6, null], 280), [211, 280]);
  });

  await test('A0 fake server rejects raw floats (the pre-fix bug)', async () => {
    const app = createApp();
    app.server.addMatch('m-1');
    const { error } = await app.server.rpc('pvp_submit_match', { p_opponent_id: 'm-1', p_player_rounds: [243.42, 250.1, 260.9] });
    assert.match(error.message, /integer/);
  });

  await test('C ranked successful submit settles once', async () => {
    const app = createApp();
    app.server.addMatch('m-1');
    const entry = rankedEntry(app);
    const outcome = await app.sub.submitRankingResult(entry);
    app.sub.applyOutcomeToPvpStore(entry.id, outcome);
    assert.equal(outcome.status, 'submitted');
    assert.equal(outcome.recovered, false);
    assert.equal(outcome.settlement.rating_delta, 16);
    assert.equal(app.server.profile.rating, 1016);
    assert.equal(app.pending().length, 0);
    assert.equal(app.pvp().submissionStatus, 'submitted');
    assert.equal(app.pvp().lastSubmit.rating_after, 1016);
  });

  await test('D ranked failed submit -> pending, no fake rating', async () => {
    const app = createApp();
    app.server.addMatch('m-1');
    app.server.offline = true;
    const entry = rankedEntry(app);
    const outcome = await app.sub.submitRankingResult(entry);
    app.sub.applyOutcomeToPvpStore(entry.id, outcome);
    assert.equal(outcome.status, 'pending_retry');
    assert.equal(app.pvp().submissionStatus, 'pending_retry');
    assert.equal(app.pvp().submissionRetryable, false, 'offline: capability unknown -> no retry button');
    assert.equal(app.pvp().lastSubmit, null);
    const [pending] = app.pending();
    assert.equal(pending.matchId, 'm-1');
    assert.deepEqual(pending.playerRounds, [243, 244, null]);
    assert.equal(pending.kind, 'ranked');
    assert.equal(typeof pending.completedAt, 'number');
    await flush();
    const persisted = app.storage.get('high-noon-ranking-pending-submissions');
    assert.ok(persisted && persisted.includes('m-1'));
    assert.ok(!persisted.includes(DEVICE_KEY), 'device key must not be persisted');
    assert.equal(app.server.profile.rating, 1000);
  });

  await test('E retry success after network returns', async () => {
    const app = createApp();
    app.server.addMatch('m-1');
    app.server.offline = true;
    const entry = rankedEntry(app);
    await app.sub.submitRankingResult(entry);
    app.server.offline = false;
    const outcome = await app.sub.retryPendingSubmission(entry.id);
    assert.equal(outcome.status, 'submitted');
    assert.equal(outcome.settlement.rating_after, 1016);
    assert.equal(app.pending().length, 0);
    assert.equal(app.server.profile.rating, 1016);
  });

  await test('F duplicate retry never double-applies rating (lost response recovered)', async () => {
    const app = createApp();
    app.server.addMatch('m-1');
    app.server.dropNextResponse = true; // server settles, client never hears back
    const entry = rankedEntry(app);
    const first = await app.sub.submitRankingResult(entry);
    assert.equal(first.status, 'pending_retry');
    assert.equal(app.server.profile.rating, 1016);

    const [a, b] = await Promise.all([
      app.sub.retryPendingSubmission(entry.id),
      app.sub.retryPendingSubmission(entry.id),
    ]);
    assert.strictEqual(a, b, 'concurrent retries share one request');
    assert.equal(a.status, 'submitted');
    assert.equal(a.recovered, true);
    assert.equal(a.settlement.rating_before, 1000);
    assert.equal(a.settlement.rating_after, 1016);
    assert.equal(app.server.profile.rating, 1016, 'rating applied exactly once');
    assert.equal(app.server.profile.wins, 1);
    assert.equal(submitCalls(app, 'pvp_submit_match').length, 2);
    assert.equal(app.pending().length, 0);
  });

  await test('F3 donor-era server: ranked retry is kept but never re-sent', async () => {
    const app = createApp();
    app.server.v3Baseline = false;
    app.server.addMatch('m-1');
    app.server.dropNextResponse = true; // settled server-side, response lost
    const entry = rankedEntry(app);
    const first = await app.sub.submitRankingResult(entry);
    app.sub.applyOutcomeToPvpStore(entry.id, first);
    assert.deepEqual(first, { status: 'pending_retry', retryable: false });
    assert.equal(app.pvp().submissionRetryable, false);
    const sentBefore = submitCalls(app, 'pvp_submit_match').length;
    const manual = await app.sub.retryPendingSubmission(entry.id);
    await app.sub.flushPendingSubmissions();
    assert.deepEqual(manual, { status: 'pending_retry', retryable: false });
    assert.equal(submitCalls(app, 'pvp_submit_match').length, sentBefore, 'no re-send');
    assert.equal(app.pending().length, 1, 'kept for after the migration');
    assert.equal(app.server.profile.rating, 1016, 'applied exactly once');

    app.server.v3Baseline = true; // migration applied
    const after = await app.sub.retryPendingSubmission(entry.id);
    assert.equal(after.status, 'submitted');
    assert.equal(app.server.profile.rating, 1016);
    assert.equal(app.pending().length, 0);
  });

  await test('F4 donor-era server: daily/friend retry still allowed', async () => {
    const app = createApp();
    app.server.v3Baseline = false;
    app.server.offline = true;
    const entry = app.sub.buildDailySubmission({
      challengeDate: TODAY, playerRounds: [200, 200, 200], scorePlayer: 2, scoreOpponent: 0, result: 'win',
    });
    assert.deepEqual(await app.sub.submitRankingResult(entry), { status: 'pending_retry', retryable: true });
    app.server.offline = false;
    assert.equal((await app.sub.retryPendingSubmission(entry.id)).status, 'submitted');
  });

  await test('F2 expired assignment -> failed(expired), pending cleared', async () => {
    const app = createApp();
    const entry = rankedEntry(app, { matchId: 'm-gone' });
    const outcome = await app.sub.submitRankingResult(entry);
    assert.deepEqual(outcome, { status: 'failed', reason: 'expired' });
    assert.equal(app.pending().length, 0);
    assert.equal(app.server.profile.rating, 1000);
  });

  await test('G daily submit, idempotent repeat, stale date not sent', async () => {
    const app = createApp();
    const entry = app.sub.buildDailySubmission({
      challengeDate: TODAY, playerRounds: [200.4, 210.6, null],
      scorePlayer: 2, scoreOpponent: 0, result: 'win',
    });
    const first = await app.sub.submitRankingResult(entry);
    assert.equal(first.status, 'submitted');
    assert.equal(first.settlement.already_completed, false);
    assert.deepEqual(submitCalls(app, 'pvp_submit_daily')[0].args.p_player_rounds, [200, 211, null]);
    const again = await app.sub.submitRankingResult(entry);
    assert.equal(again.settlement.already_completed, true);

    const stale = app.sub.buildDailySubmission({
      challengeDate: '2026-09-26', playerRounds: [200, 200, 200],
      scorePlayer: 2, scoreOpponent: 0, result: 'win',
    });
    const before = submitCalls(app, 'pvp_submit_daily').length;
    assert.deepEqual(await app.sub.submitRankingResult(stale), { status: 'failed', reason: 'expired' });
    assert.equal(submitCalls(app, 'pvp_submit_daily').length, before, 'yesterday is never sent to today');
  });

  await test('H friend submit, lost response recovers via already_completed, closed -> failed', async () => {
    const app = createApp();
    app.server.dropNextResponse = true;
    const entry = app.sub.buildFriendSubmission({
      code: 'ABC234', playerRounds: [250.5, 260.2, null],
      scorePlayer: 2, scoreCreator: 0, result: 'win',
    });
    assert.equal((await app.sub.submitRankingResult(entry)).status, 'pending_retry');
    const retried = await app.sub.retryPendingSubmission(entry.id);
    assert.equal(retried.status, 'submitted');
    assert.equal(retried.settlement.already_completed, true);
    assert.deepEqual(submitCalls(app, 'pvp_submit_friend_challenge')[0].args.p_player_rounds, [251, 260, null]);

    app.server.friend.expired = true;
    const other = app.sub.buildFriendSubmission({
      code: 'ABC234', playerRounds: [250, 250, 250], scorePlayer: 2, scoreCreator: 0, result: 'win',
    });
    app.server.friend.attempts.clear();
    assert.deepEqual(await app.sub.submitRankingResult(other), { status: 'failed', reason: 'rejected' });
  });

  await test('I ranked leave -> forfeit settled as a loss by the server', async () => {
    const app = createApp();
    app.server.addMatch('m-1');
    const forfeit = app.sub.buildRankedForfeit({
      matchId: 'm-1', opponentIsBot: false, opponentRounds: [300, 300, 300], characterId: 2,
    });
    assert.deepEqual(forfeit.playerRounds, [null, null, null]);
    const outcome = await app.sub.submitRankingResult(forfeit);
    assert.equal(outcome.status, 'submitted');
    assert.equal(outcome.settlement.rating_delta, -16);
    assert.equal(app.server.profile.losses, 1);
    const repeat = await app.sub.submitRankingResult(forfeit);
    assert.equal(repeat.recovered, true);
    assert.equal(app.server.profile.losses, 1, 'forfeit counted once');
  });

  await test('I2 offline forfeit is kept and flushed later', async () => {
    const app = createApp();
    app.server.addMatch('m-1');
    app.server.offline = true;
    await app.sub.submitRankingResult(app.sub.buildRankedForfeit({
      matchId: 'm-1', opponentIsBot: false, opponentRounds: [300, 300, 300], characterId: 2,
    }));
    assert.equal(app.pending().length, 1);
    app.server.offline = false;
    await app.sub.flushPendingSubmissions();
    assert.equal(app.pending().length, 0);
    assert.equal(app.server.profile.losses, 1);
  });

  await test('J challenge deep link is held during ranking duel and result', async () => {
    const { routes } = createApp();
    for (const p of ['/ranking/duel', '/game/npc', '/game/local', '/ranking/result', '/result/npc']) {
      assert.equal(routes.isDuelFlowRoute(p), true, p);
    }
    for (const p of ['/ranking', '/menu', '/ranking/challenge', '/npc-select']) {
      assert.equal(routes.isDuelFlowRoute(p), false, p);
    }
    assert.equal(routes.isActiveDuelRoute('/ranking/duel'), true);
    assert.equal(routes.isActiveDuelRoute('/ranking/result'), false);
    assert.equal(routes.isInGameRoute('/ranking/duel'), false, 'status bar rule unchanged');
  });

  console.log(passed + ' ranking submission regressions passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
