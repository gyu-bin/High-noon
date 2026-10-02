// Friend Challenge V3 (UNRANKED record duel) — the real client modules
// (pvpApi, rankingSubmission, stores, friendChallenge, challengeLink) against
// the real migration SQL on PostgreSQL (PGlite, pgcrypto), RPCs executed as
// the anon role like PostgREST. Not a device UI test.
//
//   PGLITE_DIR=<folder with @electric-sql/pglite@0.3> node tests/friend-challenge-v3.cjs
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const pgliteDir = process.env.PGLITE_DIR ? path.join(process.env.PGLITE_DIR, 'node_modules') : undefined;
const loadPkg = (id) => require(pgliteDir ? require.resolve(id, { paths: [pgliteDir] }) : id);
const { PGlite } = loadPkg('@electric-sql/pglite');
const { pgcrypto } = loadPkg('@electric-sql/pglite/contrib/pgcrypto');

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const PLATFORM = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema if not exists extensions;
  grant usage on schema extensions to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;
// Same chain as the deployed remote: V3 baseline + Ghost Snapshot V2.
const CHAIN = [
  PLATFORM,
  read('supabase/migrations/20260830_bounty_ranking_v3_base.sql'),
  read('supabase/migrations/20260831_daily_and_profile.sql'),
  read('supabase/migrations/20260907_analytics_events_and_friend_challenge.sql'),
  read('supabase/migrations/20260927_reconcile_bounty_ranking_v3.sql'),
  read('supabase/migrations/20260928_ghost_snapshot_v2.sql'),
];

const q = async (db, sql, params = []) => (await db.query(sql, params)).rows;
async function openDb() {
  const db = await PGlite.create({ extensions: { pgcrypto } });
  for (const sql of CHAIN) await db.exec(sql);
  return db;
}

/** PostgREST-style RPC: named arguments, executed as anon. */
async function rpc(db, name, args = {}) {
  const meta = await q(db, `
    select coalesce(p.proargnames, '{}') as names,
           array(select format_type(t, null) from unnest(p.proargtypes) t) as types
    from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = $1`, [name]);
  if (meta.length === 0) return { data: null, error: { message: `Could not find the function public.${name}` } };
  const { names, types } = meta[0];
  const keys = Object.keys(args);
  const sql = keys.length === 0
    ? `select public.${name}() as r`
    : `select public.${name}(${keys.map((k) => `${k} := _.${k}`).join(', ')}) as r
       from json_to_record($1::json) as _(${keys.map((k) => `${k} ${types[names.indexOf(k)]}`).join(', ')})`;
  await db.exec('set role anon');
  try {
    const rows = await q(db, sql, keys.length ? [JSON.stringify(args)] : []);
    return { data: rows[0].r, error: null };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  } finally {
    await db.exec('reset role');
  }
}

function resolveSource(name) {
  const base = path.join(root, name.slice(2));
  for (const c of [base + '.ts', base + '.tsx', path.join(base, 'index.ts')]) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error('Cannot resolve ' + name);
}

/** One app install (its own device key and stores) talking to `db`. */
function createApp(db) {
  const net = { offline: false, calls: [] };
  const deviceKey = crypto.randomBytes(32).toString('hex');
  const storage = new Map();
  const mocks = {
    '@react-native-async-storage/async-storage': {
      __esModule: true,
      default: {
        getItem: async (k) => (storage.has(k) ? storage.get(k) : null),
        setItem: async (k, v) => { storage.set(k, v); },
        removeItem: async (k) => { storage.delete(k); },
      },
    },
    '@/lib/supabase/client': {
      isSupabaseConfigured: true,
      getSupabase: () => ({
        rpc: async (name, args) => {
          net.calls.push({ name, args });
          if (net.offline) return { data: null, error: { message: 'TypeError: Network request failed' } };
          return rpc(db, name, args);
        },
      }),
    },
    '@/lib/supabase/deviceKey': { getOrCreateDeviceKey: async () => deviceKey },
    '@/utils/dailyChallenge': {
      utcDateKey: () => new Date().toISOString().slice(0, 10),
      getLocalDaily: async () => { throw new Error('unused'); },
      submitLocalDaily: async () => { throw new Error('unused'); },
    },
    'expo-linking': {
      createURL: (p, { queryParams } = {}) =>
        `high-noon://${p}${queryParams ? '?' + new URLSearchParams(queryParams).toString() : ''}`,
      parse: (url) => {
        const u = new URL(url);
        const pathPart = u.protocol.startsWith('http') ? u.pathname : `${u.host}${u.pathname}`;
        return { path: pathPart.replace(/^\//, ''), queryParams: Object.fromEntries(u.searchParams) };
      },
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
    new Function('module', 'exports', 'require', 'console', source)(module, module.exports, load, { ...console, warn() {} });
    return module.exports;
  }
  return {
    net,
    deviceKey,
    fc: load('@/utils/friendChallenge'),
    link: load('@/utils/challengeLink'),
    routes: load('@/utils/duelRoutes'),
    api: load('@/lib/supabase/pvpApi'),
    sub: load('@/utils/rankingSubmission'),
    pvp: () => load('@/store/pvpStore').usePvpStore.getState(),
    stats: () => load('@/store/pvpStatsStore').usePvpStatsStore.getState(),
  };
}

/** A finished record-duel round as the duel screen stores it. */
const shot = (ms) => ({ playerMs: ms, opponentMs: 300, winner: 'player', playerEarly: false, playerTimeout: false, playerInvalid: false });
const early = { playerMs: null, opponentMs: 300, winner: 'opponent', playerEarly: true, playerTimeout: false, playerInvalid: false };
const timeout = { playerMs: null, opponentMs: 300, winner: 'opponent', playerEarly: false, playerTimeout: true, playerInvalid: false };
const invalid = (ms) => ({ playerMs: ms, opponentMs: 300, winner: 'opponent', playerEarly: false, playerTimeout: false, playerInvalid: true });

const settle = async () => { for (let i = 0; i < 30; i++) await new Promise((r) => setImmediate(r)); };
const profileRow = async (db, id) => (await q(db,
  'select rating, wins, losses, rank_tier from profiles where id = $1', [id]))[0];

let passed = 0;
async function test(name, fn) {
  await fn();
  passed++;
  console.log('PASS ' + name);
}

/** Creator with a real record: shots 241, 268, 255 from record duels. */
async function creatorWithChallenge(db) {
  const creator = createApp(db);
  const me = await creator.api.pvpLogin();
  creator.stats().recordRecentShots([shot(241.4), early]);
  creator.stats().recordRecentShots([shot(267.6), timeout, shot(255.2)]);
  const record = creator.fc.challengeRecordFromShots(creator.stats().recentShots);
  const created = await creator.api.pvpCreateFriendChallenge({ record, characterId: 3 });
  return { creator, me, record, created };
}

async function accept(app, code) {
  const challenge = await app.api.pvpGetFriendChallenge(code);
  app.pvp().beginFriendMatch(challenge);
  return challenge;
}

/** Play like the duel screen: record rounds, then hand the result to the submission service. */
async function playAndSubmit(app, code, playerRounds, localScore) {
  const outcome = await app.sub.startRankingSubmission(app.sub.buildFriendSubmission({
    code, playerRounds, scorePlayer: localScore[0], scoreCreator: localScore[1],
    result: localScore[0] > localScore[1] ? 'win' : localScore[0] < localScore[1] ? 'loss' : 'draw',
  }));
  await settle();
  return outcome;
}

(async () => {
  const db = await openDb();

  await test('R1 record = newest 3 real SHOT reactions; EARLY/TIMEOUT/INVALID never become numbers', async () => {
    const app = createApp(db);
    assert.equal(app.fc.challengeRecordFromShots(app.stats().recentShots), null, 'locked with 0 shots');
    app.stats().recordRecentShots([shot(300), early, timeout]);
    app.stats().recordRecentShots([invalid(60), invalid(2600), shot(79.4)]); // 79 is INVALID by contract
    assert.deepEqual(app.stats().recentShots, [300]);
    assert.equal(app.fc.challengeRecordFromShots(app.stats().recentShots), null, 'locked with 1 shot');
    app.stats().recordRecentShots([shot(2499.4), shot(80.4), shot(2499.6)]); // 2500 is out
    assert.deepEqual(app.stats().recentShots, [300, 2499, 80]);
    app.stats().recordRecentShots([shot(250.5)]);
    assert.deepEqual(app.stats().recentShots, [2499, 80, 251], 'rolling window, Math.round');
    const rec = app.fc.challengeRecordFromShots(app.stats().recentShots);
    assert.deepEqual(rec, { sampleMs: [2499, 80, 251], bestMs: 80, avgMs: 943 });
    assert.deepEqual(app.fc.appendRecentShots('garbage', [shot(200)]), [200], 'corrupt storage is ignored');
  });

  await test('1 create challenge: exact real shots stored, no padding, no synthetic value', async () => {
    const { creator, created } = await creatorWithChallenge(db);
    assert.match(created.code, /^[A-Z0-9]{6}$/);
    assert.deepEqual(created.sample_ms, [241, 268, 255]);
    assert.equal(created.creator_best_ms, 241);
    assert.equal(created.creator_avg_ms, 255);
    const call = creator.net.calls.find((c) => c.name === 'pvp_create_friend_challenge');
    assert.deepEqual(call.args.p_sample_ms, [241, 268, 255]);
    const row = (await q(db, 'select to_jsonb(sample_ms) s from friend_challenges where code = $1', [created.code]))[0];
    assert.deepEqual(row.s, [241, 268, 255], 'server row equals the real shots');
    // Anything short of three real shots is refused on the client; nothing is sent.
    const before = creator.net.calls.length;
    for (const bad of [[241, 268, null], [241, 268, 79], [241, 268, 2500], [241.5, 268, 255]]) {
      await assert.rejects(
        creator.api.pvpCreateFriendChallenge({ record: { sampleMs: bad, bestMs: 1, avgMs: 1 }, characterId: 1 }),
        /invalid_sample_ms/,
      );
    }
    assert.equal(creator.net.calls.length, before, 'no RPC for an incomplete record');
    assert.ok(!read('app/ranking/result.tsx').includes('ghostSampleFromRounds'), 'result no longer pads samples');
    assert.ok(!/p_sample_ms:\s*normalizeSamplesForServer/.test(read('lib/supabase/pvpApi.ts')), 'no fallback fill');
  });

  await test('2 normalize code: trim / uppercase / strip, same as the server', async () => {
    const app = createApp(db);
    assert.equal(app.link.normalizeChallengeCode('  7k2-m9q '), '7K2M9Q');
    assert.equal(app.link.isValidChallengeCode('7K2M9'), false);
    const { created } = await creatorWithChallenge(db);
    const messy = ` ${created.code.slice(0, 3).toLowerCase()}-${created.code.slice(3)} `;
    const got = await app.api.pvpGetFriendChallenge(messy);
    assert.equal(got.code, created.code);
  });

  await test('3 get challenge: preview data, creator flag, server expiry', async () => {
    const { creator, me, created } = await creatorWithChallenge(db);
    const friend = createApp(db);
    const seen = await friend.api.pvpGetFriendChallenge(created.code);
    assert.equal(seen.creator_name, me.display_name);
    assert.equal(seen.character_id, 3, 'Player 01-04 poster id');
    assert.equal(seen.creator_best_ms, 241);
    assert.equal(seen.creator_avg_ms, 255);
    assert.equal(seen.is_creator, false);
    assert.equal(seen.completed, false);
    const days = (Date.parse(seen.expires_at) - Date.now()) / 86400000;
    assert.ok(days > 13.9 && days <= 14, 'server sets 14 days');
    const e = friend.fc.challengeExpiry(seen.expires_at, Date.now());
    assert.equal(e.state, 'open');
    const minutesLeft = e.days * 1440 + e.hours * 60 + e.minutes;
    assert.ok(minutesLeft > 20150 && minutesLeft <= 20160, 'label rounds up to the minute: ' + minutesLeft);
    const own = await creator.api.pvpGetFriendChallenge(created.code);
    assert.equal(own.is_creator, true, 'own challenge -> clear state, no ACCEPT');
    await assert.rejects(
      creator.api.pvpSubmitFriendChallenge({ code: created.code, playerRounds: [100, 100, 100], scorePlayer: 3, scoreCreator: 0, result: 'win' }),
      (e2) => creator.fc.friendChallengeErrorKind(e2) === 'self',
    );
  });

  await test('4 invalid code -> INVALID CHALLENGE state, raw error never shown', async () => {
    const app = createApp(db);
    for (const code of ['ZZZZZZ', 'ABC']) {
      try {
        await app.api.pvpGetFriendChallenge(code);
        assert.fail('should fail');
      } catch (e) {
        assert.match(e.message, /challenge_not_found|invalid_code/);
        assert.equal(app.fc.friendChallengeErrorKind(e), 'invalid');
      }
    }
    assert.equal(app.fc.friendChallengeErrorKind(new Error('duplicate key value violates…')), 'failed');
    const screen = read('app/ranking/challenge.tsx');
    assert.ok(!screen.includes('setError(msg)') && !/\{error\}/.test(screen), 'no raw message rendering');
  });

  await test('5 expired challenge: server decides; client clock only labels', async () => {
    const { created } = await creatorWithChallenge(db);
    const friend = createApp(db);
    await q(db, `update friend_challenges set expires_at = now() - interval '1 minute' where code = $1`, [created.code]);
    await assert.rejects(friend.api.pvpGetFriendChallenge(created.code), (e) => friend.fc.friendChallengeErrorKind(e) === 'expired');
    await assert.rejects(
      friend.api.pvpSubmitFriendChallenge({ code: created.code, playerRounds: [100, 100, null], scorePlayer: 2, scoreCreator: 0, result: 'win' }),
      (e) => friend.fc.friendChallengeErrorKind(e) === 'expired',
    );
    // A device clock ahead of the server never declares "expired" on its own.
    const e = friend.fc.challengeExpiry(new Date(Date.now() + 60000).toISOString(), Date.now() + 3600000);
    assert.deepEqual(e, { state: 'closing' });
    assert.deepEqual(friend.fc.challengeExpiry('not a date', Date.now()), { state: 'unknown' });
  });

  await test('6 accept: friend mode, opponent = challenge record + Player poster id, same duel renderer', async () => {
    const { created } = await creatorWithChallenge(db);
    const friend = createApp(db);
    const c = await accept(friend, created.code);
    const s = friend.pvp();
    assert.equal(s.matchMode, 'friend');
    assert.equal(s.friendChallenge.code, created.code);
    assert.deepEqual(s.opponent.sample_ms, [241, 268, 255]);
    assert.ok(s.opponent.character_id >= 1 && s.opponent.character_id <= 4);
    assert.equal(s.opponent.ghost_rounds, undefined, 'record duel uses sample scoring, not Ghost V2');
    assert.equal(c.completed, false);
    const screen = read('app/ranking/challenge.tsx');
    assert.ok(screen.includes("router.replace('/ranking/duel' as Href)"), 'ACCEPT reuses /ranking/duel');
  });

  for (const [label, rounds, local, expected] of [
    ['7 submit win', [230.4, 250.6, null], [2, 0], { result: 'win', sp: 2, sc: 0, avg: 241, best: 230 }],
    ['8 submit loss', [2500, 300, 290], [0, 2], { result: 'loss', sp: 0, sc: 2, avg: 300, best: 300 }],
    ['9 submit draw', [241, 268, 255], [0, 0], { result: 'draw', sp: 0, sc: 0, avg: 255, best: 241 }],
  ]) {
    await test(`${label} (server recalculation, 80..2499, integers)`, async () => {
      const { created } = await creatorWithChallenge(db);
      const friend = createApp(db);
      await accept(friend, created.code);
      const outcome = await playAndSubmit(friend, created.code, rounds, local);
      assert.equal(outcome.status, 'submitted');
      const s = outcome.settlement;
      assert.equal(s.result, expected.result);
      assert.equal(s.score_player, expected.sp);
      assert.equal(s.score_creator, expected.sc);
      assert.equal(s.avg_ms, expected.avg);
      assert.equal(s.best_ms, expected.best);
      assert.equal(friend.pvp().lastFriendSubmit.result, expected.result, 'Result screen reads the settlement');
      const sent = friend.net.calls.find((c) => c.name === 'pvp_submit_friend_challenge').args.p_player_rounds;
      assert.ok(sent.every((v) => v === null || Number.isInteger(v)), 'integer payload');
    });
  }

  await test('9b client claim is ignored: server recalculates a false 3-0', async () => {
    const { created } = await creatorWithChallenge(db);
    const friend = createApp(db);
    const s = await friend.api.pvpSubmitFriendChallenge({
      code: created.code, playerRounds: [900, 900, null], scorePlayer: 3, scoreCreator: 0, result: 'win',
    });
    assert.equal(s.result, 'loss');
    assert.equal(s.score_player, 0);
  });

  await test('10 duplicate submit: already_completed, one attempt row, first result stands', async () => {
    const { created } = await creatorWithChallenge(db);
    const friend = createApp(db);
    await accept(friend, created.code);
    const first = await playAndSubmit(friend, created.code, [230, 250, null], [2, 0]);
    const again = await friend.api.pvpSubmitFriendChallenge({
      code: created.code, playerRounds: [2000, 2000, 2000], scorePlayer: 0, scoreCreator: 2, result: 'loss',
    });
    assert.equal(again.already_completed, true);
    assert.equal(again.result, first.settlement.result);
    const n = (await q(db, `select count(*)::int n from friend_challenge_attempts a
      join friend_challenges c on c.id = a.challenge_id where c.code = $1`, [created.code]))[0].n;
    assert.equal(n, 1);
    const reopened = await friend.api.pvpGetFriendChallenge(created.code);
    assert.equal(reopened.completed, true, 'preview shows DUEL SETTLED, no second ACCEPT');
    assert.equal(reopened.completion.result, 'win');
  });

  await test('11 offline: create / open fail with the offline state, submission kept for retry', async () => {
    const { created } = await creatorWithChallenge(db);
    const friend = createApp(db);
    await accept(friend, created.code);
    friend.net.offline = true;
    await assert.rejects(friend.api.pvpGetFriendChallenge(created.code), (e) => friend.fc.friendChallengeErrorKind(e) === 'offline');
    friend.stats().recordRecentShots([shot(200), shot(210), shot(220)]);
    await assert.rejects(
      friend.api.pvpCreateFriendChallenge({ record: friend.fc.challengeRecordFromShots(friend.stats().recentShots), characterId: 1 }),
      (e) => friend.fc.friendChallengeErrorKind(e) === 'offline',
    );
    const outcome = await playAndSubmit(friend, created.code, [230, 250, null], [2, 0]);
    assert.notEqual(outcome.status, 'submitted');
    assert.equal(friend.pvp().submissionStatus, 'pending_retry');
    friend.net.offline = false;
    const retried = await friend.sub.retryPendingSubmission(friend.pvp().submissionId);
    assert.equal(retried.status, 'submitted');
    assert.equal(retried.settlement.result, 'win');
  });

  await test('12 deep link: app link, web landing link and path form all yield the code', async () => {
    const app = createApp(db);
    const deep = app.link.buildChallengeDeepLink('7k2m9q');
    assert.equal(deep, 'high-noon://ranking/challenge?code=7K2M9Q');
    assert.equal(app.link.challengeCodeFromUrl(deep), '7K2M9Q');
    assert.equal(app.link.challengeCodeFromUrl(app.link.buildChallengeWebLink('7K2M9Q')), '7K2M9Q');
    assert.equal(app.link.challengeCodeFromUrl('high-noon://challenge/7k2m9q'), '7K2M9Q');
    assert.equal(app.link.challengeCodeFromUrl('high-noon://menu'), null);
    assert.equal(app.link.challengeLinkAction('/menu'), 'push');
    assert.equal(app.link.challengeLinkAction('/ranking/challenge'), 'update', 'no second challenge screen');
    const layout = read('app/_layout.tsx');
    assert.ok(layout.includes('router.setParams({ code })'));
  });

  await test('13 deep link during Duel / Result: held, delivered after leaving', async () => {
    const app = createApp(db);
    for (const p of ['/ranking/duel', '/ranking/result', '/game', '/result']) assert.equal(app.routes.isDuelFlowRoute(p), true, p);
    for (const p of ['/ranking', '/ranking/challenge', '/menu']) assert.equal(app.routes.isDuelFlowRoute(p), false, p);
    const layout = read('app/_layout.tsx');
    assert.match(layout, /if \(isDuelFlowRoute\(pathnameRef\.current\)\) \{\s*pendingChallengeCodeRef\.current = code;\s*return;/);
    assert.match(layout, /if \(!code \|\| isDuelFlowRoute\(pathname\)\) return;/);
  });

  await test('14 share: short invitation (title, alias, code, links)', async () => {
    const app = createApp(db);
    const msg = app.fc.buildFriendChallengeShareMessage({
      code: '7K2M9Q',
      inviteLine: 'Dust Fox calls you out at high noon.',
      webLink: app.link.buildChallengeWebLink('7K2M9Q'),
      deepLink: app.link.buildChallengeDeepLink('7K2M9Q'),
    });
    const lines = msg.split('\n');
    assert.equal(lines[0], 'HIGH NOON');
    assert.equal(lines.length, 5);
    assert.ok(lines[1].includes('Dust Fox'));
    assert.ok(lines.includes('CODE 7K2M9Q'));
    assert.ok(lines.some((l) => l.startsWith('https://')) && lines.some((l) => l.startsWith('high-noon://')));
    assert.ok(msg.length < 200, 'no excessive text');
    const screen = read('app/ranking/challenge.tsx');
    assert.ok(screen.includes('Share.share({ message })') && screen.includes('buildFriendChallengeShareMessage'));
  });

  await test('15 unranked: rating, W-L, tier and ranked history unchanged by friend duels', async () => {
    const { created, me: creatorProfile } = await creatorWithChallenge(db);
    const friend = createApp(db);
    const me = await friend.api.pvpLogin();
    const beforeMe = await profileRow(db, me.id);
    const beforeCreator = await profileRow(db, creatorProfile.id);
    const matchesBefore = (await q(db, 'select count(*)::int n from pvp_matches'))[0].n;
    await accept(friend, created.code);
    await playAndSubmit(friend, created.code, [230, 250, null], [2, 0]);
    assert.deepEqual(await profileRow(db, me.id), beforeMe);
    assert.deepEqual(await profileRow(db, creatorProfile.id), beforeCreator);
    assert.equal((await q(db, 'select count(*)::int n from pvp_matches'))[0].n, matchesBefore);
    assert.equal(friend.pvp().lastSubmit, null, 'no ranked settlement -> no rating card');
    const history = await friend.api.pvpHistory(10);
    assert.equal(history.length, 0);
    const result = read('app/ranking/result.tsx');
    assert.match(result, /\{!isFriend && lastSubmit \? \(\s*<RankingRewardCard/);
  });

  await test('16 Bounty Board return: existing board in the stack, no remount / reload', async () => {
    const result = read('app/ranking/result.tsx');
    const screen = read('app/ranking/challenge.tsx');
    assert.ok(result.includes("router.dismissTo('/ranking' as Href)"));
    assert.ok(screen.includes("router.dismissTo('/ranking' as Href)"));
    assert.ok(!/REMATCH|rematch/.test(result), 'no REMATCH: one duel per challenge (server unique attempt)');
  });

  await db.close();
  console.log(`\nFRIEND_CHALLENGE_V3 ${passed}/${passed} PASS`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
